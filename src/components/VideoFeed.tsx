import { useState, useEffect, useRef, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX, Maximize2, RefreshCw, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import Hls from "hls.js";

interface VideoFeedProps {
  cameraId: string;
  cameraName: string;
  status: "online" | "offline" | "maintenance";
  rtspUrl?: string | null;
  hlsUrl?: string | null;
  className?: string;
}

export default function VideoFeed({ 
  cameraId, 
  cameraName, 
  status, 
  rtspUrl, 
  hlsUrl,
  className 
}: VideoFeedProps) {
  const [isPlaying, setIsPlaying] = useState(status === "online");
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [streamError, setStreamError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const animationRef = useRef<number>();

  // Check if we have a valid HLS stream URL
  const hasHlsStream = !!hlsUrl;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Initialize HLS.js player
  const initHlsPlayer = useCallback(() => {
    if (!hlsUrl || !videoRef.current) return;

    setIsLoading(true);
    setStreamError(null);

    // Cleanup existing instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });

      hls.loadSource(hlsUrl);
      hls.attachMedia(videoRef.current);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false);
        if (isPlaying && videoRef.current) {
          videoRef.current.play().catch(console.error);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          setStreamError(`Stream error: ${data.type}`);
          setIsLoading(false);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.error("Network error - attempting recovery");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.error("Media error - attempting recovery");
              hls.recoverMediaError();
              break;
            default:
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (videoRef.current.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      videoRef.current.src = hlsUrl;
      videoRef.current.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        if (isPlaying) {
          videoRef.current?.play().catch(console.error);
        }
      });
    }
  }, [hlsUrl, isPlaying]);

  // Initialize player when URL changes or status becomes online
  useEffect(() => {
    if (hasHlsStream && status === "online") {
      initHlsPlayer();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [hasHlsStream, status, initHlsPlayer]);

  // Handle play/pause
  useEffect(() => {
    if (videoRef.current && hasHlsStream) {
      if (isPlaying) {
        videoRef.current.play().catch(console.error);
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, hasHlsStream]);

  // Handle mute/unmute
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Simulated video for cameras without HLS stream
  useEffect(() => {
    if (hasHlsStream || !isPlaying || status !== "online" || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const animate = () => {
      const imageData = ctx.createImageData(canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const noise = Math.random() * 30;
        const baseColor = 40 + noise;
        data[i] = baseColor;
        data[i + 1] = baseColor + 10;
        data[i + 2] = baseColor + 20;
        data[i + 3] = 255;
      }

      ctx.putImageData(imageData, 0, 0);

      // Timestamp overlay
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, canvas.height - 30, canvas.width, 30);
      ctx.fillStyle = "#00ff00";
      ctx.font = "12px monospace";
      ctx.fillText(
        `${cameraName} | ${currentTime.toLocaleString()}`,
        10,
        canvas.height - 10
      );

      // REC indicator
      ctx.fillStyle = "#ff0000";
      ctx.beginPath();
      ctx.arc(canvas.width - 20, 20, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.font = "10px sans-serif";
      ctx.fillText("REC", canvas.width - 45, 24);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [hasHlsStream, isPlaying, status, cameraName, currentTime]);

  const handleRefresh = () => {
    if (hasHlsStream) {
      initHlsPlayer();
    }
  };

  const handleFullscreen = () => {
    const container = videoRef.current || canvasRef.current;
    if (container) {
      container.requestFullscreen?.();
    }
  };

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
    if (streamError && hasHlsStream) {
      return (
        <div className="absolute inset-0 bg-red-900/80 flex flex-col items-center justify-center text-white">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p className="text-sm font-medium">Stream Error</p>
          <p className="text-xs text-red-200 mt-1">{streamError}</p>
          <Button 
            size="sm" 
            variant="outline" 
            className="mt-3 text-white border-white hover:bg-white/20"
            onClick={handleRefresh}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      );
    }
    if (isLoading && hasHlsStream) {
      return (
        <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2" />
          <p className="text-sm">Connecting to stream...</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={cn("relative group", className)}>
      <div className="aspect-video bg-black rounded-lg overflow-hidden relative">
        {status === "online" ? (
          hasHlsStream ? (
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted={isMuted}
              playsInline
              autoPlay={isPlaying}
            />
          ) : (
            <canvas
              ref={canvasRef}
              width={320}
              height={180}
              className="w-full h-full object-cover"
            />
          )
        ) : (
          <div className="w-full h-full bg-gray-900" />
        )}
        
        {getStatusOverlay()}

        {/* Controls overlay */}
        {status === "online" && !streamError && (
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
                  onClick={handleRefresh}
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-white hover:bg-white/20"
                  onClick={handleFullscreen}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Live indicator with timestamp */}
        {status === "online" && hasHlsStream && !streamError && !isLoading && (
          <div className="absolute bottom-8 left-2 right-2 flex items-center justify-between text-xs text-white/80 font-mono">
            <span>{cameraName}</span>
            <span>{currentTime.toLocaleTimeString()}</span>
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

        {/* Stream type indicator */}
        {status === "online" && (
          <Badge
            variant="outline"
            className="absolute top-2 right-2 text-xs text-white border-white/50 bg-black/30"
          >
            {hasHlsStream ? "HLS" : "SIM"}
          </Badge>
        )}
      </div>
    </div>
  );
}
