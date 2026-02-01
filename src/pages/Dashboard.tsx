import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Car,
  AlertTriangle,
  Camera,
  DoorOpen,
  TrendingUp,
  TrendingDown,
  Clock,
  Shield,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

interface DashboardStats {
  totalVehicles: number;
  activeViolations: number;
  onlineCameras: number;
  totalCameras: number;
  activeGates: number;
  totalGates: number;
  todayEntries: number;
}

const mockViolationTrend = [
  { day: "Mon", violations: 12 },
  { day: "Tue", violations: 19 },
  { day: "Wed", violations: 15 },
  { day: "Thu", violations: 22 },
  { day: "Fri", violations: 18 },
  { day: "Sat", violations: 8 },
  { day: "Sun", violations: 5 },
];

const mockViolationTypes = [
  { name: "Helmet", value: 35, color: "hsl(var(--chart-1))" },
  { name: "Seatbelt", value: 25, color: "hsl(var(--chart-2))" },
  { name: "Triple Riding", value: 20, color: "hsl(var(--chart-3))" },
  { name: "Mobile Phone", value: 15, color: "hsl(var(--chart-4))" },
  { name: "Other", value: 5, color: "hsl(var(--chart-5))" },
];

const mockHourlyTraffic = [
  { hour: "06", entries: 45, exits: 30 },
  { hour: "08", entries: 120, exits: 80 },
  { hour: "10", entries: 85, exits: 95 },
  { hour: "12", entries: 65, exits: 70 },
  { hour: "14", entries: 55, exits: 60 },
  { hour: "16", entries: 90, exits: 100 },
  { hour: "18", entries: 110, exits: 130 },
  { hour: "20", entries: 40, exits: 55 },
];

const chartConfig = {
  violations: { label: "Violations", color: "hsl(var(--chart-1))" },
  entries: { label: "Entries", color: "hsl(var(--chart-2))" },
  exits: { label: "Exits", color: "hsl(var(--chart-4))" },
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalVehicles: 0,
    activeViolations: 0,
    onlineCameras: 0,
    totalCameras: 0,
    activeGates: 0,
    totalGates: 0,
    todayEntries: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const [
        vehiclesRes,
        violationsRes,
        camerasRes,
        gatesRes,
        entriesRes,
      ] = await Promise.all([
        supabase.from("vehicles").select("id", { count: "exact", head: true }),
        supabase.from("violations").select("id", { count: "exact", head: true }).is("resolved_at", null),
        supabase.from("cameras").select("id, status"),
        supabase.from("gates").select("id, is_active"),
        supabase.from("gate_entry_logs").select("id", { count: "exact", head: true })
          .gte("logged_at", new Date().toISOString().split("T")[0]),
      ]);

      const onlineCameras = camerasRes.data?.filter((c) => c.status === "online").length || 0;
      const activeGates = gatesRes.data?.filter((g) => g.is_active).length || 0;

      setStats({
        totalVehicles: vehiclesRes.count || 0,
        activeViolations: violationsRes.count || 0,
        onlineCameras,
        totalCameras: camerasRes.data?.length || 0,
        activeGates,
        totalGates: gatesRes.data?.length || 0,
        todayEntries: entriesRes.count || 0,
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      title: "Total Vehicles",
      value: stats.totalVehicles,
      icon: Car,
      trend: "+12%",
      trendUp: true,
      description: "Registered in system",
    },
    {
      title: "Active Violations",
      value: stats.activeViolations,
      icon: AlertTriangle,
      trend: "-5%",
      trendUp: false,
      description: "Pending resolution",
      alert: stats.activeViolations > 10,
    },
    {
      title: "Cameras Online",
      value: `${stats.onlineCameras}/${stats.totalCameras}`,
      icon: Camera,
      progress: stats.totalCameras ? (stats.onlineCameras / stats.totalCameras) * 100 : 0,
      description: "Active surveillance",
    },
    {
      title: "Today's Entries",
      value: stats.todayEntries,
      icon: DoorOpen,
      trend: "+8%",
      trendUp: true,
      description: "Gate entries today",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time overview of traffic surveillance system
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className={stat.alert ? "border-destructive" : ""}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.alert ? "text-destructive" : "text-muted-foreground"}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend && (
                <div className="flex items-center gap-1 mt-1">
                  {stat.trendUp ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={`text-xs ${stat.trendUp ? "text-green-600" : "text-red-600"}`}>
                    {stat.trend}
                  </span>
                  <span className="text-xs text-muted-foreground">vs last week</span>
                </div>
              )}
              {stat.progress !== undefined && (
                <Progress value={stat.progress} className="mt-2 h-1" />
              )}
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 lg:grid-cols-7">
        {/* Violation trend */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Violations This Week</CardTitle>
            <CardDescription>Daily violation count trend</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <AreaChart data={mockViolationTrend}>
                <XAxis dataKey="day" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="violations"
                  stroke="hsl(var(--chart-1))"
                  fill="hsl(var(--chart-1))"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Violation types pie chart */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Violation Types</CardTitle>
            <CardDescription>Distribution by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px]">
              <PieChart>
                <Pie
                  data={mockViolationTypes}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {mockViolationTypes.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <ChartTooltip content={<ChartTooltipContent />} />
              </PieChart>
            </ChartContainer>
            <div className="flex flex-wrap gap-2 mt-4 justify-center">
              {mockViolationTypes.map((type) => (
                <Badge key={type.name} variant="outline" className="text-xs">
                  <span
                    className="w-2 h-2 rounded-full mr-1"
                    style={{ backgroundColor: type.color }}
                  />
                  {type.name}: {type.value}%
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Traffic flow chart */}
      <Card>
        <CardHeader>
          <CardTitle>Today's Traffic Flow</CardTitle>
          <CardDescription>Hourly gate entries and exits</CardDescription>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-[250px]">
            <BarChart data={mockHourlyTraffic}>
              <XAxis dataKey="hour" tickLine={false} axisLine={false} tickFormatter={(v) => `${v}:00`} />
              <YAxis tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="entries" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="exits" fill="hsl(var(--chart-4))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Quick actions */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>Current operational status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
              <span className="text-sm">All systems operational</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-sm">Security: Active</span>
            </div>
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {stats.onlineCameras} of {stats.totalCameras} cameras online
              </span>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {stats.activeGates} of {stats.totalGates} gates active
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
