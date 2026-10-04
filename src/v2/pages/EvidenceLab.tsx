import { useCallback, useRef, useState } from "react";
import {
  Upload, Camera, Loader2, CheckCircle2, AlertTriangle, XCircle, Download, Fingerprint, Copy, ShieldCheck, ShieldAlert, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { v2Config } from "../config";
import { useV2Auth } from "../lib/auth";
import { sha256Hex } from "../lib/hash";
import { errorMessage } from "../lib/errors";
import { frameFromImage, framesFromVideo, releaseFrames, type Frame } from "../lib/frames";
import { analyzeFrames, pendingResult, type FrameResult } from "../lib/analyze";
import { buildConsensus, type VehicleConsensus, type ViolationStatus } from "../lib/consensus";
import CameraCapture, { type Capture } from "../components/CameraCapture";

const VIOLATION_LABELS: Record<string, string> = {
  helmet: "No helmet",
  helmet_pillion: "No helmet (rider and pillion)",
  seatbelt: "No seatbelt",
  triple_riding: "Triple riding",
  mobile_phone: "Mobile phone use",
  wrong_way: "Wrong way",
  red_light: "Red light",
  illegal_parking: "Illegal parking",
  overloading: "Overloading",
  other: "Other",
};
const STATUS_LABEL: Record<ViolationStatus, string> = {
  confirmed: "Confirmed across frames",
  unconfirmed: "Not repeated: review",
  single_frame: "Single frame: review",
};
const MAX_FILE_MB = 200;
const MAX_PHOTOS_PER_INCIDENT = 5;

interface Run {
  id: string;
  name: string;
  source: "photo" | "photo set" | "video" | "camera";
  createdAt: string;
  sizeBytes: number | null;
  originalSha256: string | null;
  geo: Capture["geo"];
  frames: Frame[];
  results: FrameResult[];
  status: "preparing" | "analyzing" | "done" | "error";
  error: string | null;
  vehicles: VehicleConsensus[];
  totalMs: number | null;
}

const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const short = (hash: string) => (hash ? `${hash.slice(0, 10)}…${hash.slice(-6)}` : "");

export default function EvidenceLab() {
  const { session, role } = useV2Auth();
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [runs, setRuns] = useState<Run[]>([]);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sameIncident, setSameIncident] = useState(true);
  const [dragging, setDragging] = useState(false);

  const patch = useCallback((id: string, change: Partial<Run> | ((r: Run) => Partial<Run>)) => {
    setRuns((prev) => prev.map((r) => (r.id === id ? { ...r, ...(typeof change === "function" ? change(r) : change) } : r)));
  }, []);

  const execute = useCallback(async (
    base: Pick<Run, "name" | "source" | "sizeBytes" | "geo">,
    prepare: () => Promise<{ frames: Frame[]; originalSha256: string | null }>,
  ) => {
    const id = newId();
    const started = performance.now();
    setRuns((prev) => [{
      id, ...base, createdAt: new Date().toISOString(), originalSha256: null, frames: [], results: [],
      status: "preparing", error: null, vehicles: [], totalMs: null,
    }, ...prev]);
    try {
      const { frames, originalSha256 } = await prepare();
      if (!frames.length) throw new Error("No frames could be read from this file");
      patch(id, { frames, originalSha256, results: frames.map(pendingResult), status: "analyzing" });
      const results = await analyzeFrames(frames, id, (res) =>
        patch(id, (r) => ({ results: r.results.map((x) => (x.frameIndex === res.frameIndex ? res : x)) })),
      );
      const ok = results.filter((r) => r.status === "done");
      if (!ok.length) throw new Error(results[0]?.error ?? "AI analysis failed for every frame");
      const vehicles = buildConsensus(
        ok.map((r) => ({ frameIndex: r.frameIndex, vehicles: r.vehicles })),
        v2Config.confirmThreshold,
      );
      patch(id, { results, vehicles, status: "done", totalMs: Math.round(performance.now() - started) });
    } catch (e) {
      patch(id, { status: "error", error: errorMessage(e), totalMs: Math.round(performance.now() - started) });
    }
  }, [patch]);

  const addFiles = useCallback((list: FileList | File[]) => {
    const files = Array.from(list);
    const rejected = files.filter((f) => !/^(image|video)\//.test(f.type) || f.size > MAX_FILE_MB * 1024 * 1024);
    if (rejected.length) {
      toast({
        title: `${rejected.length} file(s) skipped`,
        description: `Only photos and videos up to ${MAX_FILE_MB} MB are accepted.`,
        variant: "destructive",
      });
    }
    const accepted = files.filter((f) => !rejected.includes(f));
    const videos = accepted.filter((f) => f.type.startsWith("video/"));
    const photos = accepted.filter((f) => f.type.startsWith("image/"));

    videos.forEach((file) =>
      execute({ name: file.name, source: "video", sizeBytes: file.size, geo: null }, async () => ({
        frames: await framesFromVideo(file, v2Config.framesPerVideo),
        originalSha256: await sha256Hex(file),
      })),
    );

    if (sameIncident && photos.length > 1) {
      const set = photos.slice(0, MAX_PHOTOS_PER_INCIDENT);
      if (photos.length > set.length) {
        toast({ title: "Photo set trimmed", description: `Only the first ${MAX_PHOTOS_PER_INCIDENT} photos are used for one incident.` });
      }
      execute(
        { name: `${set.length} photos of one incident`, source: "photo set", sizeBytes: set.reduce((s, f) => s + f.size, 0), geo: null },
        async () => ({ frames: await Promise.all(set.map(frameFromImage)), originalSha256: null }),
      );
    } else {
      photos.forEach((file) =>
        execute({ name: file.name, source: "photo", sizeBytes: file.size, geo: null }, async () => ({
          frames: [await frameFromImage(file)],
          originalSha256: await sha256Hex(file),
        })),
      );
    }
  }, [execute, sameIncident, toast]);

  const onCapture = (capture: Capture) =>
    execute(
      { name: "Field capture", source: "camera", sizeBytes: null, geo: capture.geo },
      async () => ({ frames: capture.frames, originalSha256: null }),
    );

  const removeRun = (run: Run) => {
    releaseFrames(run.frames);
    setRuns((prev) => prev.filter((r) => r.id !== run.id));
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Hash copied" });
    } catch {
      toast({ title: "Could not copy", variant: "destructive" });
    }
  };

  const download = (run: Run) => {
    const record = {
      schema: "guardianlens.evidence/v2",
      generatedAt: new Date().toISOString(),
      capturedAt: run.createdAt,
      operator: { id: session?.user.id ?? null, email: session?.user.email ?? null, role },
      source: { type: run.source, name: run.name, sizeBytes: run.sizeBytes, sha256: run.originalSha256, location: run.geo },
      frames: run.results.map((r) => ({
        index: r.frameIndex + 1, timeSec: r.timeSec, sha256: r.sha256, storagePath: r.storagePath,
        status: r.status, error: r.error, aiMs: r.ms, scene: r.scene, vehicles: r.vehicles,
      })),
      consensus: { confirmThreshold: v2Config.confirmThreshold, vehicles: run.vehicles },
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(record, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `evidence-${run.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Evidence Lab</h1>
        <p className="text-muted-foreground mt-1">
          Upload a video or photos. Each frame is analysed by AI and the results are cross-checked before anything is trusted.
        </p>
      </div>

      {role === "viewer" && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>Your account is view-only. Analysis needs an operator or admin account.</AlertDescription>
        </Alert>
      )}

      <Card
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}
        className={cn("border-dashed transition-colors", dragging && "border-primary bg-primary/5")}
      >
        <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div>
            <p className="font-medium">Drop photos or a video here</p>
            <p className="text-sm text-muted-foreground">
              Videos are sampled at {v2Config.framesPerVideo} frames. Up to {MAX_FILE_MB} MB per file.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button onClick={() => inputRef.current?.click()}><Upload className="h-4 w-4 mr-2" />Choose files</Button>
            <Button variant="outline" onClick={() => setCameraOpen(true)}><Camera className="h-4 w-4 mr-2" />Use camera</Button>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="same-incident" checked={sameIncident} onCheckedChange={setSameIncident} />
            <Label htmlFor="same-incident" className="text-sm text-muted-foreground">
              Treat photos selected together as one incident
            </Label>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,video/*"
            multiple
            className="hidden"
            onChange={(e) => { if (e.target.files?.length) addFiles(e.target.files); e.target.value = ""; }}
          />
        </CardContent>
      </Card>

      {runs.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-6">No evidence analysed yet in this session.</p>
      )}

      {runs.map((run) => (
        <RunCard key={run.id} run={run} onCopy={copy} onDownload={() => download(run)} onRemove={() => removeRun(run)} />
      ))}

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={onCapture} />
    </div>
  );
}

function RunCard({ run, onCopy, onDownload, onRemove }: {
  run: Run; onCopy: (t: string) => void; onDownload: () => void; onRemove: () => void;
}) {
  const busy = run.status === "preparing" || run.status === "analyzing";
  const done = run.results.filter((r) => r.status === "done" || r.status === "error").length;
  const failed = run.results.filter((r) => r.status === "error");

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base truncate">{run.name}</CardTitle>
            <CardDescription>
              {run.source} · {new Date(run.createdAt).toLocaleString()}
              {run.geo && ` · ${run.geo.lat.toFixed(5)}, ${run.geo.lng.toFixed(5)} (±${run.geo.accuracyM} m)`}
              {run.totalMs !== null && ` · ${(run.totalMs / 1000).toFixed(1)} s`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {run.status === "preparing" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Reading frames</Badge>}
            {run.status === "analyzing" && <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />AI {done}/{run.results.length}</Badge>}
            {run.status === "done" && <Badge><CheckCircle2 className="h-3 w-3 mr-1" />Analysed</Badge>}
            {run.status === "error" && <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>}
            {run.status === "done" && (
              <Button size="sm" variant="outline" onClick={onDownload}><Download className="h-4 w-4 mr-2" />Evidence record</Button>
            )}
            {!busy && (
              <Button size="icon" variant="ghost" onClick={onRemove} aria-label="Remove from list"><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {run.error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{run.error}</AlertDescription>
          </Alert>
        )}

        {run.frames.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {run.frames.map((frame, i) => {
              const res = run.results[i];
              return (
                <div key={i} className="relative shrink-0 w-36">
                  <img src={frame.previewUrl} alt={`Frame ${i + 1}`} className="h-20 w-36 rounded-md object-cover border" />
                  <span className="absolute left-1 top-1 rounded bg-black/70 px-1.5 text-[10px] text-white">
                    #{i + 1}{run.source === "video" ? ` · ${frame.timeSec.toFixed(1)}s` : ""}
                  </span>
                  <span className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white">
                    {res?.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />}
                    {res?.status === "error" && <XCircle className="h-3.5 w-3.5 text-red-400" />}
                    {(res?.status === "running" || res?.status === "pending") && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </span>
                  {res?.sha256 && (
                    <button
                      type="button"
                      onClick={() => onCopy(res.sha256)}
                      title="Copy frame SHA-256"
                      className="mt-1 flex w-full items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground"
                    >
                      <Fingerprint className="h-3 w-3 shrink-0" /><span className="truncate">{short(res.sha256)}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {run.originalSha256 && (
          <button
            type="button"
            onClick={() => onCopy(run.originalSha256!)}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Fingerprint className="h-3.5 w-3.5" />
            Original file SHA-256: <span className="font-mono">{short(run.originalSha256)}</span>
            <Copy className="h-3 w-3" />
          </button>
        )}

        {failed.length > 0 && run.status === "done" && (
          <p className="text-xs text-muted-foreground">
            {failed.length} of {run.results.length} frames could not be analysed ({failed[0].error}). Results use the remaining frames.
          </p>
        )}

        {run.status === "done" && run.vehicles.length === 0 && (
          <p className="text-sm text-muted-foreground">No vehicles were detected in this evidence.</p>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {run.vehicles.map((v) => <VehicleCard key={v.key} vehicle={v} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function VehicleCard({ vehicle: v }: { vehicle: VehicleConsensus }) {
  const tone = v.level === "high" ? "text-green-600 dark:text-green-400" : v.level === "review" ? "text-amber-600 dark:text-amber-400" : "text-red-600 dark:text-red-400";
  const details = [v.vehicleType.replace(/_/g, " "), v.color, [v.make, v.model].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-xl font-semibold tracking-wider break-all">{v.plateDisplay ?? "Plate not read"}</p>
          <p className="text-xs text-muted-foreground capitalize">{details}</p>
        </div>
        <div className="text-right shrink-0">
          <p className={cn("text-2xl font-semibold tabular-nums", tone)}>{v.score}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">consistency</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 text-xs">
        <Badge variant="outline">Seen in {v.sightings}/{v.totalFrames} frames</Badge>
        {v.identified && (
          <Badge variant="outline" className={v.plateValid ? "" : "border-destructive text-destructive"}>
            {v.plateValid ? <ShieldCheck className="h-3 w-3 mr-1" /> : <ShieldAlert className="h-3 w-3 mr-1" />}
            {v.plateValid ? (v.plateKind === "bharat" ? "Bharat series format" : `Valid format · ${v.stateCode}`) : "Format not valid"}
          </Badge>
        )}
        {v.identified && v.reads.length > 1 && (
          <Badge variant="outline">{Math.round(v.plateAgreement * 100)}% plate agreement</Badge>
        )}
      </div>

      {v.reads.length > 1 && v.plateAgreement < 1 && (
        <p className="font-mono text-[11px] text-muted-foreground break-all">
          Reads: {v.reads.map((r) => `#${r.frameIndex + 1} ${r.plate ?? "—"}`).join("  ")}
        </p>
      )}

      {v.violations.length === 0 ? (
        <p className="text-sm text-muted-foreground">No violation detected.</p>
      ) : (
        <ul className="space-y-2">
          {v.violations.map((x) => (
            <li key={x.type} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{VIOLATION_LABELS[x.type] ?? x.type}</span>
                <Badge variant={x.status === "confirmed" ? "default" : "secondary"}>{STATUS_LABEL[x.status]}</Badge>
                <span className="text-xs text-muted-foreground">frames {x.frames.map((f) => f + 1).join(", ")}</span>
              </div>
              {x.description && <p className="text-xs text-muted-foreground mt-0.5">{x.description}</p>}
            </li>
          ))}
        </ul>
      )}

      {v.flags.length > 0 && (
        <ul className="space-y-1 border-t pt-2">
          {v.flags.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0 text-amber-500" />{f}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
