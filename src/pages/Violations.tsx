import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables, Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, AlertTriangle, Filter, Eye, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import DataScopeToggle from "@/components/DataScopeToggle";

type Violation = Tables<"violations">;
type ViolationType = Database["public"]["Enums"]["violation_type"];

const violationTypeLabels: Record<ViolationType, string> = {
  helmet: "No Helmet",
  seatbelt: "No Seatbelt",
  triple_riding: "Triple Riding",
  mobile_phone: "Mobile Phone Usage",
  wrong_way: "Wrong Way",
  red_light: "Red Light",
  illegal_parking: "Illegal Parking",
  overloading: "Overloading",
  other: "Other",
};

const severityColors: Record<string, string> = {
  low: "bg-yellow-100 text-yellow-800",
  medium: "bg-orange-100 text-orange-800",
  high: "bg-red-100 text-red-800",
};

export default function Violations() {
  const [violations, setViolations] = useState<(Violation & { vehicle?: { plate_number: string } })[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [selectedViolation, setSelectedViolation] = useState<Violation | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [scope, setScope] = useState<"all" | "mine">("all");
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchViolations();
  }, []);

  const fetchViolations = async () => {
    try {
      const { data, error } = await supabase
        .from("violations")
        .select("*, vehicle:vehicles(plate_number)")
        .order("detected_at", { ascending: false });

      if (error) throw error;
      setViolations(data || []);
    } catch (error) {
      console.error("Error fetching violations:", error);
      toast({ title: "Error", description: "Failed to load violations", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedViolation) return;

    try {
      const { error } = await supabase
        .from("violations")
        .update({
          resolved_at: new Date().toISOString(),
          resolution_notes: resolutionNotes,
        })
        .eq("id", selectedViolation.id);

      if (error) throw error;

      toast({ title: "Violation resolved successfully" });
      setSelectedViolation(null);
      setResolutionNotes("");
      fetchViolations();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredViolations = violations.filter((violation) => {
    const matchesSearch =
      violation.vehicle?.plate_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      violation.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || violation.violation_type === filterType;
    const matchesSeverity = filterSeverity === "all" || violation.severity === filterSeverity;
    const matchesScope = scope === "all" || violation.resolved_by === user?.id;

    return matchesSearch && matchesType && matchesSeverity && matchesScope;
  });

  const pendingCount = violations.filter((v) => !v.resolved_at).length;
  const resolvedCount = violations.filter((v) => v.resolved_at).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Violations</h1>
          <p className="text-muted-foreground">
            Monitor and manage traffic violations
          </p>
        </div>
        <div className="flex items-center gap-4">
          <DataScopeToggle scope={scope} onScopeChange={setScope} />
          <Badge variant="destructive" className="text-sm">
            {pendingCount} Pending
          </Badge>
          <Badge variant="outline" className="text-sm text-green-600 border-green-600">
            {resolvedCount} Resolved
          </Badge>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {Object.entries(violationTypeLabels).slice(0, 4).map(([type, label]) => {
          const count = violations.filter((v) => v.violation_type === type && !v.resolved_at).length;
          return (
            <Card key={type}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">Active violations</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by plate or description..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Violation type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(violationTypeLabels).map(([type, label]) => (
                  <SelectItem key={type} value={type}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severity</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Violations table */}
      <Card>
        <CardHeader>
          <CardTitle>Violation Records</CardTitle>
          <CardDescription>
            {filteredViolations.length} violations found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Severity</TableHead>
                <TableHead>Detected</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Fine</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading violations...
                  </TableCell>
                </TableRow>
              ) : filteredViolations.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No violations found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredViolations.map((violation) => (
                  <TableRow key={violation.id}>
                    <TableCell className="font-mono font-medium">
                      {violation.vehicle?.plate_number || "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {violationTypeLabels[violation.violation_type]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={severityColors[violation.severity || "medium"]}>
                        {violation.severity || "medium"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(violation.detected_at).toLocaleString()}
                    </TableCell>
                    <TableCell>
                      {violation.resolved_at ? (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resolved
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Pending</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {violation.fine_amount ? `₹${violation.fine_amount}` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {!violation.resolved_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedViolation(violation)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Resolve dialog */}
      <Dialog open={!!selectedViolation} onOpenChange={() => setSelectedViolation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve Violation</DialogTitle>
            <DialogDescription>
              Mark this violation as resolved and add resolution notes.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Violation Type</Label>
              <p className="text-sm font-medium">
                {selectedViolation && violationTypeLabels[selectedViolation.violation_type]}
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Resolution Notes</Label>
              <Textarea
                id="notes"
                placeholder="Enter resolution notes..."
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedViolation(null)}>
              Cancel
            </Button>
            <Button onClick={handleResolve}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Mark as Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
