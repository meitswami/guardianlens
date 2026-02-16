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
    const body = await req.json();
    const { action } = body; // "create_order" or "verify_payment"

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (action === "create_order") {
      const { challan_id, public_token, payer_name, payer_email, payer_phone } = body;

      // Fetch challan
      let challan;
      if (public_token) {
        const { data } = await supabase.from("challans").select("*").eq("public_token", public_token).single();
        challan = data;
      } else if (challan_id) {
        const { data } = await supabase.from("challans").select("*").eq("id", challan_id).single();
        challan = data;
      }
      if (!challan) throw new Error("Challan not found");
      if (challan.payment_status === "paid") throw new Error("This challan has already been paid");

      const amountInPaise = Math.round(challan.fine_amount * 100);

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        // Mock order for demo
        const mockOrderId = "order_demo_" + Date.now();
        await supabase.from("challan_payments").insert({
          challan_id: challan.id,
          amount: challan.fine_amount,
          status: "created",
          gateway_order_id: mockOrderId,
          payer_name, payer_email, payer_phone,
          payment_gateway: "razorpay",
        });

        return new Response(JSON.stringify({
          success: true,
          mock: true,
          order_id: mockOrderId,
          amount: amountInPaise,
          currency: "INR",
          challan_number: challan.challan_number,
          message: "Razorpay not configured. Demo order created.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create Razorpay order
      const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
      const orderResp = await fetch("https://api.razorpay.com/v1/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
          amount: amountInPaise,
          currency: "INR",
          receipt: challan.challan_number,
          notes: {
            challan_id: challan.id,
            plate_number: challan.plate_number,
            violation: challan.violation_label,
          },
        }),
      });

      if (!orderResp.ok) {
        const errText = await orderResp.text();
        throw new Error(`Razorpay order creation failed: ${errText}`);
      }

      const order = await orderResp.json();

      await supabase.from("challan_payments").insert({
        challan_id: challan.id,
        amount: challan.fine_amount,
        status: "created",
        gateway_order_id: order.id,
        payer_name, payer_email, payer_phone,
        payment_gateway: "razorpay",
      });

      return new Response(JSON.stringify({
        success: true,
        mock: false,
        order_id: order.id,
        amount: amountInPaise,
        currency: "INR",
        key_id: RAZORPAY_KEY_ID,
        challan_number: challan.challan_number,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "verify_payment") {
      const { order_id, payment_id, signature } = body;

      // Update payment record
      const { data: payment } = await supabase
        .from("challan_payments")
        .select("*, challans(*)")
        .eq("gateway_order_id", order_id)
        .single();

      if (!payment) throw new Error("Payment record not found");

      await supabase.from("challan_payments").update({
        status: "paid",
        gateway_payment_id: payment_id,
        gateway_signature: signature,
        payment_method: "razorpay",
      }).eq("id", payment.id);

      // Update challan
      await supabase.from("challans").update({
        payment_status: "paid",
        payment_id,
        payment_method: "razorpay",
        payment_amount: payment.amount,
        payment_date: new Date().toISOString(),
        status: "closed",
        resolved_at: new Date().toISOString(),
      }).eq("id", payment.challan_id);

      return new Response(JSON.stringify({ success: true, message: "Payment verified and challan updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    throw new Error("Invalid action. Use 'create_order' or 'verify_payment'");
  } catch (e) {
    console.error("razorpay-payment error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
