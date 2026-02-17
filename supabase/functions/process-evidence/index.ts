import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth check ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authSupabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await authSupabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // --- Service client for DB operations ---
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Role check: admin or operator only ---
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).single();
    if (!roleData || !["admin", "operator"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { image_url, video_url, queue_id } = body;

    // --- Input validation ---
    const mediaUrl = image_url || video_url;
    if (!mediaUrl || typeof mediaUrl !== "string" || mediaUrl.length > 2048) {
      return new Response(JSON.stringify({ error: "Valid image_url or video_url is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try { new URL(mediaUrl); } catch {
      return new Response(JSON.stringify({ error: "Invalid URL format" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (queue_id && (typeof queue_id !== "string" || queue_id.length > 50)) {
      return new Response(JSON.stringify({ error: "Invalid queue_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "AI processing is not configured" }), {
        status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update queue status
    if (queue_id) {
      await supabase.from("processing_queue").update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
      }).eq("id", queue_id);
    }

    // Download image from private storage and convert to base64
    let imageDataUrl: string;
    try {
      // Extract bucket and path from the URL
      const urlObj = new URL(mediaUrl);
      const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(?:public\/|authenticated\/)?(.+)/);
      if (!pathMatch) throw new Error("Could not parse storage path from URL");
      const storagePath = pathMatch[1]; // e.g. "evidence/uploads/filename.jpeg"
      const bucketName = storagePath.split("/")[0];
      const filePath = storagePath.split("/").slice(1).join("/");
      
      console.log(`Downloading from bucket: ${bucketName}, path: ${filePath}`);
      
      // Use Supabase JS client download (handles auth automatically with service role)
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(bucketName)
        .download(filePath);
      
      if (downloadError || !fileData) {
        throw new Error(`Storage download failed: ${downloadError?.message || "No data returned"}`);
      }
      
      const imgBuffer = await fileData.arrayBuffer();
      const contentType = fileData.type || "image/jpeg";
      // Use chunked approach to avoid call stack overflow with large images
      const bytes = new Uint8Array(imgBuffer);
      let binary = "";
      const chunkSize = 8192;
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode(...chunk);
      }
      const base64 = btoa(binary);
      imageDataUrl = `data:${contentType};base64,${base64}`;
      console.log(`Image downloaded: ${bytes.length} bytes, base64 length: ${base64.length}`);
    } catch (fetchErr) {
      console.error("Image fetch error:", fetchErr);
      return new Response(JSON.stringify({ error: "Could not access the uploaded image." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Lovable AI for vehicle detection and plate OCR
    const prompt = `Analyze this traffic surveillance image/frame. Extract the following information in JSON format:
{
  "vehicles_detected": [
    {
      "vehicle_type": "car|two_wheeler|commercial|other",
      "plate_number": "detected plate number or null",
      "plate_confidence": 0.0-1.0,
      "vehicle_color": "color",
      "vehicle_make": "manufacturer if identifiable",
      "vehicle_model": "model if identifiable",
      "violations": ["helmet", "helmet_pillion", "seatbelt", "triple_riding", "mobile_phone", "wrong_way", "red_light", "illegal_parking", "overloading", "other"],
      "violation_descriptions": ["description of each violation"]
    }
  ],
  "scene_description": "brief description of the scene",
  "total_vehicles": number
}

Rules:
- For Indian license plates, format as: XX-00-XX-0000
- Detect traffic violations visible in the image
- Be specific about violation types matching the enum values exactly
- If no plate is readable, set plate_number to null
- If no violations detected, return empty violations array
- CRITICAL for two-wheelers: Count the EXACT number of people on the vehicle carefully.
  - "triple_riding" = ONLY when there are 3 or more persons on a single two-wheeler
  - If there are exactly 2 persons (rider + pillion), do NOT use "triple_riding"
  - For helmet violations with 2 persons: use "helmet" if only rider has no helmet, use "helmet_pillion" if both rider AND pillion have no helmet
  - You can combine "helmet" and "helmet_pillion" if needed
- Do NOT confuse 2-person riding (legal) with triple riding (3+ persons)`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      
      if (aiResponse.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "AI processing failed. Please try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    let detectionResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      detectionResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { vehicles_detected: [], error: "Could not parse response" };
    } catch {
      detectionResult = { vehicles_detected: [], raw_response: content };
    }

    if (queue_id) {
      await supabase.from("processing_queue").update({
        status: "completed",
        completed_at: new Date().toISOString(),
        result: detectionResult,
      }).eq("id", queue_id);
    }

    return new Response(JSON.stringify({ success: true, result: detectionResult }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("process-evidence error:", e);
    return new Response(JSON.stringify({ error: "Processing failed. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
