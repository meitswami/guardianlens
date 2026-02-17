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
    const { image_url, video_url, queue_id } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update queue status
    if (queue_id) {
      await supabase.from("processing_queue").update({
        status: "processing",
        processing_started_at: new Date().toISOString(),
      }).eq("id", queue_id);
    }

    const mediaUrl = image_url || video_url;
    if (!mediaUrl) throw new Error("No image_url or video_url provided");

    // Use Lovable AI (Gemini Vision) for vehicle detection and plate OCR
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
              { type: "image_url", image_url: { url: mediaUrl } },
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
      throw new Error(`AI error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content || "";
    
    // Parse JSON from AI response
    let detectionResult;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      detectionResult = jsonMatch ? JSON.parse(jsonMatch[0]) : { vehicles_detected: [], error: "Could not parse response" };
    } catch {
      detectionResult = { vehicles_detected: [], raw_response: content };
    }

    // Update queue with result
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
