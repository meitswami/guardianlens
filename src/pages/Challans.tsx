import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Filter, Eye, Send, ExternalLink, Copy } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DataScopeToggle from "@/components/DataScopeToggle";

export default function Challans() {
  const [challans, setChallans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [selectedChallan, setSelectedChallan] = useState<any>(null);
  const [scope, setScope] = useState<"all" | "mine">("all");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchChallans();
    const channel = supabase
      .channel("challans-updates")
      .on("postgres_changes", { event: "*", schema: "public", table: "challans" }, () => fetchChallans())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchChallans = async () => {
    const { data } = await supabase
      .from("challans")
      .select("*")
      .order("created_at", { ascending: false });
    setChallans(data || []);
    setLoading(false);
  };

  const handleSendSMS = async (challanId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-challan-sms", {
        body: { challan_id: challanId },
      });
      if (error) throw error;
      toast({ title: data.mock ? "SMS (Demo Mode)" : "SMS Sent", description: data.mock ? "MSG91 not configured yet" : "Challan notification sent" });
    } catch (e: any) {
      toast({ title: "SMS Failed", description: e.message, variant: "destructive" });
    }
  };

  const getPublicUrl = (token: string) =>
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-challan?token=${token}`;

  const filtered = challans.filter((c) => {
    const matchesSearch = c.plate_number.toLowerCase().includes(search.toLowerCase()) ||
      c.challan_number.toLowerCase().includes(search.toLowerCase()) ||
      (c.owner_name || "").toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    const matchesPayment = paymentFilter === "all" || c.payment_status === paymentFilter;
    const matchesScope = scope === "all" || c.issued_by === user?.id;
    return matchesSearch && matchesStatus && matchesPayment && matchesScope;
  });

  const totalFines = challans.reduce((s, c) => s + (c.fine_amount || 0), 0);
  const collected = challans.filter(c => c.payment_status === "paid").reduce((s, c) => s + (c.payment_amount || c.fine_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">eChallans</h1>
          <p className="text-muted-foreground">Manage all issued electronic challans</p>
        </div>
        <div className="flex items-center gap-3">
          <DataScopeToggle scope={scope} onScopeChange={setScope} />
          <Badge variant="outline" className="text-sm">Total Fines: ₹{totalFines.toLocaleString()}</Badge>
          <Badge variant="outline" className="text-sm text-green-600 border-green-600">Collected: ₹{collected.toLocaleString()}</Badge>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total Challans</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{challans.length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Pending</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{challans.filter(c => c.status === "pending").length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Paid</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold text-green-600">{challans.filter(c => c.payment_status === "paid").length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">SMS Sent</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{challans.filter(c => c.sms_sent).length}</div></CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by plate, challan no, owner..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]"><Filter className="h-4 w-4 mr-2" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="unpaid">Unpaid</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Challan Records</CardTitle>
          <CardDescription>{filtered.length} challans</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Challan #</TableHead>
                <TableHead>Plate</TableHead>
                <TableHead>Violation</TableHead>
                <TableHead>State</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>SMS</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No challans found</TableCell></TableRow>
              ) : filtered.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono text-xs">{c.challan_number}</TableCell>
                  <TableCell className="font-mono font-medium">{c.plate_number}</TableCell>
                  <TableCell><Badge variant="secondary">{c.violation_label}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{c.state}</Badge></TableCell>
                  <TableCell className="font-bold">₹{c.fine_amount?.toLocaleString()}</TableCell>
                  <TableCell>
                    <Badge variant={c.payment_status === "paid" ? "default" : "destructive"}>
                      {c.payment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>{c.sms_sent ? <Badge variant="outline" className="text-green-600 border-green-600">Sent</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button variant="ghost" size="icon" onClick={() => setSelectedChallan(c)} title="View"><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => handleSendSMS(c.id)} title="Send SMS"><Send className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => {
                        navigator.clipboard.writeText(getPublicUrl(c.public_token));
                        toast({ title: "Public link copied!" });
                      }} title="Copy link"><Copy className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedChallan} onOpenChange={() => setSelectedChallan(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Challan Details - {selectedChallan?.challan_number}</DialogTitle></DialogHeader>
          {selectedChallan && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Plate:</span> <span className="font-mono font-bold">{selectedChallan.plate_number}</span></div>
                <div><span className="text-muted-foreground">Violation:</span> {selectedChallan.violation_label}</div>
                <div><span className="text-muted-foreground">Fine:</span> <span className="font-bold text-destructive">₹{selectedChallan.fine_amount?.toLocaleString()}</span></div>
                <div><span className="text-muted-foreground">State:</span> {selectedChallan.state}</div>
                <div><span className="text-muted-foreground">Owner:</span> {selectedChallan.owner_name || "N/A"}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selectedChallan.owner_phone || "N/A"}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {selectedChallan.vehicle_make} {selectedChallan.vehicle_model}</div>
                <div><span className="text-muted-foreground">RTO:</span> {selectedChallan.rto_office || "N/A"}</div>
                <div><span className="text-muted-foreground">Payment:</span> <Badge variant={selectedChallan.payment_status === "paid" ? "default" : "destructive"}>{selectedChallan.payment_status}</Badge></div>
                <div><span className="text-muted-foreground">Issued:</span> {new Date(selectedChallan.issued_at).toLocaleString()}</div>
                <div><span className="text-muted-foreground">Due:</span> {selectedChallan.due_date ? new Date(selectedChallan.due_date).toLocaleDateString() : "N/A"}</div>
                <div><span className="text-muted-foreground">SMS:</span> {selectedChallan.sms_sent ? `Sent at ${new Date(selectedChallan.sms_sent_at).toLocaleString()}` : "Not sent"}</div>
              </div>
              {selectedChallan.image_url && (
                <div><Label className="text-xs text-muted-foreground">Evidence Image</Label><img src={selectedChallan.image_url} alt="Evidence" className="mt-1 rounded-lg max-h-48 object-contain" /></div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.open(getPublicUrl(selectedChallan.public_token), "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> Open Public Page
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSendSMS(selectedChallan.id)}>
                  <Send className="h-4 w-4 mr-1" /> Resend SMS
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Fix missing import
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={className}>{children}</span>;
}
