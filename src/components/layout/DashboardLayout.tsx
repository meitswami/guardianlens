import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useRealtimeNotifications } from "@/hooks/useRealtimeNotifications";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import GlobalVehicleSearch from "@/components/GlobalVehicleSearch";
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
  Menu,
  ChevronLeft,
  Bell,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Car, label: "Vehicles", path: "/dashboard/vehicles" },
  { icon: AlertTriangle, label: "Violations", path: "/dashboard/violations" },
  { icon: Camera, label: "Cameras", path: "/dashboard/cameras" },
  { icon: DoorOpen, label: "Gates & Access", path: "/dashboard/gates" },
  { icon: Users, label: "Users", path: "/dashboard/users", adminOnly: true },
  { icon: FileText, label: "Reports", path: "/dashboard/reports" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export default function DashboardLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const { user, userRole, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Enable real-time notifications
  useRealtimeNotifications({
    onNewViolation: () => setNotificationCount((c) => c + 1),
    onNewGateEntry: () => {},
  });

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === "admin"
  );

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "U";

  const clearNotifications = () => {
    setNotificationCount(0);
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar */}
      <aside
        className={cn(
          "bg-sidebar-background text-sidebar-foreground flex flex-col transition-all duration-300 border-r border-sidebar-border fixed lg:relative h-screen z-40",
          collapsed ? "w-16" : "w-64"
        )}
      >
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sidebar-primary/20">
                <Shield className="h-5 w-5 text-sidebar-primary" />
              </div>
              <div>
                <span className="font-semibold text-sm block">Traffic System</span>
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

        {/* Collapse toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-3 top-6 h-6 w-6 rounded-full border bg-background shadow-md text-muted-foreground hover:text-foreground hidden lg:flex"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </Button>

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
                  onClick={() => navigate(item.path)}
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
              <Activity className="h-3 w-3 text-green-400" />
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
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
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
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-0">
        {/* Top header */}
        <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setCollapsed(!collapsed)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="hidden md:block">
              <h1 className="text-lg font-semibold">Traffic Surveillance System</h1>
              <p className="text-xs text-muted-foreground hidden lg:block">Government of India • Ministry of Road Transport</p>
            </div>
          </div>
          
          {/* Global Vehicle Search */}
          <div className="flex-1 max-w-md mx-4 hidden sm:block">
            <GlobalVehicleSearch />
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                  <Bell className="h-5 w-5" />
                  {notificationCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                    >
                      {notificationCount > 9 ? "9+" : notificationCount}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  Notifications
                  {notificationCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearNotifications}>
                      Clear all
                    </Button>
                  )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {notificationCount === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">
                    No new notifications
                  </div>
                ) : (
                  <div className="py-4 text-center text-muted-foreground text-sm">
                    {notificationCount} new notification{notificationCount !== 1 ? "s" : ""}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6 bg-muted/30">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
