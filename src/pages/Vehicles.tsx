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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Search, Plus, Car, Filter, Ban, Check } from "lucide-react";

type Vehicle = Tables<"vehicles">;
type VehicleGroup = Tables<"vehicle_groups">;

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [groups, setGroups] = useState<VehicleGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newVehicle, setNewVehicle] = useState({
    plate_number: "",
    vehicle_type: "car" as const,
    make: "",
    model: "",
    color: "",
    owner_name: "",
    owner_contact: "",
    notes: "",
    group_id: "",
  });

  useEffect(() => {
    fetchVehicles();
    fetchGroups();
  }, []);

  const fetchVehicles = async () => {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setVehicles(data || []);
    } catch (error) {
      console.error("Error fetching vehicles:", error);
      toast({ title: "Error", description: "Failed to load vehicles", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    const { data } = await supabase.from("vehicle_groups").select("*");
    setGroups(data || []);
  };

  const handleAddVehicle = async () => {
    try {
      const { error } = await supabase.from("vehicles").insert({
        plate_number: newVehicle.plate_number.toUpperCase(),
        vehicle_type: newVehicle.vehicle_type,
        make: newVehicle.make || null,
        model: newVehicle.model || null,
        color: newVehicle.color || null,
        owner_name: newVehicle.owner_name || null,
        owner_contact: newVehicle.owner_contact || null,
        notes: newVehicle.notes || null,
        group_id: newVehicle.group_id || null,
      });

      if (error) throw error;

      toast({ title: "Success", description: "Vehicle added successfully" });
      setIsAddDialogOpen(false);
      setNewVehicle({
        plate_number: "",
        vehicle_type: "car",
        make: "",
        model: "",
        color: "",
        owner_name: "",
        owner_contact: "",
        notes: "",
        group_id: "",
      });
      fetchVehicles();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const toggleBlacklist = async (vehicle: Vehicle) => {
    try {
      const { error } = await supabase
        .from("vehicles")
        .update({ is_blacklisted: !vehicle.is_blacklisted })
        .eq("id", vehicle.id);

      if (error) throw error;
      fetchVehicles();
      toast({
        title: vehicle.is_blacklisted ? "Removed from blacklist" : "Added to blacklist",
      });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.owner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.make?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = filterType === "all" || vehicle.vehicle_type === filterType;

    return matchesSearch && matchesType;
  });

  const getVehicleTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      car: "bg-blue-100 text-blue-800",
      two_wheeler: "bg-green-100 text-green-800",
      commercial: "bg-orange-100 text-orange-800",
      other: "bg-gray-100 text-gray-800",
    };
    return colors[type] || colors.other;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage registered vehicles and their access permissions
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Vehicle
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add New Vehicle</DialogTitle>
              <DialogDescription>
                Register a new vehicle in the system
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="plate">Plate Number *</Label>
                <Input
                  id="plate"
                  placeholder="e.g., MH12AB1234"
                  value={newVehicle.plate_number}
                  onChange={(e) => setNewVehicle({ ...newVehicle, plate_number: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="type">Vehicle Type</Label>
                <Select
                  value={newVehicle.vehicle_type}
                  onValueChange={(value: any) => setNewVehicle({ ...newVehicle, vehicle_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="car">Car</SelectItem>
                    <SelectItem value="two_wheeler">Two Wheeler</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="make">Make</Label>
                  <Input
                    id="make"
                    placeholder="e.g., Toyota"
                    value={newVehicle.make}
                    onChange={(e) => setNewVehicle({ ...newVehicle, make: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="model">Model</Label>
                  <Input
                    id="model"
                    placeholder="e.g., Camry"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({ ...newVehicle, model: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  placeholder="e.g., White"
                  value={newVehicle.color}
                  onChange={(e) => setNewVehicle({ ...newVehicle, color: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="owner">Owner Name</Label>
                <Input
                  id="owner"
                  placeholder="Vehicle owner name"
                  value={newVehicle.owner_name}
                  onChange={(e) => setNewVehicle({ ...newVehicle, owner_name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact">Owner Contact</Label>
                <Input
                  id="contact"
                  placeholder="Phone or email"
                  value={newVehicle.owner_contact}
                  onChange={(e) => setNewVehicle({ ...newVehicle, owner_contact: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="group">Vehicle Group</Label>
                <Select
                  value={newVehicle.group_id}
                  onValueChange={(value) => setNewVehicle({ ...newVehicle, group_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select group (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={newVehicle.notes}
                  onChange={(e) => setNewVehicle({ ...newVehicle, notes: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddVehicle} disabled={!newVehicle.plate_number}>
                Add Vehicle
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by plate, owner, or make..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[180px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="car">Cars</SelectItem>
                <SelectItem value="two_wheeler">Two Wheelers</SelectItem>
                <SelectItem value="commercial">Commercial</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles table */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Vehicles</CardTitle>
          <CardDescription>
            {filteredVehicles.length} vehicles found
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Plate Number</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Make/Model</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Seen</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Loading vehicles...
                  </TableCell>
                </TableRow>
              ) : filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <Car className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">No vehicles found</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredVehicles.map((vehicle) => (
                  <TableRow key={vehicle.id}>
                    <TableCell className="font-mono font-medium">
                      {vehicle.plate_number}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className={getVehicleTypeBadge(vehicle.vehicle_type)}>
                        {vehicle.vehicle_type.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {vehicle.make || vehicle.model
                        ? `${vehicle.make || ""} ${vehicle.model || ""}`.trim()
                        : "-"}
                    </TableCell>
                    <TableCell>{vehicle.owner_name || "-"}</TableCell>
                    <TableCell>
                      {vehicle.is_blacklisted ? (
                        <Badge variant="destructive">Blacklisted</Badge>
                      ) : (
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(vehicle.last_seen_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleBlacklist(vehicle)}
                      >
                        {vehicle.is_blacklisted ? (
                          <>
                            <Check className="h-4 w-4 mr-1" />
                            Whitelist
                          </>
                        ) : (
                          <>
                            <Ban className="h-4 w-4 mr-1" />
                            Blacklist
                          </>
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
