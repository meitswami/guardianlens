import { useEffect, useState, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Camera, MapPin } from "lucide-react";

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
const createIcon = (color: string, isCamera: boolean) => {
  const svg = isCamera
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
        <circle cx="12" cy="12" r="10" fill="${color}"/>
        <path d="M15 8v8l-5-4 5-4z" fill="white"/>
        <rect x="6" y="9" width="4" height="6" rx="1" fill="white"/>
      </svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="32" height="32">
        <circle cx="12" cy="12" r="10" fill="${color}"/>
        <rect x="8" y="6" width="8" height="12" rx="1" fill="white"/>
        <circle cx="14" cy="12" r="1" fill="${color}"/>
      </svg>`;

  return L.icon({
    iconUrl: "data:image/svg+xml," + encodeURIComponent(svg),
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

interface LocationMapProps {
  className?: string;
}

export default function LocationMap({ className }: LocationMapProps) {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [gates, setGates] = useState<GateType[]>([]);
  const [loading, setLoading] = useState(true);
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Initialize map with vanilla Leaflet
  useEffect(() => {
    if (loading || !containerRef.current || mapRef.current) return;

    const camerasWithCoords = cameras.filter((c) => c.latitude && c.longitude);
    const defaultCenter: [number, number] = camerasWithCoords.length > 0
      ? [Number(camerasWithCoords[0].latitude), Number(camerasWithCoords[0].longitude)]
      : [19.076, 72.8777]; // Mumbai default

    // Create map
    const map = L.map(containerRef.current).setView(defaultCenter, 15);
    mapRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Add camera markers
    camerasWithCoords.forEach((camera) => {
      const icon = createIcon(
        camera.status === "online" ? "#16a34a" : "#dc2626",
        true
      );

      const marker = L.marker(
        [Number(camera.latitude), Number(camera.longitude)],
        { icon }
      ).addTo(map);

      marker.bindPopup(`
        <div style="min-width: 150px;">
          <strong>${camera.name}</strong>
          <p style="margin: 4px 0; color: #666; font-size: 12px;">${camera.location}</p>
          <span style="
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            background: ${camera.status === "online" ? "#16a34a" : "#dc2626"};
            color: white;
          ">${camera.status}</span>
        </div>
      `);
    });

    // Fit bounds if we have markers
    if (camerasWithCoords.length > 1) {
      const bounds = L.latLngBounds(
        camerasWithCoords.map((c) => [Number(c.latitude), Number(c.longitude)])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    // Cleanup
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [loading, cameras, gates]);

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-[400px]">
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-5 w-5 animate-pulse" />
            Loading map...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Camera & Gate Locations
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div 
          ref={containerRef} 
          className="h-[400px] rounded-b-lg overflow-hidden"
          style={{ zIndex: 0 }}
        />
        
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
