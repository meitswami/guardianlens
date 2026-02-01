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
import { FileText, Download, CalendarIcon, BarChart3, PieChart, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

const reportTypes = [
  {
    id: "daily-summary",
    name: "Daily Summary Report",
    description: "Overview of all activities for a specific day",
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
    icon: PieChart,
  },
];

export default function Reports() {
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({
    from: new Date(),
    to: new Date(),
  });
  const [exportFormat, setExportFormat] = useState("pdf");

  const handleGenerateReport = () => {
    // Mock report generation
    console.log("Generating report:", {
      type: selectedReport,
      dateRange,
      format: exportFormat,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Generate and export system reports
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
                  "cursor-pointer transition-colors hover:border-primary",
                  selectedReport === report.id && "border-primary bg-primary/5"
                )}
                onClick={() => setSelectedReport(report.id)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <report.icon className="h-5 w-5 text-primary" />
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
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange({ ...dateRange, from: date })}
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
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })}
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
                    <SelectItem value="csv">CSV Spreadsheet</SelectItem>
                    <SelectItem value="xlsx">Excel Workbook</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Generate Button */}
              <Button
                className="w-full"
                disabled={!selectedReport}
                onClick={handleGenerateReport}
              >
                <Download className="mr-2 h-4 w-4" />
                Generate Report
              </Button>
            </CardContent>
          </Card>

          {/* Recent Reports */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Reports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Daily Summary</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(Date.now() - i * 86400000), "MMM d, yyyy")}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline">PDF</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
