import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useHiddenModules } from "@/hooks/useHiddenModules";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Shield,
  LayoutDashboard,
  Car,
  AlertTriangle,
  Camera,
  DoorOpen,
  Users,
  FileText,
  Settings,
  LogOut,
  Activity,
  Upload,
  IndianRupee,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Upload, label: "Upload & Process", path: "/dashboard/upload" },
  { icon: Car, label: "Vehicles", path: "/dashboard/vehicles" },
  { icon: AlertTriangle, label: "Violations", path: "/dashboard/violations" },
  { icon: Receipt, label: "eChallans", path: "/dashboard/challans" },
  { icon: IndianRupee, label: "Fines Master", path: "/dashboard/fines" },
  { icon: Camera, label: "Cameras", path: "/dashboard/cameras" },
  { icon: DoorOpen, label: "Gates & Access", path: "/dashboard/gates" },
  { icon: Users, label: "Users", path: "/dashboard/users", adminOnly: true },
  { icon: FileText, label: "Reports", path: "/dashboard/reports" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

interface SidebarContentProps {
  collapsed?: boolean;
  onNavigate?: () => void;
}

export default function SidebarContent({ collapsed = false, onNavigate }: SidebarContentProps) {
  const { user, userRole, signOut } = useAuth();
  const { hiddenModules } = useHiddenModules();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNavItems = navItems.filter(
    (item) => (!item.adminOnly || userRole === "admin") && !hiddenModules.includes(item.path)
  );

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U";

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-sidebar-primary/20">
              <Shield className="h-5 w-5 text-sidebar-primary" />
            </div>
            <div>
              <span className="font-semibold text-sm block">GUARDIAN LENS</span>
              <span className="text-[10px] text-sidebar-foreground/60">Surveillance Portal</span>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="mx-auto p-1.5 rounded-lg bg-sidebar-primary/20">
            <Shield className="h-5 w-5 text-sidebar-primary" />
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="space-y-1 px-2">
          {filteredNavItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Button
                key={item.path}
                variant="ghost"
                className={cn(
                  "w-full justify-start gap-3 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-all",
                  isActive && "bg-sidebar-accent text-sidebar-primary font-medium",
                  collapsed && "justify-center px-2"
                )}
                onClick={() => handleNavigate(item.path)}
                title={collapsed ? item.label : undefined}
              >
                <item.icon className={cn("h-5 w-5 shrink-0", isActive && "text-sidebar-primary")} />
                {!collapsed && <span>{item.label}</span>}
              </Button>
            );
          })}
        </nav>
      </ScrollArea>

      {/* Status indicator */}
      {!collapsed && (
        <div className="px-4 py-2 border-t border-sidebar-border">
          <div className="flex items-center gap-2 text-xs text-sidebar-foreground/60">
            <Activity className="h-3 w-3 text-emerald-500" />
            <span>System Online</span>
          </div>
        </div>
      )}

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                collapsed && "justify-center px-2"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground text-xs font-medium">
                  {userInitials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="flex-1 text-left overflow-hidden">
                  <p className="text-sm font-medium truncate">{user?.email?.split("@")[0]}</p>
                  <p className="text-xs text-sidebar-foreground/60 capitalize">{userRole}</p>
                </div>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <p className="font-medium">{user?.email?.split("@")[0]}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleNavigate("/dashboard/settings")}>
              <Settings className="mr-2 h-4 w-4" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
