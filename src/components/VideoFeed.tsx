import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize2, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface VideoFeedProps {
  cameraId: string;
  cameraName: string;
  status: "online" | "offline" | "maintenance";
  rtspUrl?: string | null;
  className?: string;
}

// Simulated video frames for demo (gradient animation)
export default function VideoFeed({ cameraId, cameraName, status, rtspUrl, className }: VideoFeedProps) {
  const [isPlaying, setIsPlaying] = useState(status === "online");
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();

  useEffect(() => {
    // Update timestamp every second
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!isPlaying || status !== "online" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let hue = 0;
    const animate = () => {
      // Create a simulated video feed effect with noise
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        // Add some noise and color variation to simulate video
        const noise = Math.random() * 30;
        const baseColor = 40 + noise;
        data[i] = baseColor; // R
        data[i + 1] = baseColor + 10; // G
        data[i + 2] = baseColor + 20; // B
        data[i + 3] = 255; // A
      }

      ctx.putImageData(imageData, 0, 0);

      // Add timestamp overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = "#00ff00";
      ctx.font = "12px monospace";
      ctx.fillText(
        `${cameraName} | ${currentTime.toLocaleString()}`,
        10,
        canvas.height - 10
      );

      // Add REC indicator
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(canvas.width - 20, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.fillText("REC", canvas.width - 45, 24);

      hue = (hue + 1) % 360;
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, status, cameraName, currentTime]);

  const getStatusOverlay = () => {
    if (status === "offline") {
      return (
        <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center text-white">
          <div className="text-4xl mb-2">📷</div>
          <p className="text-sm font-medium">Camera Offline</p>
          <p className="text-xs text-gray-400 mt-1">No signal</p>
        </div>
      );
    }
    if (status === "maintenance") {
      return (
        <div className="absolute inset-0 bg-yellow-900/80 flex flex-col items-center justify-center text-white">
          <div className="text-4xl mb-2">🔧</div>
          <p className="text-sm font-medium">Under Maintenance</p>
          <p className="text-xs text-yellow-200 mt-1">Please wait...</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("relative group", className)}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        {status === "online" ? (
          <canvas
            ref={canvasRef}
            width={320}
            height={180}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gray-900" />
        )}
        
        {getStatusOverlay()}

        {/* Controls overlay */}
        {status === "online" && (
          <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => setIsPlaying(!isPlaying)}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={() => setIsMuted(!isMuted)}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Status badge */}
        <Badge
          className={cn(
            "absolute top-2 left-2 text-xs",
            status === "online" && "bg-green-600 hover:bg-green-600",
            status === "offline" && "bg-red-600 hover:bg-red-600",
            status === "maintenance" && "bg-yellow-600 hover:bg-yellow-600"
          )}
        >
          {status === "online" && "● LIVE"}
          {status === "offline" && "● OFFLINE"}
          {status === "maintenance" && "● MAINTENANCE"}
        </Badge>
      </div>
    </div>
  );
}
