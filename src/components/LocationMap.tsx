import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera } from "lucide-react";

type CameraType = Tables<"cameras">;
type GateType = Tables<"gates">;

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom icons
const cameraOnlineIcon = new L.Icon({
  iconUrl: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#16a34a" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#16a34a"/>
      <path d="M15 8v8l-5-4 5-4z" fill="white"/>
      <rect x="6" y="9" width="4" height="6" rx="1" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const cameraOfflineIcon = new L.Icon({
  iconUrl: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#dc2626" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#dc2626"/>
      <path d="M15 8v8l-5-4 5-4z" fill="white"/>
      <rect x="6" y="9" width="4" height="6" rx="1" fill="white"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const gateIcon = new L.Icon({
  iconUrl: "data:image/svg+xml," + encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#2563eb" width="32" height="32">
      <circle cx="12" cy="12" r="10" fill="#2563eb"/>
      <rect x="8" y="6" width="8" height="12" rx="1" fill="white"/>
      <circle cx="14" cy="12" r="1" fill="#2563eb"/>
    </svg>
  `),
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

// Map bounds adjuster component
function MapBoundsAdjuster({ cameras, gates }: { cameras: CameraType[]; gates: GateType[] }) {
  const map = useMap();

  useEffect(() => {
    const allPoints: [number, number][] = [];
    
    cameras.forEach((cam) => {
      if (cam.latitude && cam.longitude) {
        allPoints.push([Number(cam.latitude), Number(cam.longitude)]);
      }
    });

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [cameras, gates, map]);

  return null;
}

interface LocationMapProps {
  className?: string;
}

export default function LocationMap({ className }: LocationMapProps) {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [gates, setGates] = useState<GateType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      const [camerasRes, gatesRes] = await Promise.all([
        supabase.from("cameras").select("*"),
        supabase.from("gates").select("*"),
      ]);

      setCameras(camerasRes.data || []);
      setGates(gatesRes.data || []);
    } catch (error) {
      console.error("Error fetching locations:", error);
    } finally {
      setLoading(false);
    }
  };

  const camerasWithCoords = cameras.filter((c) => c.latitude && c.longitude);
  const defaultCenter: [number, number] = camerasWithCoords.length > 0
    ? [Number(camerasWithCoords[0].latitude), Number(camerasWithCoords[0].longitude)]
    : [19.076, 72.8777]; // Mumbai default

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          Loading map...
        </CardContent>
      </Card>
    );
  }

  // Memoize key to prevent re-renders causing context issues
  const mapKey = useMemo(() => `map-${defaultCenter[0]}-${defaultCenter[1]}`, [defaultCenter]);

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera & Gate Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] rounded-b-lg overflow-hidden">
          <MapContainer
            key={mapKey}
            center={defaultCenter}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <MapContent cameras={cameras} camerasWithCoords={camerasWithCoords} gates={gates} />
          </MapContainer>
        </div>
        
        {/* Legend */}
        <div className="p-4 border-t flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full bg-green-600" />
            <span>Camera Online</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full bg-red-600" />
            <span>Camera Offline</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full bg-blue-600" />
            <span>Gate</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Separate component for map content to avoid context consumer issues
function MapContent({ 
  cameras, 
  camerasWithCoords, 
  gates 
}: { 
  cameras: CameraType[]; 
  camerasWithCoords: CameraType[];
  gates: GateType[];
}) {
  return (
    <>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapBoundsAdjuster cameras={cameras} gates={gates} />
      
      {/* Camera markers */}
      {camerasWithCoords.map((camera) => (
        <Marker
          key={camera.id}
          position={[Number(camera.latitude), Number(camera.longitude)]}
          icon={camera.status === "online" ? cameraOnlineIcon : cameraOfflineIcon}
        >
          <Popup>
            <div className="space-y-2">
              <div className="font-semibold flex items-center gap-2">
                <Camera className="h-4 w-4" />
                {camera.name}
              </div>
              <p className="text-sm text-muted-foreground">{camera.location}</p>
              <Badge
                variant={camera.status === "online" ? "default" : "destructive"}
                className="text-xs"
              >
                {camera.status}
              </Badge>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}
