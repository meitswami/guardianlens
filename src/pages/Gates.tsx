import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, DoorOpen, LogIn, LogOut, Ban, Search } from "lucide-react";

type Gate = Tables<"gates">;
type GateEntryLog = Tables<"gate_entry_logs">;
type VehicleGroup = Tables<"vehicle_groups">;

export default function Gates() {
  const [gates, setGates] = useState<Gate[]>([]);
  const [entryLogs, setEntryLogs] = useState<(GateEntryLog & { gate?: { name: string } })[]>([]);
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddGateOpen, setIsAddGateOpen] = useState(false);
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  const [newGate, setNewGate] = useState({
    name: "",
    location: "",
    description: "",
  });

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    color: "#3B82F6",
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [gatesRes, logsRes, groupsRes] = await Promise.all([
        supabase.from("gates").select("*").order("name"),
        supabase.from("gate_entry_logs").select("*, gate:gates(name)").order("logged_at", { ascending: false }).limit(50),
        supabase.from("vehicle_groups").select("*").order("name"),
      ]);

      setGates(gatesRes.data || []);
      setEntryLogs(logsRes.data || []);
      setGroups(groupsRes.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast({ title: "Error", description: "Failed to load data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddGate = async () => {
    try {
      const { error } = await supabase.from("gates").insert({
        name: newGate.name,
        location: newGate.location,
        description: newGate.description || null,
        is_active: true,
      });

      if (error) throw error;

      toast({ title: "Gate added successfully" });
      setIsAddGateOpen(false);
      setNewGate({ name: "", location: "", description: "" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleAddGroup = async () => {
    try {
      const { error } = await supabase.from("vehicle_groups").insert({
        name: newGroup.name,
        description: newGroup.description || null,
        color: newGroup.color,
      });

      if (error) throw error;

      toast({ title: "Vehicle group created successfully" });
      setIsAddGroupOpen(false);
      setNewGroup({ name: "", description: "", color: "#3B82F6" });
      fetchData();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleGateStatus = async (gate: Gate) => {
    try {
      const { error } = await supabase
        .from("gates")
        .update({ is_active: !gate.is_active })
        .eq("id", gate.id);

      if (error) throw error;
      fetchData();
      toast({ title: `Gate ${gate.is_active ? "deactivated" : "activated"}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredLogs = entryLogs.filter((log) =>
    log.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    log.gate?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const actionIcons: Record<string, React.ReactNode> = {
    entry: <LogIn className="h-4 w-4 text-green-600" />,
    exit: <LogOut className="h-4 w-4 text-blue-600" />,
    denied: <Ban className="h-4 w-4 text-red-600" />,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Gates & Access Control</h1>
          <p className="text-muted-foreground">
            Manage gates, access rules, and vehicle groups
          </p>
        </div>
      </div>

      <Tabs defaultValue="gates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="gates">Gates</TabsTrigger>
          <TabsTrigger value="logs">Entry Logs</TabsTrigger>
          <TabsTrigger value="groups">Vehicle Groups</TabsTrigger>
        </TabsList>

        {/* Gates Tab */}
        <TabsContent value="gates" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddGateOpen} onOpenChange={setIsAddGateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Gate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Gate</DialogTitle>
                  <DialogDescription>Create a new access control gate</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="gateName">Gate Name *</Label>
                    <Input
                      id="gateName"
                      placeholder="e.g., Main Entrance"
                      value={newGate.name}
                      onChange={(e) => setNewGate({ ...newGate, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gateLocation">Location *</Label>
                    <Input
                      id="gateLocation"
                      placeholder="e.g., Building A"
                      value={newGate.location}
                      onChange={(e) => setNewGate({ ...newGate, location: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="gateDesc">Description</Label>
                    <Textarea
                      id="gateDesc"
                      placeholder="Gate description..."
                      value={newGate.description}
                      onChange={(e) => setNewGate({ ...newGate, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddGateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddGate} disabled={!newGate.name || !newGate.location}>
                    Add Gate
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {loading ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">Loading gates...</CardContent>
              </Card>
            ) : gates.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <DoorOpen className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-muted-foreground">No gates configured</p>
                </CardContent>
              </Card>
            ) : (
              gates.map((gate) => (
                <Card key={gate.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{gate.name}</CardTitle>
                        <CardDescription>{gate.location}</CardDescription>
                      </div>
                      <Badge variant={gate.is_active ? "default" : "secondary"}>
                        {gate.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        {gate.description || "No description"}
                      </span>
                      <Switch
                        checked={gate.is_active || false}
                        onCheckedChange={() => toggleGateStatus(gate)}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* Entry Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by plate number or gate..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recent Entry Logs</CardTitle>
              <CardDescription>Last 50 gate activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Gate</TableHead>
                    <TableHead>Plate Number</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8">
                        No entry logs found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground">
                          {new Date(log.logged_at).toLocaleString()}
                        </TableCell>
                        <TableCell>{log.gate?.name || "Unknown"}</TableCell>
                        <TableCell className="font-mono font-medium">
                          {log.plate_number}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {actionIcons[log.action]}
                            <span className="capitalize">{log.action}</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vehicle Groups Tab */}
        <TabsContent value="groups" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Vehicle Group</DialogTitle>
                  <DialogDescription>
                    Create a group to organize vehicles for access control
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="groupName">Group Name *</Label>
                    <Input
                      id="groupName"
                      placeholder="e.g., VIP Vehicles"
                      value={newGroup.name}
                      onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="groupDesc">Description</Label>
                    <Textarea
                      id="groupDesc"
                      placeholder="Group description..."
                      value={newGroup.description}
                      onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="groupColor">Color</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="groupColor"
                        type="color"
                        className="w-16 h-10 p-1"
                        value={newGroup.color}
                        onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                      />
                      <Input
                        value={newGroup.color}
                        onChange={(e) => setNewGroup({ ...newGroup, color: e.target.value })}
                        className="flex-1"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddGroup} disabled={!newGroup.name}>
                    Create Group
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {groups.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">No vehicle groups created</p>
                </CardContent>
              </Card>
            ) : (
              groups.map((group) => (
                <Card key={group.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="h-4 w-4 rounded"
                        style={{ backgroundColor: group.color || "#3B82F6" }}
                      />
                      <CardTitle className="text-base">{group.name}</CardTitle>
                    </div>
                    <CardDescription>
                      {group.description || "No description"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
