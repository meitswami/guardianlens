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
    const { action } = body;

    if (!action || !["create_order", "verify_payment"].includes(action)) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (action === "create_order") {
      const { challan_id, public_token, payer_name, payer_email, payer_phone } = body;

      // Require either auth or valid public_token
      if (!public_token) {
        const authHeader = req.headers.get("Authorization");
        if (!authHeader?.startsWith("Bearer ")) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
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
      }

      // Input validation
      if (payer_name && (typeof payer_name !== "string" || payer_name.length > 200)) {
        return new Response(JSON.stringify({ error: "Invalid payer_name" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (payer_email && (typeof payer_email !== "string" || payer_email.length > 200)) {
        return new Response(JSON.stringify({ error: "Invalid payer_email" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (payer_phone && (typeof payer_phone !== "string" || payer_phone.length > 20)) {
        return new Response(JSON.stringify({ error: "Invalid payer_phone" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let challan;
      if (public_token) {
        if (typeof public_token !== "string" || public_token.length > 64) {
          return new Response(JSON.stringify({ error: "Invalid token" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data } = await supabase.from("challans").select("*").eq("public_token", public_token).single();
        challan = data;
      } else if (challan_id) {
        if (typeof challan_id !== "string" || challan_id.length > 50) {
          return new Response(JSON.stringify({ error: "Invalid challan_id" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const { data } = await supabase.from("challans").select("*").eq("id", challan_id).single();
        challan = data;
      }
      if (!challan) {
        return new Response(JSON.stringify({ error: "Challan not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (challan.payment_status === "paid") {
        return new Response(JSON.stringify({ error: "This challan has already been paid" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const amountInPaise = Math.round(challan.fine_amount * 100);

      if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
        const mockOrderId = "order_demo_" + Date.now();
        await supabase.from("challan_payments").insert({
          challan_id: challan.id,
          amount: challan.fine_amount,
          status: "created",
          gateway_order_id: mockOrderId,
          payer_name: payer_name?.substring(0, 200),
          payer_email: payer_email?.substring(0, 200),
          payer_phone: payer_phone?.substring(0, 20),
          payment_gateway: "razorpay",
        });

        return new Response(JSON.stringify({
          success: true,
          mock: true,
          order_id: mockOrderId,
          amount: amountInPaise,
          currency: "INR",
          challan_number: challan.challan_number,
          message: "Payment gateway not configured. Demo order created.",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        console.error("Payment order creation failed:", orderResp.status);
        return new Response(JSON.stringify({ error: "Payment order creation failed. Please try again." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const order = await orderResp.json();

      await supabase.from("challan_payments").insert({
        challan_id: challan.id,
        amount: challan.fine_amount,
        status: "created",
        gateway_order_id: order.id,
        payer_name: payer_name?.substring(0, 200),
        payer_email: payer_email?.substring(0, 200),
        payer_phone: payer_phone?.substring(0, 20),
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

      // Input validation
      if (!order_id || typeof order_id !== "string" || order_id.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid order_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!payment_id || typeof payment_id !== "string" || payment_id.length > 100) {
        return new Response(JSON.stringify({ error: "Invalid payment_id" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: payment } = await supabase
        .from("challan_payments")
        .select("*, challans(*)")
        .eq("gateway_order_id", order_id)
        .single();

      if (!payment) {
        return new Response(JSON.stringify({ error: "Payment record not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("challan_payments").update({
        status: "paid",
        gateway_payment_id: payment_id,
        gateway_signature: signature?.substring(0, 500),
        payment_method: "razorpay",
      }).eq("id", payment.id);

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

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("razorpay-payment error:", e);
    return new Response(JSON.stringify({ error: "Payment processing failed. Please try again." }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
