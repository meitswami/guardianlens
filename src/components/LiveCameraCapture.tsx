import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Camera, Loader2, CheckCircle, AlertTriangle, Wifi, WifiOff, Aperture, Timer,
} from "lucide-react";
import VideoFeed from "@/components/VideoFeed";

type CameraType = Tables<"cameras">;

interface CaptureItem {
  id: string;
  cameraId: string;
  cameraName: string;
  timestamp: string;
  status: "capturing" | "processing" | "done" | "error";
  result: any | null;
  error: string | null;
  durationMs: number | null;
}

export default function LiveCameraCapture() {
  const [cameras, setCameras] = useState<CameraType[]>([]);
  const [loading, setLoading] = useState(true);
  const [captures, setCaptures] = useState<CaptureItem[]>([]);
  const [capturingCameraIds, setCapturingCameraIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchOnlineCameras();
  }, []);

  const fetchOnlineCameras = async () => {
    try {
      const { data, error } = await supabase
        .from("cameras")
        .select("*")
        .eq("status", "online")
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

  const captureAndProcess = useCallback(async (camera: CameraType) => {
    if (capturingCameraIds.has(camera.id)) return;

    const captureId = `${Date.now()}-${camera.id.slice(0, 6)}`;
    const startTime = performance.now();

    setCapturingCameraIds(prev => new Set(prev).add(camera.id));
    setCaptures(prev => [{
      id: captureId,
      cameraId: camera.id,
      cameraName: camera.name,
      timestamp: new Date().toISOString(),
      status: "capturing",
      result: null,
      error: null,
      durationMs: null,
    }, ...prev]);

    try {
      // Create a placeholder image from the camera's simulated feed
      // In production this would grab an actual frame from RTSP/HLS
      // For now, we create a canvas snapshot and upload it
      const canvas = document.createElement("canvas");
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        // Draw a "captured frame" placeholder with camera info
        ctx.fillStyle = "#1a1a2e";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#00ff00";
        ctx.font = "14px monospace";
        ctx.fillText(`Camera: ${camera.name}`, 20, 30);
        ctx.fillText(`Location: ${camera.location}`, 20, 50);
        ctx.fillText(`Captured: ${new Date().toLocaleString()}`, 20, 70);
        ctx.fillStyle = "#ff0000";
        ctx.beginPath();
        ctx.arc(canvas.width - 20, 20, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#ffffff";
        ctx.font = "12px sans-serif";
        ctx.fillText("● LIVE CAPTURE", canvas.width - 120, 24);
      }

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("Canvas to blob failed")), "image/jpeg", 0.85);
      });

      // Upload to storage
      const fileName = `live-captures/${camera.id}/${Date.now()}.jpeg`;
      const { error: uploadError } = await supabase.storage.from("evidence").upload(fileName, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("evidence").getPublicUrl(fileName);

      setCaptures(prev => prev.map(c => c.id === captureId ? { ...c, status: "processing" } : c));

      // Process with AI
      const { data, error } = await supabase.functions.invoke("process-evidence", {
        body: { image_url: publicUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const elapsed = Math.round(performance.now() - startTime);
      setCaptures(prev => prev.map(c =>
        c.id === captureId ? { ...c, status: "done", result: data.result, durationMs: elapsed } : c
      ));

      const vehicleCount = data.result?.total_vehicles || 0;
      const violations = data.result?.vehicles_detected?.flatMap((v: any) => v.violations) || [];
      toast({
        title: `${camera.name}: Capture processed`,
        description: `${vehicleCount} vehicle(s), ${violations.length} violation(s) detected`,
      });
    } catch (e: any) {
      setCaptures(prev => prev.map(c =>
        c.id === captureId ? { ...c, status: "error", error: e.message } : c
      ));
      toast({ title: "Capture failed", description: e.message, variant: "destructive" });
    } finally {
      setCapturingCameraIds(prev => {
        const next = new Set(prev);
        next.delete(camera.id);
        return next;
      });
    }
  }, [capturingCameraIds, toast]);

  const captureAll = useCallback(() => {
    cameras.forEach(cam => captureAndProcess(cam));
  }, [cameras, captureAndProcess]);

  const onlineCount = cameras.length;

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="flex items-center gap-4 flex-wrap">
        <Badge variant="outline" className="gap-1.5 py-1">
          <Wifi className="h-3.5 w-3.5 text-green-500" />
          {onlineCount} Online Camera{onlineCount !== 1 ? "s" : ""}
        </Badge>
        {captures.length > 0 && (
          <Badge variant="secondary" className="gap-1.5 py-1">
            <Aperture className="h-3.5 w-3.5" />
            {captures.length} Capture{captures.length !== 1 ? "s" : ""}
          </Badge>
        )}
        {onlineCount > 1 && (
          <Button size="sm" onClick={captureAll} disabled={capturingCameraIds.size > 0}>
            {capturingCameraIds.size > 0 ? (
              <><Loader2 className="h-4 w-4 mr-1 animate-spin" /> Processing...</>
            ) : (
              <><Aperture className="h-4 w-4 mr-1" /> Capture All</>
            )}
          </Button>
        )}
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-muted-foreground" />
            <p className="text-muted-foreground mt-2">Loading online cameras...</p>
          </CardContent>
        </Card>
      ) : onlineCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <WifiOff className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium">No Online Cameras</p>
            <p className="text-sm text-muted-foreground mt-1">
              Set cameras to "Online" status in the Cameras page to enable live capture
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {cameras.map(camera => {
            const isCapturing = capturingCameraIds.has(camera.id);
            return (
              <Card key={camera.id} className="overflow-hidden">
                <VideoFeed
                  cameraId={camera.id}
                  cameraName={camera.name}
                  status={camera.status as "online" | "offline" | "maintenance"}
                  rtspUrl={camera.rtsp_url}
                />
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{camera.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{camera.location}</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => captureAndProcess(camera)}
                      disabled={isCapturing}
                    >
                      {isCapturing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <><Aperture className="h-4 w-4 mr-1" /> Capture</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Capture Results */}
      {captures.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Capture Results</CardTitle>
            <CardDescription>Recent captures from live cameras</CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className={captures.length > 5 ? "h-[300px]" : ""}>
              <div className="space-y-3">
                {captures.map(cap => (
                  <div key={cap.id} className="flex items-start gap-3 p-3 rounded-lg border">
                    <div className="mt-0.5">
                      {cap.status === "capturing" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                      {cap.status === "processing" && <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />}
                      {cap.status === "done" && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {cap.status === "error" && <AlertTriangle className="h-4 w-4 text-destructive" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{cap.cameraName}</p>
                        <Badge variant="outline" className="text-[10px] h-4 px-1">
                          {cap.status === "capturing" ? "Capturing..." :
                           cap.status === "processing" ? "AI Processing..." :
                           cap.status === "done" ? "Complete" : "Failed"}
                        </Badge>
                        {cap.durationMs && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Timer className="h-2.5 w-2.5" />{(cap.durationMs / 1000).toFixed(1)}s
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(cap.timestamp).toLocaleString()}
                      </p>
                      {cap.status === "done" && cap.result && (
                        <div className="mt-2 text-xs space-y-1">
                          <p>{cap.result.total_vehicles} vehicle(s) detected</p>
                          {cap.result.vehicles_detected?.map((v: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              {v.plate_number && (
                                <Badge variant="secondary" className="text-[10px]">{v.plate_number}</Badge>
                              )}
                              {v.violations?.map((vio: string, vi: number) => (
                                <Badge key={vi} variant="destructive" className="text-[10px]">{vio}</Badge>
                              ))}
                            </div>
                          ))}
                        </div>
                      )}
                      {cap.status === "error" && (
                        <p className="text-xs text-destructive mt-1">{cap.error}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
