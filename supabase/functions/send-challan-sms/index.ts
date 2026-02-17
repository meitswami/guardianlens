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
    const { challan_id } = body;

    // --- Input validation ---
    if (!challan_id || typeof challan_id !== "string" || challan_id.length > 50) {
      return new Response(JSON.stringify({ error: "Valid challan_id is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: challan, error } = await supabase
      .from("challans")
      .select("*")
      .eq("id", challan_id)
      .single();

    if (error || !challan) {
      return new Response(JSON.stringify({ error: "Challan not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
    const MSG91_SENDER_ID = Deno.env.get("MSG91_SENDER_ID");
    const MSG91_TEMPLATE_ID = Deno.env.get("MSG91_TEMPLATE_ID");

    const publicUrl = `${supabaseUrl}/functions/v1/public-challan?token=${challan.public_token}`;

    if (!MSG91_AUTH_KEY || !MSG91_SENDER_ID || !MSG91_TEMPLATE_ID) {
      // Still mark as sent (demo mode)
      await supabase.from("challans").update({
        sms_sent: true,
        sms_sent_at: new Date().toISOString(),
      }).eq("id", challan_id);

      return new Response(JSON.stringify({
        success: true,
        mock: true,
        message: "SMS service not configured. Challan updated successfully.",
        public_url: publicUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = challan.owner_phone?.replace(/[^0-9]/g, "");
    if (!phone) {
      return new Response(JSON.stringify({ error: "No phone number available for this vehicle owner" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Send via MSG91
    const smsResponse = await fetch("https://control.msg91.com/api/v5/flow/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        authkey: MSG91_AUTH_KEY,
      },
      body: JSON.stringify({
        template_id: MSG91_TEMPLATE_ID,
        sender: MSG91_SENDER_ID,
        short_url: "0",
        mobiles: `91${phone}`,
        challan_number: challan.challan_number,
        violation: challan.violation_label,
        fine_amount: String(challan.fine_amount),
        payment_link: publicUrl,
      }),
    });

    const smsResult = await smsResponse.json();

    if (!smsResponse.ok) {
      console.error("SMS send failed:", smsResponse.status);
      return new Response(JSON.stringify({ error: "Failed to send SMS. Please try again." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("challans").update({
      sms_sent: true,
      sms_sent_at: new Date().toISOString(),
    }).eq("id", challan_id);

    return new Response(JSON.stringify({
      success: true,
      mock: false,
      public_url: publicUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("send-challan-sms error:", e);
    return new Response(JSON.stringify({ error: "Failed to send SMS. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
