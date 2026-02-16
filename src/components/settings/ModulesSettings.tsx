import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useHiddenModules } from "@/hooks/useHiddenModules";
import { useToast } from "@/hooks/use-toast";
import {
  LayoutDashboard, Upload, Car, AlertTriangle, Receipt,
  IndianRupee, Camera, DoorOpen, Users, FileText, Settings,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const allModules = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard, locked: true },
  { path: "/dashboard/upload", label: "Upload & Process", icon: Upload },
  { path: "/dashboard/vehicles", label: "Vehicles", icon: Car },
  { path: "/dashboard/violations", label: "Violations", icon: AlertTriangle },
  { path: "/dashboard/challans", label: "eChallans", icon: Receipt },
  { path: "/dashboard/fines", label: "Fines Master", icon: IndianRupee },
  { path: "/dashboard/cameras", label: "Cameras", icon: Camera },
  { path: "/dashboard/gates", label: "Gates & Access", icon: DoorOpen },
  { path: "/dashboard/users", label: "Users", icon: Users },
  { path: "/dashboard/reports", label: "Reports", icon: FileText },
  { path: "/dashboard/settings", label: "Settings", icon: Settings, locked: true },
];

export default function ModulesSettings() {
  const { hiddenModules, isLoading, setHiddenModules } = useHiddenModules();
  const { toast } = useToast();

  const toggleModule = async (path: string, visible: boolean) => {
    const updated = visible
      ? hiddenModules.filter((p) => p !== path)
      : [...hiddenModules, path];
    try {
      await setHiddenModules(updated);
      toast({ title: visible ? "Module enabled" : "Module hidden" });
    } catch {
      toast({ title: "Error updating module visibility", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72 mt-1" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sidebar Modules</CardTitle>
        <CardDescription>
          Show or hide modules from the sidebar navigation. Dashboard and Settings cannot be hidden.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {allModules.map((mod) => {
          const isVisible = !hiddenModules.includes(mod.path);
          return (
            <div
              key={mod.path}
              className="flex items-center justify-between py-3 px-3 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <mod.icon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{mod.label}</p>
                  <p className="text-xs text-muted-foreground">{mod.path}</p>
                </div>
              </div>
              <Switch
                checked={isVisible}
                onCheckedChange={(checked) => toggleModule(mod.path, checked)}
                disabled={mod.locked}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
