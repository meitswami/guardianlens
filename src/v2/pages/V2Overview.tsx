import { Link } from "react-router-dom";
import { ScanSearch, Camera, Fingerprint, ClipboardCheck, PenTool, MessageSquareText, Cpu, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { v2Config } from "../config";

const live = [
  { icon: ScanSearch, title: "Multi-frame AI analysis", text: "Videos and photo sets are analysed frame by frame, then cross-checked." },
  { icon: Camera, title: "Field capture", text: "Capture a burst from the device camera with time and location." },
  { icon: Fingerprint, title: "Evidence fingerprint", text: "Every file and frame gets a SHA-256 hash and a downloadable record." },
];
const next = [
  { icon: ClipboardCheck, title: "Officer review queue" },
  { icon: PenTool, title: "Camera zone editor" },
  { icon: MessageSquareText, title: "AI assistant search" },
  { icon: Cpu, title: "Live video engine (VPS)" },
];

export default function V2Overview() {
  let host = v2Config.supabaseUrl;
  try { host = new URL(v2Config.supabaseUrl).host; } catch { /* keep raw value */ }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Guardian Lens v2</h1>
          <p className="text-muted-foreground mt-1">AI that checks itself before a challan is raised.</p>
        </div>
        <Button asChild>
          <Link to={`${v2Config.basePath}/evidence`}>Open Evidence Lab <ArrowRight className="h-4 w-4 ml-2" /></Link>
        </Button>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Available now</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {live.map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardHeader className="pb-2">
                <Icon className="h-5 w-5 text-primary mb-2" />
                <CardTitle className="text-base">{title}</CardTitle>
              </CardHeader>
              <CardContent><CardDescription>{text}</CardDescription></CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">In development</h2>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {next.map(({ icon: Icon, title }) => (
            <div key={title} className="flex items-center gap-3 rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
              <Icon className="h-4 w-4 shrink-0" />
              {title}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Configuration</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">Backend: {host || "not set"}</Badge>
          <Badge variant="outline">{v2Config.sharedBackend ? "Shared with v1" : "Dedicated v2 backend"}</Badge>
          <Badge variant="outline">Frames per video: {v2Config.framesPerVideo}</Badge>
          <Badge variant="outline">Confirm threshold: {Math.round(v2Config.confirmThreshold * 100)}%</Badge>
        </div>
      </section>
    </div>
  );
}
