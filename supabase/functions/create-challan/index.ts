import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_VIOLATION_TYPES = [
  "helmet", "seatbelt", "triple_riding", "mobile_phone",
  "wrong_way", "red_light", "illegal_parking", "overloading", "other",
];

function generateChallanNumber(state: string): string {
  const prefix = state === "Rajasthan" ? "RJ" : state === "Telangana" ? "TS" : "IN";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ECH-${prefix}-${timestamp}-${random}`;
}

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

    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // --- Role check ---
    const { data: roleData } = await supabase
      .from("user_roles").select("role").eq("user_id", userId).single();
    if (!roleData || !["admin", "operator"].includes(roleData.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const {
      plate_number, violation_type, violation_label, state,
      image_url, video_url, evidence_urls,
      vehicle_data, ai_detection_data, severity,
      vehicle_id, violation_id, custom_fine_amount,
    } = body;

    // --- Input validation ---
    if (!plate_number || typeof plate_number !== "string" || plate_number.length > 20) {
      return new Response(JSON.stringify({ error: "Valid plate_number is required (max 20 chars)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!violation_type || !VALID_VIOLATION_TYPES.includes(violation_type)) {
      return new Response(JSON.stringify({ error: "Valid violation_type is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!state || typeof state !== "string" || state.length > 50) {
      return new Response(JSON.stringify({ error: "Valid state is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (custom_fine_amount !== undefined && (typeof custom_fine_amount !== "number" || custom_fine_amount < 0 || custom_fine_amount > 100000)) {
      return new Response(JSON.stringify({ error: "custom_fine_amount must be 0-100000" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look up fine amount from fines_master
    const { data: fineData } = await supabase
      .from("fines_master")
      .select("*")
      .eq("violation_type", violation_type)
      .eq("state", state)
      .single();

    const fineAmount = custom_fine_amount || fineData?.fine_amount || 500;
    const challanNumber = generateChallanNumber(state);

    const { data: challan, error } = await supabase.from("challans").insert({
      challan_number: challanNumber,
      plate_number: plate_number.substring(0, 20),
      violation_type,
      violation_label: (violation_label || fineData?.violation_label || violation_type).substring(0, 200),
      state: state.substring(0, 50),
      fine_amount: fineAmount,
      severity: severity || "medium",
      image_url,
      video_url,
      evidence_urls,
      vehicle_id: vehicle_id || null,
      violation_id: violation_id || null,
      issued_by: userId,
      ai_detection_data,
      vehicle_type: vehicle_data?.vehicle_type || null,
      vehicle_make: vehicle_data?.vehicle_make || null,
      vehicle_model: vehicle_data?.vehicle_model || null,
      vehicle_color: vehicle_data?.vehicle_color || null,
      owner_name: vehicle_data?.owner_name || null,
      owner_phone: vehicle_data?.owner_phone || null,
      owner_address: vehicle_data?.owner_address || null,
      rto_office: vehicle_data?.rto_office || null,
      vehicle_lookup_data: vehicle_data || null,
      description: fineData?.description || `Violation: ${(violation_label || violation_type).substring(0, 200)}`,
    }).select().single();

    if (error) {
      console.error("create-challan DB error:", error);
      return new Response(JSON.stringify({ error: "Failed to create challan. Please try again." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const publicUrl = `${supabaseUrl}/functions/v1/public-challan?token=${challan.public_token}`;

    return new Response(JSON.stringify({
      success: true,
      challan,
      public_url: publicUrl,
      fine_amount: fineAmount,
      challan_number: challanNumber,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("create-challan error:", e);
    return new Response(JSON.stringify({ error: "Failed to create challan. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
