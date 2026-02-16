import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Filter } from "lucide-react";

export default function FinesMaster() {
  const [fines, setFines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState("all");

  useEffect(() => {
    const fetchFines = async () => {
      const { data } = await supabase
        .from("fines_master")
        .select("*")
        .order("state")
        .order("violation_type");
      setFines(data || []);
      setLoading(false);
    };
    fetchFines();
  }, []);

  const filtered = fines.filter((f) => {
    const matchesSearch = f.violation_label.toLowerCase().includes(search.toLowerCase()) ||
      f.violation_type.toLowerCase().includes(search.toLowerCase()) ||
      (f.section_reference || "").toLowerCase().includes(search.toLowerCase());
    const matchesState = stateFilter === "all" || f.state === stateFilter;
    return matchesSearch && matchesState;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Fines & Violations Master</h1>
        <p className="text-muted-foreground">Complete list of traffic violations and fines for Rajasthan & Telangana</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search violations, sections..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                <SelectItem value="Telangana">Telangana</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Violation Rules</CardTitle>
          <CardDescription>{filtered.length} entries</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>State</TableHead>
                <TableHead>Violation</TableHead>
                <TableHead>Section</TableHead>
                <TableHead>Fine (₹)</TableHead>
                <TableHead>Repeat (₹)</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-8">Loading...</TableCell></TableRow>
              ) : filtered.map((f) => (
                <TableRow key={f.id}>
                  <TableCell><Badge variant="outline">{f.state}</Badge></TableCell>
                  <TableCell className="font-medium">{f.violation_label}</TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">{f.section_reference || "-"}</TableCell>
                  <TableCell className="font-bold">₹{f.fine_amount.toLocaleString()}</TableCell>
                  <TableCell>{f.repeat_fine_amount ? `₹${f.repeat_fine_amount.toLocaleString()}` : "-"}</TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">{f.description || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
