import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Loader2, Shield, Printer, Download } from "lucide-react";

interface ChallanData {
  challan_number: string;
  plate_number: string;
  violation_type: string;
  violation_label: string;
  fine_amount: number;
  severity: string;
  status: string;
  payment_status: string;
  issued_at: string;
  due_date: string;
  description: string;
  image_url: string | null;
  video_url: string | null;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  owner_name: string;
  state: string;
  rto_office: string;
  public_token: string;
}

export default function PublicChallan() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [challan, setChallan] = useState<ChallanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const slipRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!token) { setError("Invalid challan link"); setLoading(false); return; }
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-challan?token=${token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setChallan(data);
      })
      .catch(() => setError("Failed to load challan"))
      .finally(() => setLoading(false));
  }, [token]);

  const handlePayment = async () => {
    if (!challan) return;
    setPaying(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          public_token: token,
          payer_name: challan.owner_name || "Vehicle Owner",
          payer_email: "",
          payer_phone: "",
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      if (data.mock) {
        toast({ title: "Demo Mode", description: "Payment gateway not configured. In production, Razorpay checkout would open." });
        setPaying(false);
        return;
      }

      const options = {
        key: data.key_id,
        amount: data.amount,
        currency: data.currency,
        name: "Traffic eChallan Payment",
        description: `Fine: ${challan.challan_number}`,
        order_id: data.order_id,
        handler: async function (response: any) {
          await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-payment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "verify_payment",
              order_id: data.order_id,
              payment_id: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            }),
          });
          setChallan(prev => prev ? { ...prev, payment_status: "paid", status: "closed" } : null);
          toast({ title: "Payment Successful!", description: "Your challan fine has been paid." });
        },
        prefill: { name: challan.owner_name || "", email: "", contact: "" },
        theme: { color: "#1a56db" },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (e: any) {
      toast({ title: "Payment Error", description: e.message, variant: "destructive" });
    } finally {
      setPaying(false);
    }
  };

  const handlePrint = () => window.print();

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm text-center">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-500" />
        <h2 className="text-lg font-bold text-slate-800 mb-2">Challan Not Found</h2>
        <p className="text-slate-500 text-sm">{error}</p>
      </div>
    </div>
  );

  if (!challan) return null;

  const isPaid = challan.payment_status === "paid";
  const issuedDate = new Date(challan.issued_at);
  const dueDate = challan.due_date ? new Date(challan.due_date) : null;

  return (
    <div className="min-h-screen bg-slate-100 py-6 px-4 print:bg-white print:py-0">
      {/* Action buttons - hidden in print */}
      <div className="max-w-[480px] mx-auto mb-4 flex gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2 bg-white border-slate-300 text-slate-700 hover:bg-slate-50">
          <Printer className="h-4 w-4" /> Print
        </Button>
      </div>

      {/* eChallan Receipt Slip */}
      <div ref={slipRef} className="max-w-[480px] mx-auto bg-white shadow-xl print:shadow-none" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
        
        {/* Header */}
        <div className="bg-blue-800 text-white px-6 py-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <Shield className="h-6 w-6" />
            <span className="text-lg font-bold tracking-wide">eCHALLAN</span>
          </div>
          <p className="text-blue-200 text-xs tracking-widest uppercase">Government of {challan.state}</p>
          <p className="text-blue-300 text-[10px] mt-1">Traffic Enforcement Department</p>
        </div>

        {/* Challan Number & Status Strip */}
        <div className="flex items-center justify-between px-6 py-3 bg-slate-50 border-b border-dashed border-slate-300">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Challan No.</p>
            <p className="text-sm font-bold text-slate-800">{challan.challan_number}</p>
          </div>
          <div className={`px-3 py-1 rounded text-xs font-bold uppercase tracking-wider ${
            isPaid 
              ? "bg-emerald-100 text-emerald-700 border border-emerald-300" 
              : "bg-red-100 text-red-700 border border-red-300"
          }`}>
            {isPaid ? "✓ PAID" : "UNPAID"}
          </div>
        </div>

        {/* Tear line */}
        <div className="border-b-2 border-dashed border-slate-200" />

        {/* Violation Section */}
        <div className="px-6 py-4 bg-red-50 border-b border-slate-200">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-xs text-red-500 uppercase tracking-wider font-semibold">Violation</p>
              <p className="text-sm font-bold text-red-800 mt-0.5">{challan.violation_label}</p>
              {challan.description && (
                <p className="text-[11px] text-red-600/70 mt-1">{challan.description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Details Grid */}
        <div className="px-6 py-4 space-y-0 border-b border-slate-200">
          <SlipRow label="Date of Issue" value={issuedDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} />
          <SlipRow label="Due Date" value={dueDate ? dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—"} />
          <div className="border-t border-dotted border-slate-200 my-2" />
          <SlipRow label="Vehicle No." value={challan.plate_number} bold />
          <SlipRow label="Vehicle" value={[challan.vehicle_make, challan.vehicle_model].filter(Boolean).join(" ") || "—"} />
          <SlipRow label="Color" value={challan.vehicle_color || "—"} />
          <SlipRow label="Type" value={challan.vehicle_type || "—"} />
          <div className="border-t border-dotted border-slate-200 my-2" />
          <SlipRow label="Owner" value={challan.owner_name || "—"} />
          <SlipRow label="RTO Office" value={challan.rto_office || "—"} />
          <SlipRow label="State" value={challan.state} />
        </div>

        {/* Evidence */}
        {challan.image_url && (
          <div className="px-6 py-3 border-b border-slate-200">
            <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Evidence Photo</p>
            <img src={challan.image_url} alt="Violation evidence" className="w-full h-32 object-cover rounded border border-slate-200" />
          </div>
        )}

        {/* Fine Amount */}
        <div className="px-6 py-4 border-b-2 border-dashed border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 uppercase tracking-wider">Fine Amount</span>
            <span className="text-2xl font-black text-slate-900">₹{challan.fine_amount.toLocaleString("en-IN")}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-slate-400">Severity</span>
            <span className={`text-[10px] font-semibold uppercase ${
              challan.severity === "high" ? "text-red-600" : challan.severity === "medium" ? "text-amber-600" : "text-slate-500"
            }`}>{challan.severity || "—"}</span>
          </div>
        </div>

        {/* Payment Section */}
        {!isPaid ? (
          <div className="px-6 py-5 print:hidden">
            <Button 
              onClick={handlePayment} 
              disabled={paying} 
              className="w-full bg-blue-700 hover:bg-blue-800 text-white font-bold py-3 text-sm tracking-wide"
              size="lg"
            >
              {paying ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</>
              ) : (
                <>Pay ₹{challan.fine_amount.toLocaleString("en-IN")} Online</>
              )}
            </Button>
            <p className="text-[10px] text-slate-400 text-center mt-2">Secure payment via Razorpay</p>
          </div>
        ) : (
          <div className="px-6 py-5 text-center">
            <div className="inline-flex items-center gap-2 text-emerald-700 font-bold text-sm">
              <span className="text-lg">✓</span> Payment Received
            </div>
            <p className="text-[10px] text-slate-400 mt-1">No further action required</p>
          </div>
        )}

        {/* Footer */}
        <div className="bg-slate-50 px-6 py-3 text-center border-t border-slate-200">
          <p className="text-[10px] text-slate-400">This is a computer-generated eChallan.</p>
          <p className="text-[10px] text-slate-400">Please pay within the due date to avoid additional penalties.</p>

          {/* Barcode-style decoration */}
          <div className="mt-3 flex items-center justify-center gap-[2px]">
            {Array.from({ length: 40 }).map((_, i) => (
              <div 
                key={i} 
                className="bg-slate-800" 
                style={{ 
                  width: Math.random() > 0.5 ? 2 : 1, 
                  height: 20 
                }} 
              />
            ))}
          </div>
          <p className="text-[9px] text-slate-300 mt-1 font-mono">{challan.challan_number}</p>
        </div>
      </div>
    </div>
  );
}

function SlipRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between items-baseline py-1">
      <span className="text-[11px] text-slate-400">{label}</span>
      <span className={`text-[12px] text-slate-800 text-right ${bold ? "font-bold text-sm" : ""}`}>{value}</span>
    </div>
  );
}
