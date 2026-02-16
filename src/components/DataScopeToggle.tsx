import { Button } from "@/components/ui/button";
import { Users, User } from "lucide-react";

interface DataScopeToggleProps {
  scope: "all" | "mine";
  onScopeChange: (scope: "all" | "mine") => void;
}

export default function DataScopeToggle({ scope, onScopeChange }: DataScopeToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted p-0.5">
      <Button
        variant={scope === "all" ? "default" : "ghost"}
        size="sm"
        className="gap-1.5 text-xs h-7 px-3"
        onClick={() => onScopeChange("all")}
      >
        <Users className="h-3.5 w-3.5" />
        All Data
      </Button>
      <Button
        variant={scope === "mine" ? "default" : "ghost"}
        size="sm"
        className="gap-1.5 text-xs h-7 px-3"
        onClick={() => onScopeChange("mine")}
      >
        <User className="h-3.5 w-3.5" />
        My Data
      </Button>
    </div>
  );
}
