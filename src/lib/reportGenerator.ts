import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Database } from "@/integrations/supabase/types";

type ViolationType = Database["public"]["Enums"]["violation_type"];

const violationTypeLabels: Record<ViolationType, string> = {
  helmet: "No Helmet",
  seatbelt: "No Seatbelt",
  triple_riding: "Triple Riding",
  mobile_phone: "Mobile Phone Usage",
  wrong_way: "Wrong Way",
  red_light: "Red Light",
  illegal_parking: "Illegal Parking",
  overloading: "Overloading",
  other: "Other",
};

export interface ReportDateRange {
  from: Date;
  to: Date;
}

export interface ReportData {
  title: string;
  dateRange: ReportDateRange;
  generatedAt: Date;
  data: any[];
}

// Fetch violations data
export async function fetchViolationsReport(dateRange: ReportDateRange): Promise<ReportData> {
  const { data, error } = await supabase
    .from("violations")
    .select("*, vehicle:vehicles(plate_number)")
    .gte("detected_at", dateRange.from.toISOString())
    .lte("detected_at", dateRange.to.toISOString())
    .order("detected_at", { ascending: false });

  if (error) throw error;

  return {
    title: "Violations Report",
    dateRange,
    generatedAt: new Date(),
    data: data || [],
  };
}

// Fetch vehicle activity data
export async function fetchVehicleActivityReport(dateRange: ReportDateRange): Promise<ReportData> {
  const { data, error } = await supabase
    .from("gate_entry_logs")
    .select("*, gate:gates(name)")
    .gte("logged_at", dateRange.from.toISOString())
    .lte("logged_at", dateRange.to.toISOString())
    .order("logged_at", { ascending: false });

  if (error) throw error;

  return {
    title: "Vehicle Activity Report",
    dateRange,
    generatedAt: new Date(),
    data: data || [],
  };
}

