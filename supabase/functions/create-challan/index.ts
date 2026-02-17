import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateChallanNumber(state: string): string {
  const prefix = state === "Rajasthan" ? "RJ" : state === "Telangana" ? "TS" : "IN";
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ECH-${prefix}-${timestamp}-${random}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const {
      plate_number, violation_type, violation_label, state,
      image_url, video_url, evidence_urls,
      vehicle_data, ai_detection_data, severity,
      vehicle_id, violation_id, issued_by, custom_fine_amount,
    } = body;

    if (!plate_number || !violation_type || !state) {
      throw new Error("plate_number, violation_type, and state are required");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Look up fine amount from fines_master
    const { data: fineData } = await supabase
      .from("fines_master")
      .select("*")
      .eq("violation_type", violation_type)
      .eq("state", state)
      .single();

    const fineAmount = custom_fine_amount || fineData?.fine_amount || 500;
    const challanNumber = generateChallanNumber(state);

    // Create challan
    const { data: challan, error } = await supabase.from("challans").insert({
      challan_number: challanNumber,
      plate_number,
      violation_type,
      violation_label: violation_label || fineData?.violation_label || violation_type,
      state,
      fine_amount: fineAmount,
      severity: severity || "medium",
      image_url,
      video_url,
      evidence_urls,
      vehicle_id: vehicle_id || null,
      violation_id: violation_id || null,
      issued_by: issued_by || null,
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
      description: fineData?.description || `Violation: ${violation_label || violation_type}`,
    }).select().single();

    if (error) throw error;

    // Build public URL
    const publicUrl = `${supabaseUrl.replace('.supabase.co', '.supabase.co')}/functions/v1/public-challan?token=${challan.public_token}`;

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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
