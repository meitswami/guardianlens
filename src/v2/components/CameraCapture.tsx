import { useEffect, useRef, useState } from "react";
import { Aperture, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { errorMessage } from "../lib/errors";
import { frameFromVideoElement, type Frame } from "../lib/frames";

const BURST = 3;
const GAP_MS = 400;

export interface Capture {
  frames: Frame[];
  geo: { lat: number; lng: number; accuracyM: number } | null;
}

function locate(): Promise<Capture["geo"]> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, accuracyM: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 },
    );
  });
}

export default function CameraCapture({ open, onClose, onCapture }: {
  open: boolean;
  onClose: () => void;
  onCapture: (capture: Capture) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let cancelled = false;
    setError(null);
    setReady(false);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot open the camera. Use a secure (https) page.");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 } }, audio: false })
      .then((s) => {
        if (cancelled) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => undefined);
        }
      })
      .catch(() => setError("Camera permission was denied or no camera was found."));
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [open]);

  const capture = async () => {
    const video = videoRef.current;
    if (!video) return;
    setBusy(true);
    try {
      const geoPromise = locate();
      const frames: Frame[] = [];
      for (let i = 0; i < BURST; i++) {
        if (i) await new Promise((r) => setTimeout(r, GAP_MS));
        frames.push(await frameFromVideoElement(video, (i * GAP_MS) / 1000));
      }
      onCapture({ frames, geo: await geoPromise });
      onClose();
    } catch (e) {
      setError(errorMessage(e, "Capture failed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Field capture</DialogTitle>
          <DialogDescription>Takes {BURST} frames in a quick burst so the AI can cross-check them.</DialogDescription>
        </DialogHeader>
        <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
          <video ref={videoRef} className="h-full w-full object-contain" muted playsInline onLoadedData={() => setReady(true)} />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={capture} disabled={!ready || busy || !!error}>
            {busy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Aperture className="h-4 w-4 mr-2" />}
            Capture burst
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