// Fetch daily summary data
export async function fetchDailySummaryReport(dateRange: ReportDateRange): Promise<ReportData> {
  const [violationsRes, entriesRes, vehiclesRes, camerasRes] = await Promise.all([
    supabase
      .from("violations")
      .select("id, violation_type, severity, resolved_at")
      .gte("detected_at", dateRange.from.toISOString())
      .lte("detected_at", dateRange.to.toISOString()),
    supabase
      .from("gate_entry_logs")
      .select("id, action")
      .gte("logged_at", dateRange.from.toISOString())
      .lte("logged_at", dateRange.to.toISOString()),
    supabase.from("vehicles").select("id, is_blacklisted"),
    supabase.from("cameras").select("id, status"),
  ]);

  const violations = violationsRes.data || [];
  const entries = entriesRes.data || [];
  const vehicles = vehiclesRes.data || [];
  const cameras = camerasRes.data || [];

  const summary = {
    totalViolations: violations.length,
    resolvedViolations: violations.filter((v) => v.resolved_at).length,
    pendingViolations: violations.filter((v) => !v.resolved_at).length,
    violationsByType: violations.reduce((acc, v) => {
      acc[v.violation_type] = (acc[v.violation_type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>),
    totalEntries: entries.filter((e) => e.action === "entry").length,
    totalExits: entries.filter((e) => e.action === "exit").length,
    deniedAccess: entries.filter((e) => e.action === "denied").length,
    totalVehicles: vehicles.length,
    blacklistedVehicles: vehicles.filter((v) => v.is_blacklisted).length,
    onlineCameras: cameras.filter((c) => c.status === "online").length,
    totalCameras: cameras.length,
  };

  return {
    title: "Daily Summary Report",
    dateRange,
    generatedAt: new Date(),
    data: [summary],
  };
}

// Fetch camera status data
export async function fetchCameraStatusReport(): Promise<ReportData> {
  const { data, error } = await supabase
    .from("cameras")
    .select("*")
    .order("name");

  if (error) throw error;

  return {
    title: "Camera Status Report",
    dateRange: { from: new Date(), to: new Date() },
    generatedAt: new Date(),
    data: data || [],
  };
}

// Generate PDF report
export function generatePDF(report: ReportData, reportType: string): void {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(30, 58, 95);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.text("Traffic Surveillance System", pageWidth / 2, 18, { align: "center" });
  doc.setFontSize(14);
  doc.text(report.title, pageWidth / 2, 30, { align: "center" });

  // Reset text color
  doc.setTextColor(0, 0, 0);

  // Date range info
  doc.setFontSize(10);
  doc.text(
    `Period: ${format(report.dateRange.from, "MMM d, yyyy")} - ${format(report.dateRange.to, "MMM d, yyyy")}`,
    14,
    50
  );
  doc.text(`Generated: ${format(report.generatedAt, "MMM d, yyyy HH:mm")}`, 14, 56);

  // Generate table based on report type
  let tableData: any[][] = [];
  let tableHeaders: string[] = [];

  switch (reportType) {
    case "violations":
      tableHeaders = ["Date", "Plate Number", "Type", "Severity", "Status", "Fine"];
      tableData = report.data.map((v) => [
        format(new Date(v.detected_at), "MMM d, yyyy HH:mm"),
        v.vehicle?.plate_number || "Unknown",
        violationTypeLabels[v.violation_type as ViolationType] || v.violation_type,
        v.severity || "medium",
        v.resolved_at ? "Resolved" : "Pending",
        v.fine_amount ? `₹${v.fine_amount}` : "-",
      ]);
      break;

    case "vehicle-activity":
      tableHeaders = ["Date", "Gate", "Plate Number", "Action"];
      tableData = report.data.map((e) => [
        format(new Date(e.logged_at), "MMM d, yyyy HH:mm"),
        e.gate?.name || "Unknown",
        e.plate_number,
        e.action.charAt(0).toUpperCase() + e.action.slice(1),
      ]);
      break;

    case "daily-summary":
      const summary = report.data[0];
      tableHeaders = ["Metric", "Value"];
      tableData = [
        ["Total Violations", summary.totalViolations.toString()],
        ["Resolved Violations", summary.resolvedViolations.toString()],
        ["Pending Violations", summary.pendingViolations.toString()],
        ["Total Entries", summary.totalEntries.toString()],
        ["Total Exits", summary.totalExits.toString()],
        ["Denied Access", summary.deniedAccess.toString()],
        ["Total Vehicles", summary.totalVehicles.toString()],
        ["Blacklisted Vehicles", summary.blacklistedVehicles.toString()],
        ["Cameras Online", `${summary.onlineCameras}/${summary.totalCameras}`],
      ];
      break;

    case "camera-status":
      tableHeaders = ["Name", "Location", "Status", "Last Updated"];
      tableData = report.data.map((c) => [
        c.name,
        c.location,
        c.status.charAt(0).toUpperCase() + c.status.slice(1),
        format(new Date(c.updated_at), "MMM d, yyyy HH:mm"),
      ]);
      break;
  }

  autoTable(doc, {
    head: [tableHeaders],
    body: tableData,
    startY: 65,
    theme: "striped",
    headStyles: { fillColor: [30, 58, 95] },
    styles: { fontSize: 9 },
  });

  // Footer
  const pageCount = doc.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128);
    doc.text(
      `Page ${i} of ${pageCount} | Traffic Surveillance System`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`${report.title.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.pdf`);
}

// Generate Excel report
export function generateExcel(report: ReportData, reportType: string): void {
  let worksheetData: any[][] = [];

  switch (reportType) {
    case "violations":
      worksheetData = [
        ["Date", "Plate Number", "Type", "Severity", "Status", "Fine", "Description"],
        ...report.data.map((v) => [
          format(new Date(v.detected_at), "yyyy-MM-dd HH:mm"),
          v.vehicle?.plate_number || "Unknown",
          violationTypeLabels[v.violation_type as ViolationType] || v.violation_type,
          v.severity || "medium",
          v.resolved_at ? "Resolved" : "Pending",
          v.fine_amount || "",
          v.description || "",
        ]),
      ];
      break;

    case "vehicle-activity":
      worksheetData = [
        ["Date", "Gate", "Plate Number", "Action", "Vehicle ID"],
        ...report.data.map((e) => [
          format(new Date(e.logged_at), "yyyy-MM-dd HH:mm"),
          e.gate?.name || "Unknown",
          e.plate_number,
          e.action,
          e.vehicle_id || "",
        ]),
      ];
      break;

    case "daily-summary":
      const summary = report.data[0];
      worksheetData = [
        ["Metric", "Value"],
        ["Total Violations", summary.totalViolations],
        ["Resolved Violations", summary.resolvedViolations],
        ["Pending Violations", summary.pendingViolations],
        ["Total Entries", summary.totalEntries],
        ["Total Exits", summary.totalExits],
        ["Denied Access", summary.deniedAccess],
        ["Total Vehicles", summary.totalVehicles],
        ["Blacklisted Vehicles", summary.blacklistedVehicles],
        ["Cameras Online", summary.onlineCameras],
        ["Total Cameras", summary.totalCameras],
      ];
      break;

    case "camera-status":
      worksheetData = [
        ["Name", "Location", "Status", "Description", "Latitude", "Longitude", "Last Updated"],
        ...report.data.map((c) => [
          c.name,
          c.location,
          c.status,
          c.description || "",
          c.latitude || "",
          c.longitude || "",
          format(new Date(c.updated_at), "yyyy-MM-dd HH:mm"),
        ]),
      ];
      break;
  }

  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, report.title);

  // Auto-size columns
  const maxWidth = 30;
  const colWidths = worksheetData[0].map((_, colIdx) =>
    Math.min(
      maxWidth,
      Math.max(...worksheetData.map((row) => String(row[colIdx] || "").length))
    )
  );
  worksheet["!cols"] = colWidths.map((w) => ({ wch: w }));

  XLSX.writeFile(
    workbook,
    `${report.title.toLowerCase().replace(/\s+/g, "-")}-${format(new Date(), "yyyy-MM-dd")}.xlsx`
  );
}
