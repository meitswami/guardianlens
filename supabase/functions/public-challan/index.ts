import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return "";
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch { return "—"; }
}

function formatAmount(amount: number): string {
  return amount.toLocaleString("en-IN");
}

function renderHtml(challan: any): string {
  const isPaid = challan.payment_status === "paid";
  const statusBadge = isPaid
    ? `<span style="background:#d1fae5;color:#047857;border:1px solid #6ee7b7;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:1px;">✓ PAID</span>`
    : `<span style="background:#fee2e2;color:#b91c1c;border:1px solid #fca5a5;padding:4px 12px;border-radius:4px;font-size:12px;font-weight:700;letter-spacing:1px;">UNPAID</span>`;

  const severityColor = challan.severity === "high" ? "#dc2626" : challan.severity === "medium" ? "#d97706" : "#64748b";

  const vehicle = [challan.vehicle_make, challan.vehicle_model].filter((v: string) => v && v !== "N/A").join(" ") || "—";

  const evidenceSection = challan.image_url ? `
    <div style="padding:12px 24px;border-bottom:1px solid #e2e8f0;">
      <div style="font-size:10px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:8px;">Evidence Photo</div>
      <img src="${escapeHtml(challan.image_url)}" alt="Evidence" style="width:100%;height:140px;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;" />
    </div>` : "";

  const paymentSection = isPaid ? `
    <div style="padding:20px 24px;text-align:center;">
      <div style="color:#047857;font-weight:700;font-size:14px;">✓ Payment Received</div>
      <div style="font-size:10px;color:#94a3b8;margin-top:4px;">No further action required</div>
    </div>` : `
    <div style="padding:20px 24px;text-align:center;">
      <div style="background:#dc2626;color:#fff;padding:12px 20px;border-radius:6px;font-weight:700;font-size:14px;letter-spacing:0.5px;">
        ₹${formatAmount(challan.fine_amount)} — Payment Due
      </div>
      <div style="font-size:10px;color:#94a3b8;margin-top:6px;">Contact your nearest RTO office or pay via authorized channels</div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>eChallan - ${escapeHtml(challan.challan_number)}</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#f1f5f9; font-family:'Segoe UI',system-ui,-apple-system,sans-serif; min-height:100vh; padding:24px 16px; }
    .slip { max-width:480px; margin:0 auto; background:#fff; box-shadow:0 4px 24px rgba(0,0,0,0.12); border-radius:0; overflow:hidden; }
    .header { background:#1e40af; color:#fff; padding:20px 24px; text-align:center; }
    .header h1 { font-size:20px; font-weight:700; letter-spacing:2px; margin-bottom:4px; }
    .header p { font-size:11px; letter-spacing:2px; text-transform:uppercase; opacity:0.7; }
    .header .dept { font-size:10px; opacity:0.5; margin-top:2px; }
    .challan-bar { display:flex; align-items:center; justify-content:space-between; padding:12px 24px; background:#f8fafc; border-bottom:2px dashed #e2e8f0; }
    .challan-bar .label { font-size:10px; color:#94a3b8; text-transform:uppercase; letter-spacing:1.5px; }
    .challan-bar .number { font-size:14px; font-weight:700; color:#1e293b; margin-top:2px; }
    .violation { padding:16px 24px; background:#fef2f2; border-bottom:1px solid #e2e8f0; }
    .violation .tag { font-size:10px; color:#dc2626; text-transform:uppercase; letter-spacing:1.5px; font-weight:600; }
    .violation .name { font-size:15px; font-weight:700; color:#991b1b; margin-top:4px; }
    .violation .desc { font-size:11px; color:#b91c1c; opacity:0.7; margin-top:4px; }
    .details { padding:16px 24px; border-bottom:1px solid #e2e8f0; }
    .row { display:flex; justify-content:space-between; align-items:baseline; padding:4px 0; }
    .row .rlabel { font-size:11px; color:#94a3b8; }
    .row .rvalue { font-size:12px; color:#1e293b; font-weight:500; text-align:right; }
    .row .rvalue.bold { font-weight:700; font-size:13px; }
    .divider { border-top:1px dotted #e2e8f0; margin:6px 0; }
    .fine { padding:16px 24px; border-bottom:2px dashed #e2e8f0; }
    .fine-row { display:flex; justify-content:space-between; align-items:center; }
    .fine-label { font-size:12px; color:#64748b; text-transform:uppercase; letter-spacing:1px; }
    .fine-amount { font-size:28px; font-weight:900; color:#0f172a; }
    .severity-row { display:flex; justify-content:space-between; margin-top:4px; }
    .severity-row span { font-size:10px; }
    .footer { background:#f8fafc; padding:16px 24px; text-align:center; border-top:1px solid #e2e8f0; }
    .footer p { font-size:10px; color:#94a3b8; line-height:1.6; }
    .barcode { display:flex; justify-content:center; gap:2px; margin-top:12px; }
    .barcode div { background:#1e293b; height:20px; }
    .barcode-text { font-size:9px; color:#cbd5e1; margin-top:4px; font-family:monospace; }
    @media print { body { background:#fff; padding:0; } .slip { box-shadow:none; } }
    @media (max-width:500px) { body { padding:12px 8px; } .header h1 { font-size:17px; } .fine-amount { font-size:24px; } }
  </style>
</head>
<body>
  <div class="slip">
    <div class="header">
      <h1>⛨ eCHALLAN</h1>
      <p>Government of ${escapeHtml(challan.state)}</p>
      <div class="dept">Traffic Enforcement Department</div>
    </div>

    <div class="challan-bar">
      <div>
        <div class="label">Challan No.</div>
        <div class="number">${escapeHtml(challan.challan_number)}</div>
      </div>
      ${statusBadge}
    </div>

    <div class="violation">
      <div class="tag">⚠ Violation</div>
      <div class="name">${escapeHtml(challan.violation_label)}</div>
      ${challan.description ? `<div class="desc">${escapeHtml(challan.description)}</div>` : ""}
    </div>

    <div class="details">
      <div class="row"><span class="rlabel">Date of Issue</span><span class="rvalue">${formatDate(challan.issued_at)}</span></div>
      <div class="row"><span class="rlabel">Due Date</span><span class="rvalue">${formatDate(challan.due_date)}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="rlabel">Vehicle No.</span><span class="rvalue bold">${escapeHtml(challan.plate_number)}</span></div>
      <div class="row"><span class="rlabel">Vehicle</span><span class="rvalue">${escapeHtml(vehicle)}</span></div>
      <div class="row"><span class="rlabel">Color</span><span class="rvalue">${escapeHtml(challan.vehicle_color) || "—"}</span></div>
      <div class="row"><span class="rlabel">Type</span><span class="rvalue">${escapeHtml(challan.vehicle_type) || "—"}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="rlabel">Owner</span><span class="rvalue">${escapeHtml(challan.owner_name) || "—"}</span></div>
      <div class="row"><span class="rlabel">RTO Office</span><span class="rvalue">${escapeHtml(challan.rto_office) || "—"}</span></div>
      <div class="row"><span class="rlabel">State</span><span class="rvalue">${escapeHtml(challan.state)}</span></div>
    </div>

    ${evidenceSection}

    <div class="fine">
      <div class="fine-row">
        <span class="fine-label">Fine Amount</span>
        <span class="fine-amount">₹${formatAmount(challan.fine_amount)}</span>
      </div>
      <div class="severity-row">
        <span style="color:#94a3b8;">Severity</span>
        <span style="color:${severityColor};font-weight:600;text-transform:uppercase;">${escapeHtml(challan.severity) || "—"}</span>
      </div>
    </div>

    ${paymentSection}

    <div class="footer">
      <p>This is a computer-generated eChallan.<br>Pay within the due date to avoid additional penalties.</p>
      <div class="barcode">
        ${Array.from({ length: 40 }).map((_, i) => `<div style="width:${[2, 1, 2, 1, 1, 2, 1, 2][i % 8]}px;"></div>`).join("")}
      </div>
      <div class="barcode-text">${escapeHtml(challan.challan_number)}</div>
    </div>
  </div>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const format = url.searchParams.get("format"); // ?format=json for API usage
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
      if (format === "json") {
        return new Response(JSON.stringify({ error: "Challan not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(`<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Not Found</title><style>body{font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#f1f5f9;margin:0;}.card{background:#fff;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);text-align:center;max-width:360px;}h2{color:#1e293b;margin-bottom:8px;}p{color:#64748b;font-size:14px;}</style></head><body><div class="card"><h2>⚠ Challan Not Found</h2><p>The challan link is invalid or has expired.</p></div></body></html>`, {
        status: 404, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
      });
    }

    // Return JSON if explicitly requested (for the React app)
    if (format === "json") {
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
    }

    // Default: return styled HTML receipt
    return new Response(renderHtml(challan), {
      headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (e) {
    console.error("public-challan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
