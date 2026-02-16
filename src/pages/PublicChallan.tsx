import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, Car, FileText, CreditCard, CheckCircle, Loader2, Shield } from "lucide-react";

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
  const [payerName, setPayerName] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerPhone, setPayerPhone] = useState("");
  const [paying, setPaying] = useState(false);
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
    if (!challan || !payerName) return;
    setPaying(true);
    try {
      const resp = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/razorpay-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_order",
          public_token: token,
          payer_name: payerName,
          payer_email: payerEmail,
          payer_phone: payerPhone,
        }),
      });
      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      if (data.mock) {
        toast({ title: "Demo Mode", description: "Razorpay not configured. In production, payment gateway would open here." });
        setPaying(false);
        return;
      }

      // Open Razorpay checkout
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
          toast({ title: "Payment Successful!", description: "Your challan has been paid." });
        },
        prefill: { name: payerName, email: payerEmail, contact: payerPhone },
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <Card className="max-w-md w-full mx-4">
        <CardContent className="pt-6 text-center">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-destructive" />
          <h2 className="text-lg font-bold mb-2">Challan Not Found</h2>
          <p className="text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    </div>
  );

  if (!challan) return null;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Shield className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Traffic eChallan</h1>
          </div>
          <p className="text-muted-foreground">Government of {challan.state} - Traffic Enforcement</p>
        </div>

        {/* Challan Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> {challan.challan_number}</CardTitle>
                <CardDescription>Issued on {new Date(challan.issued_at).toLocaleDateString()}</CardDescription>
              </div>
              <Badge variant={challan.payment_status === "paid" ? "default" : "destructive"} className="text-sm">
                {challan.payment_status === "paid" ? "PAID" : "UNPAID"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-destructive/10 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <span className="font-bold text-destructive">{challan.violation_label}</span>
              </div>
              <p className="text-sm text-muted-foreground">{challan.description}</p>
              <p className="text-2xl font-bold mt-2">Fine: ₹{challan.fine_amount.toLocaleString()}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2"><Car className="h-4 w-4 text-muted-foreground" /> <span className="text-muted-foreground">Vehicle:</span></div>
              <div className="font-medium">{challan.vehicle_make} {challan.vehicle_model} ({challan.vehicle_color})</div>
              <div className="text-muted-foreground">Plate Number:</div>
              <div className="font-mono font-bold">{challan.plate_number}</div>
              <div className="text-muted-foreground">Owner:</div>
              <div className="font-medium">{challan.owner_name || "N/A"}</div>
              <div className="text-muted-foreground">RTO Office:</div>
              <div>{challan.rto_office || "N/A"}</div>
              <div className="text-muted-foreground">Due Date:</div>
              <div className="font-medium">{challan.due_date ? new Date(challan.due_date).toLocaleDateString() : "N/A"}</div>
            </div>

            {challan.image_url && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Evidence</p>
                  <img src={challan.image_url} alt="Violation evidence" className="rounded-lg max-h-48 object-contain" />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Payment Section */}
        {challan.payment_status !== "paid" ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5" /> Pay Fine Online</CardTitle>
              <CardDescription>Pay your traffic challan fine securely online</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="payer-name">Full Name *</Label>
                  <Input id="payer-name" value={payerName} onChange={(e) => setPayerName(e.target.value)} placeholder="Enter your name" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payer-phone">Phone</Label>
                  <Input id="payer-phone" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} placeholder="+91..." />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="payer-email">Email</Label>
                  <Input id="payer-email" type="email" value={payerEmail} onChange={(e) => setPayerEmail(e.target.value)} placeholder="your@email.com" />
                </div>
              </div>
              <Button onClick={handlePayment} disabled={paying || !payerName} className="w-full" size="lg">
                {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing...</> : <><CreditCard className="h-4 w-4 mr-2" /> Pay ₹{challan.fine_amount.toLocaleString()} Now</>}
              </Button>
              <p className="text-xs text-muted-foreground text-center">Payments processed securely via Razorpay</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-6 text-center">
              <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-600" />
              <h2 className="text-lg font-bold text-green-600">Challan Paid Successfully</h2>
              <p className="text-muted-foreground">This challan has been settled. No further action required.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
