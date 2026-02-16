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
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) throw new Error("Token is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: challan, error } = await supabase
      .from("challans")
      .select("*")
      .eq("public_token", token)
      .single();

    if (error || !challan) {
      return new Response(JSON.stringify({ error: "Challan not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Return challan details (public-safe fields)
    return new Response(JSON.stringify({
      challan_number: challan.challan_number,
      plate_number: challan.plate_number,
      violation_type: challan.violation_type,
      violation_label: challan.violation_label,
      fine_amount: challan.fine_amount,
      severity: challan.severity,
      status: challan.status,
      payment_status: challan.payment_status,
      issued_at: challan.issued_at,
      due_date: challan.due_date,
      description: challan.description,
      image_url: challan.image_url,
      video_url: challan.video_url,
      vehicle_type: challan.vehicle_type,
      vehicle_make: challan.vehicle_make,
      vehicle_model: challan.vehicle_model,
      vehicle_color: challan.vehicle_color,
      owner_name: challan.owner_name,
      state: challan.state,
      rto_office: challan.rto_office,
      public_token: challan.public_token,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("public-challan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
