import { Navigate, NavLink, Outlet, useLocation } from "react-router-dom";
import { Shield, LayoutGrid, ScanSearch, LogOut, Loader2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useV2Auth } from "../lib/auth";
import { v2Config } from "../config";

const nav = [
  { to: v2Config.basePath, label: "Overview", icon: LayoutGrid, end: true },
  { to: `${v2Config.basePath}/evidence`, label: "Evidence Lab", icon: ScanSearch, end: false },
];

export default function V2Layout() {
  const { session, role, loading, signOut } = useV2Auth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  if (!session) return <Navigate to={`${v2Config.basePath}/login`} state={{ from: location }} replace />;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b bg-card">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-3">
          <Shield className="h-5 w-5 text-primary shrink-0" />
          <span className="font-semibold tracking-tight">Guardian Lens</span>
          <Badge>v2</Badge>
          <nav className="ml-4 flex items-center gap-1 overflow-x-auto">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm whitespace-nowrap transition-colors",
                    isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground",
                  )
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden md:inline text-xs text-muted-foreground">
              {session.user.email}{role ? ` · ${role}` : ""}
            </span>
            {v2Config.sharedBackend && (
              <Button asChild variant="ghost" size="sm">
                <a href="/dashboard">v1 <ArrowUpRight className="h-3 w-3 ml-1" /></a>
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
