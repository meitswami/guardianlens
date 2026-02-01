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
import { Plus, Camera, Video, MapPin, Settings } from "lucide-react";

type CameraType = Tables<"cameras">;

const statusColors: Record<string, string> = {
  online: "bg-green-100 text-green-800",
  offline: "bg-red-100 text-red-800",
  maintenance: "bg-yellow-100 text-yellow-800",
};

export default function Cameras() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const { toast } = useToast();

  const [newCamera, setNewCamera] = useState({
    name: "",
    location: "",
    description: "",
    rtsp_url: "",
    latitude: "",
    longitude: "",
  });

  useEffect(() => {
    fetchCameras();
  }, []);

  const fetchCameras = async () => {
    try {
      const { data, error } = await supabase
        .from("cameras")
        .select("*")
        .order("name");

      if (error) throw error;
      setCameras(data || []);
    } catch (error) {
      console.error("Error fetching cameras:", error);
      toast({ title: "Error", description: "Failed to load cameras", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCamera = async () => {
    try {
      const { error } = await supabase.from("cameras").insert({
        name: newCamera.name,
        location: newCamera.location,
        description: newCamera.description || null,
        rtsp_url: newCamera.rtsp_url || null,
        latitude: newCamera.latitude ? parseFloat(newCamera.latitude) : null,
        longitude: newCamera.longitude ? parseFloat(newCamera.longitude) : null,
        status: "offline",
      });

      if (error) throw error;

      toast({ title: "Camera added successfully" });
      setIsAddDialogOpen(false);
      setNewCamera({ name: "", location: "", description: "", rtsp_url: "", latitude: "", longitude: "" });
      fetchCameras();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const updateCameraStatus = async (id: string, status: "online" | "offline" | "maintenance") => {
    try {
      const { error } = await supabase
        .from("cameras")
        .update({ status })
        .eq("id", id);

      if (error) throw error;
      fetchCameras();
      toast({ title: `Camera status updated to ${status}` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const onlineCount = cameras.filter((c) => c.status === "online").length;
  const offlineCount = cameras.filter((c) => c.status === "offline").length;
  const maintenanceCount = cameras.filter((c) => c.status === "maintenance").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Cameras</h1>
          <p className="text-muted-foreground">
            Manage surveillance cameras and their feeds
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Camera
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Camera</DialogTitle>
              <DialogDescription>
                Register a new surveillance camera
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Camera Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Main Gate Camera"
                  value={newCamera.name}
                  onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="location">Location *</Label>
                <Input
                  id="location"
                  placeholder="e.g., Building A Entrance"
                  value={newCamera.location}
                  onChange={(e) => setNewCamera({ ...newCamera, location: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="rtsp">RTSP URL</Label>
                <Input
                  id="rtsp"
                  placeholder="rtsp://..."
                  value={newCamera.rtsp_url}
                  onChange={(e) => setNewCamera({ ...newCamera, rtsp_url: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="lat">Latitude</Label>
                  <Input
                    id="lat"
                    type="number"
                    step="any"
                    placeholder="e.g., 19.0760"
                    value={newCamera.latitude}
                    onChange={(e) => setNewCamera({ ...newCamera, latitude: e.target.value })}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lng">Longitude</Label>
                  <Input
                    id="lng"
                    type="number"
                    step="any"
                    placeholder="e.g., 72.8777"
                    value={newCamera.longitude}
                    onChange={(e) => setNewCamera({ ...newCamera, longitude: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="desc">Description</Label>
                <Textarea
                  id="desc"
                  placeholder="Camera description..."
                  value={newCamera.description}
                  onChange={(e) => setNewCamera({ ...newCamera, description: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddCamera}
                disabled={!newCamera.name || !newCamera.location}
              >
                Add Camera
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Online
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-2xl font-bold">{onlineCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Offline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <span className="text-2xl font-bold">{offlineCount}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Maintenance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span className="text-2xl font-bold">{maintenanceCount}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Camera grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              Loading cameras...
            </CardContent>
          </Card>
        ) : cameras.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center">
              <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-muted-foreground">No cameras configured</p>
            </CardContent>
          </Card>
        ) : (
          cameras.map((camera) => (
            <Card key={camera.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{camera.name}</CardTitle>
                    <CardDescription className="flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" />
                      {camera.location}
                    </CardDescription>
                  </div>
                  <Badge className={statusColors[camera.status]}>
                    {camera.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                {/* Placeholder for camera feed */}
                <div className="aspect-video bg-muted rounded-md flex items-center justify-center mb-4">
                  {camera.status === "online" ? (
                    <Video className="h-8 w-8 text-muted-foreground" />
                  ) : (
                    <Camera className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={camera.status}
                    onValueChange={(value: "online" | "offline" | "maintenance") => updateCameraStatus(camera.id, value)}
                  >
                    <SelectTrigger className="flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="online">Online</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="icon">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
