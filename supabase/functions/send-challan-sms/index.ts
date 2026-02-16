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
    const { challan_id } = await req.json();
    if (!challan_id) throw new Error("challan_id is required");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: challan, error } = await supabase
      .from("challans")
      .select("*")
      .eq("id", challan_id)
      .single();

    if (error || !challan) throw new Error("Challan not found");

    const MSG91_AUTH_KEY = Deno.env.get("MSG91_AUTH_KEY");
    const MSG91_SENDER_ID = Deno.env.get("MSG91_SENDER_ID");
    const MSG91_TEMPLATE_ID = Deno.env.get("MSG91_TEMPLATE_ID");

    const publicUrl = `${supabaseUrl}/functions/v1/public-challan?token=${challan.public_token}`;

    if (!MSG91_AUTH_KEY || !MSG91_SENDER_ID || !MSG91_TEMPLATE_ID) {
      console.log("MSG91 not configured. SMS would be sent to:", challan.owner_phone);
      console.log("Message: eChallan", challan.challan_number, "for", challan.violation_label, "- Fine ₹" + challan.fine_amount, "- Pay at:", publicUrl);

      // Still mark as sent (demo mode)
      await supabase.from("challans").update({
        sms_sent: true,
        sms_sent_at: new Date().toISOString(),
      }).eq("id", challan_id);

      return new Response(JSON.stringify({
        success: true,
        mock: true,
        message: "SMS not sent (MSG91 not configured). Challan created successfully.",
        public_url: publicUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const phone = challan.owner_phone?.replace(/[^0-9]/g, "");
    if (!phone) throw new Error("No phone number available for this vehicle owner");

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
      console.error("MSG91 error:", smsResult);
      throw new Error(`SMS failed: ${JSON.stringify(smsResult)}`);
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
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
