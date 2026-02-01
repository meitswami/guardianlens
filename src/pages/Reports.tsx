import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Download, CalendarIcon, BarChart3, PieChart, TrendingUp, Camera, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  fetchViolationsReport,
  fetchVehicleActivityReport,
  fetchDailySummaryReport,
  fetchCameraStatusReport,
  generatePDF,
  generateExcel,
  type ReportData,
} from "@/lib/reportGenerator";

const reportTypes = [
  {
    id: "daily-summary",
    name: "Daily Summary Report",
    description: "Overview of all activities for a specific period",
    icon: BarChart3,
  },
  {
    id: "violations",
    name: "Violations Report",
    description: "Detailed list of all violations with filters",
    icon: FileText,
  },
  {
    id: "vehicle-activity",
    name: "Vehicle Activity Report",
    description: "Entry/exit logs and vehicle movements",
    icon: TrendingUp,
  },
  {
    id: "camera-status",
    name: "Camera Status Report",
    description: "Camera uptime and status history",
    icon: Camera,
  },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
    to: new Date(),
  });
  const [exportFormat, setExportFormat] = useState("pdf");
  const [isGenerating, setIsGenerating] = useState(false);
  const [recentReports, setRecentReports] = useState<Array<{ title: string; format: string; date: Date }>>([]);
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    if (!selectedReport || !dateRange.from || !dateRange.to) {
      toast({ title: "Please select a report type and date range", variant: "destructive" });
      return;
    }

    setIsGenerating(true);

    try {
      let reportData: ReportData;

      switch (selectedReport) {
        case "violations":
          reportData = await fetchViolationsReport({ from: dateRange.from, to: dateRange.to });
          break;
        case "vehicle-activity":
          reportData = await fetchVehicleActivityReport({ from: dateRange.from, to: dateRange.to });
          break;
        case "daily-summary":
          reportData = await fetchDailySummaryReport({ from: dateRange.from, to: dateRange.to });
          break;
        case "camera-status":
          reportData = await fetchCameraStatusReport();
          break;
        default:
          throw new Error("Unknown report type");
      }

      if (reportData.data.length === 0) {
        toast({ title: "No data found for the selected period", variant: "destructive" });
        return;
      }

      if (exportFormat === "pdf") {
        generatePDF(reportData, selectedReport);
      } else {
        generateExcel(reportData, selectedReport);
      }

      // Add to recent reports
      setRecentReports((prev) => [
        { title: reportData.title, format: exportFormat.toUpperCase(), date: new Date() },
        ...prev.slice(0, 4),
      ]);

      toast({ title: "Report generated successfully", description: `${reportData.title} exported as ${exportFormat.toUpperCase()}` });
    } catch (error: any) {
      console.error("Error generating report:", error);
      toast({ title: "Error generating report", description: error.message, variant: "destructive" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export system reports with real data
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Report Types */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-semibold">Select Report Type</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {reportTypes.map((report) => (
              <Card
                key={report.id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary hover:shadow-md",
                  selectedReport === report.id && "border-primary bg-primary/5 ring-1 ring-primary"
                )}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "p-2 rounded-lg",
                      selectedReport === report.id ? "bg-primary text-primary-foreground" : "bg-muted"
                    )}>
                      <report.icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-base">{report.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>{report.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Report Options */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Report Options</h2>
          <Card>
            <CardContent className="pt-6 space-y-4">
              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <div className="flex flex-col gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP") : "From date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP") : "To date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Export Format */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Export Format</label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF Document</SelectItem>
                    <SelectItem value="xlsx">Excel Workbook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                disabled={!selectedReport || isGenerating}
                onClick={handleGenerateReport}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Generate Report
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {recentReports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reports generated yet
                </p>
              ) : (
                recentReports.map((report, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{report.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {format(report.date, "MMM d, yyyy HH:mm")}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">{report.format}</Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
