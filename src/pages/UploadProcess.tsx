import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, Loader2, CheckCircle, AlertTriangle, Car, FileText, Send, Plus, Clock, X, Timer } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface DetectedVehicle {
  vehicle_type: string;
  plate_number: string | null;
  plate_confidence: number;
  vehicle_color: string;
  vehicle_make: string;
  vehicle_model: string;
  violations: string[];
  violation_descriptions: string[];
}

interface PlateCorrection {
  vehicleIdx: number;
  originalPlate: string;
  correctedPlate: string;
  timestamp: string;
  verified: boolean;
}

interface DetectionResult {
  vehicles_detected: DetectedVehicle[];
  scene_description: string;
  total_vehicles: number;
}

interface VehicleLookupData {
  plate_number: string;
  owner_name: string;
  owner_phone: string;
  owner_address: string;
  vehicle_type: string;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_color: string;
  rto_office: string;
  state: string;
  fuel_type?: string;
  engine_number?: string;
  chassis_number?: string;
  registration_date?: string;
  insurance_valid_until?: string;
  fitness_valid_until?: string;
  father_name?: string;
  rc_status?: string;
  insurance_company?: string;
  mock?: boolean;
}

type ProcessingStep = "upload" | "detecting" | "detected" | "lookup" | "looked_up" | "challan" | "done";

interface UploadItem {
  id: string;
  file: File;
  previewUrl: string;
  step: ProcessingStep;
  uploading: boolean;
  detectionResult: DetectionResult | null;
  detectionTimeMs: number | null;
  selectedVehicleIdx: number;
  vehicleLookup: VehicleLookupData | null;
  selectedState: string;
  selectedViolation: string;
  challanResult: any;
  editablePlates: Record<number, string>;
  plateCorrections: PlateCorrection[];
  publicUrl: string | null;
  otherDescription: string;
  otherFineAmount: string;
}

const violationTypeLabels: Record<string, string> = {
  helmet: "No Helmet",
  helmet_pillion: "No Helmets (Rider & Pillion)",
  seatbelt: "No Seatbelt",
  triple_riding: "Triple Riding",
  mobile_phone: "Mobile Phone Usage",
  wrong_way: "Wrong Way",
  red_light: "Red Light",
  illegal_parking: "Illegal Parking",
  overloading: "Overloading",
  other: "Other",
};

const allViolationTypes = Object.keys(violationTypeLabels);

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export default function UploadProcess() {
  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [activeUploadId, setActiveUploadId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const activeUpload = uploads.find(u => u.id === activeUploadId) || null;

  const updateUpload = useCallback((id: string, updates: Partial<UploadItem>) => {
    setUploads(prev => prev.map(u => u.id === id ? { ...u, ...updates } : u));
  }, []);

  const handleFilesAdded = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newItems: UploadItem[] = files.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      file: f,
      previewUrl: URL.createObjectURL(f),
      step: "upload" as ProcessingStep,
      uploading: false,
      detectionResult: null,
      detectionTimeMs: null,
      selectedVehicleIdx: 0,
      vehicleLookup: null,
      selectedState: "Rajasthan",
      selectedViolation: "",
      challanResult: null,
      editablePlates: {},
      plateCorrections: [],
      publicUrl: null,
      otherDescription: "",
      otherFineAmount: "",
    }));

    setUploads(prev => [...prev, ...newItems]);
    if (!activeUploadId) setActiveUploadId(newItems[0].id);
    // Reset file input so same file can be added again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleProcessOne = useCallback(async (itemId: string) => {
    const item = uploads.find(u => u.id === itemId);
    if (!item) return;

    updateUpload(itemId, { uploading: true, step: "detecting" });
    const startTime = performance.now();

    try {
      const fileExt = item.file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage.from("evidence").upload(filePath, item.file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("evidence").getPublicUrl(filePath);

      const isVideo = item.file.type.startsWith("video/");
      const { data, error } = await supabase.functions.invoke("process-evidence", {
        body: isVideo ? { video_url: publicUrl } : { image_url: publicUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const elapsed = Math.round(performance.now() - startTime);
      updateUpload(itemId, {
        detectionResult: data.result,
        detectionTimeMs: elapsed,
        step: "detected",
        uploading: false,
        publicUrl,
      });
      toast({ title: "Detection complete", description: `Found ${data.result.total_vehicles} vehicle(s) in ${formatDuration(elapsed)}` });
    } catch (e: any) {
      updateUpload(itemId, { uploading: false, step: "upload" });
      toast({ title: "Processing failed", description: e.message, variant: "destructive" });
    }
  }, [uploads, updateUpload, toast]);

  const handleProcessAll = useCallback(async () => {
    const pending = uploads.filter(u => u.step === "upload");
    if (!pending.length) return;
    // Fire all in parallel
    pending.forEach(u => handleProcessOne(u.id));
  }, [uploads, handleProcessOne]);

  const getEffectivePlate = (item: UploadItem, idx: number) => {
    if (item.editablePlates[idx] !== undefined) return item.editablePlates[idx];
    return item.detectionResult?.vehicles_detected[idx]?.plate_number || "";
  };

  const handleVehicleLookup = useCallback(async (itemId: string) => {
    const item = uploads.find(u => u.id === itemId);
    if (!item) return;

    const plateNumber = getEffectivePlate(item, item.selectedVehicleIdx);
    if (!plateNumber) {
      toast({ title: "No plate number", description: "Enter plate number manually", variant: "destructive" });
      return;
    }
    updateUpload(itemId, { step: "lookup" });
    try {
      const { data, error } = await supabase.functions.invoke("vehicle-lookup", { body: { plate_number: plateNumber } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      // Check if all key fields are N/A (API returned no useful data)
      const d = data.data;
      const isEmptyResult = d.owner_name === "N/A" && d.vehicle_make === "N/A" && d.engine_number === "N/A";
      
      if (isEmptyResult) {
        toast({ 
          title: "Vehicle not found in RTO database", 
          description: "Using test data. The plate may be invalid or not registered.", 
          variant: "destructive" 
        });
        // Fallback to mock data for testing
        const stateCode = plateNumber.substring(0, 2).toUpperCase();
        const stateMap: Record<string, string> = {
          RJ: "Rajasthan", TS: "Telangana", MH: "Maharashtra", DL: "Delhi",
          KA: "Karnataka", TN: "Tamil Nadu", AP: "Andhra Pradesh", GJ: "Gujarat",
        };
        const mockData: VehicleLookupData = {
          plate_number: plateNumber,
          owner_name: "Vehicle Owner (Test Mode)",
          owner_phone: "+919876543210",
          owner_address: `123 Main Road, ${stateMap[stateCode] || "Unknown State"}`,
          vehicle_type: "car",
          vehicle_make: "Unknown",
          vehicle_model: "Unknown",
          vehicle_color: "N/A",
          rto_office: `RTO ${stateCode}-01`,
          state: stateMap[stateCode] || stateCode,
          fuel_type: "N/A",
          registration_date: "N/A",
          rc_status: "Not Found",
          mock: true,
        };
        const vehicleData = item.detectionResult?.vehicles_detected[item.selectedVehicleIdx];
        updateUpload(itemId, {
          vehicleLookup: mockData,
          selectedState: mockData.state || "Rajasthan",
          selectedViolation: vehicleData?.violations?.[0] || "",
          step: "looked_up",
        });
        return;
      }

      const vehicleData = item.detectionResult?.vehicles_detected[item.selectedVehicleIdx];
      updateUpload(itemId, {
        vehicleLookup: { ...d, mock: false },
        selectedState: d.state || "Rajasthan",
        selectedViolation: vehicleData?.violations?.[0] || "",
        step: "looked_up",
      });
    } catch (e: any) {
      toast({ title: "Lookup failed", description: `${e.message}. Falling back to test data.`, variant: "destructive" });
      // Fallback to mock on any error
      const stateCode = plateNumber.substring(0, 2).toUpperCase();
      const stateMap: Record<string, string> = {
        RJ: "Rajasthan", TS: "Telangana", MH: "Maharashtra", DL: "Delhi",
        KA: "Karnataka", TN: "Tamil Nadu", AP: "Andhra Pradesh", GJ: "Gujarat",
      };
      const mockData: VehicleLookupData = {
        plate_number: plateNumber,
        owner_name: "Vehicle Owner (Test Mode)",
        owner_phone: "+919876543210",
        owner_address: `123 Main Road, ${stateMap[stateCode] || "Unknown State"}`,
        vehicle_type: "car",
        vehicle_make: "Unknown",
        vehicle_model: "Unknown",
        vehicle_color: "N/A",
        rto_office: `RTO ${stateCode}-01`,
        state: stateMap[stateCode] || stateCode,
        rc_status: "Lookup Failed",
        mock: true,
      };
      const vehicleData = item.detectionResult?.vehicles_detected[item.selectedVehicleIdx];
      updateUpload(itemId, {
        vehicleLookup: mockData,
        selectedState: mockData.state || "Rajasthan",
        selectedViolation: vehicleData?.violations?.[0] || "",
        step: "looked_up",
      });
    }
  }, [uploads, updateUpload, toast]);

  const handleCreateChallan = useCallback(async (itemId: string) => {
    const item = uploads.find(u => u.id === itemId);
    if (!item || !item.vehicleLookup || !item.selectedViolation) return;

    updateUpload(itemId, { step: "challan" });
    try {
      const vehicle = item.detectionResult?.vehicles_detected[item.selectedVehicleIdx];
      const corrections = item.plateCorrections.filter(c => c.vehicleIdx === item.selectedVehicleIdx);

      const isOtherViolation = item.selectedViolation === "other";
      const { data, error } = await supabase.functions.invoke("create-challan", {
        body: {
          plate_number: item.vehicleLookup.plate_number,
          violation_type: item.selectedViolation,
          violation_label: isOtherViolation && item.otherDescription
            ? item.otherDescription
            : (violationTypeLabels[item.selectedViolation] || item.selectedViolation),
          state: item.selectedState,
          image_url: item.publicUrl || null,
          vehicle_data: item.vehicleLookup,
          ai_detection_data: {
            ...vehicle,
            plate_corrections: corrections.length > 0 ? corrections : undefined,
            original_ai_plate: vehicle?.plate_number,
            plate_manually_corrected: corrections.length > 0,
          },
          severity: "medium",
          ...(isOtherViolation && item.otherFineAmount ? { custom_fine_amount: Number(item.otherFineAmount) } : {}),
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      updateUpload(itemId, { challanResult: data, step: "done" });

      await supabase.functions.invoke("send-challan-sms", { body: { challan_id: data.challan.id } });
      toast({ title: "eChallan Generated!", description: `Challan ${data.challan_number} created and SMS sent` });
    } catch (e: any) {
      toast({ title: "Challan creation failed", description: e.message, variant: "destructive" });
      updateUpload(itemId, { step: "looked_up" });
    }
  }, [uploads, updateUpload, toast]);

  const removeUpload = (id: string) => {
    setUploads(prev => prev.filter(u => u.id !== id));
    if (activeUploadId === id) {
      setActiveUploadId(uploads.find(u => u.id !== id)?.id || null);
    }
  };

  const pendingCount = uploads.filter(u => u.step === "upload").length;
  const processingCount = uploads.filter(u => u.uploading).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Upload & Process Evidence</h1>
          <p className="text-muted-foreground">Upload traffic images/videos for AI-powered violation detection and eChallan generation</p>
        </div>
        {uploads.length > 0 && (
          <div className="flex gap-2">
            <Badge variant="outline">{uploads.length} file{uploads.length !== 1 ? "s" : ""}</Badge>
            {processingCount > 0 && <Badge className="bg-primary/20 text-primary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />{processingCount} processing</Badge>}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upload Queue Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              Evidence Queue
              <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Plus className="h-4 w-4 mr-1" /> Add
              </Button>
            </CardTitle>
            <CardDescription>
              {uploads.length === 0 ? "Upload images or videos" : `${pendingCount} pending · ${processingCount} processing`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFilesAdded}
              className="hidden"
            />

            {/* Drop zone - always visible */}
            <div
              className="border-2 border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
              <p className="text-sm text-muted-foreground mt-1">Click to add files</p>
              <p className="text-xs text-muted-foreground">JPG, PNG, MP4 · Multiple files supported</p>
            </div>

            {/* Process All button */}
            {pendingCount > 1 && (
              <Button onClick={handleProcessAll} className="w-full" size="sm">
                <Camera className="h-4 w-4 mr-1" /> Process All ({pendingCount})
              </Button>
            )}

            {/* Upload items list */}
            <ScrollArea className={uploads.length > 4 ? "h-[320px]" : ""}>
              <div className="space-y-2">
                {uploads.map(item => (
                  <div
                    key={item.id}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer border transition-colors ${
                      activeUploadId === item.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                    onClick={() => setActiveUploadId(item.id)}
                  >
                    {/* Thumbnail */}
                    <div className="h-10 w-10 rounded overflow-hidden flex-shrink-0 bg-muted">
                      {item.file.type.startsWith("video/") ? (
                        <video src={item.previewUrl} className="h-full w-full object-cover" />
                      ) : (
                        <img src={item.previewUrl} alt="" className="h-full w-full object-cover" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{item.file.name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {item.uploading && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
                        {item.step === "upload" && !item.uploading && <Badge variant="outline" className="text-[10px] h-4 px-1">Pending</Badge>}
                        {item.step === "detected" && <Badge variant="secondary" className="text-[10px] h-4 px-1">Detected</Badge>}
                        {item.step === "looked_up" && <Badge variant="secondary" className="text-[10px] h-4 px-1">Looked Up</Badge>}
                        {item.step === "done" && <Badge className="text-[10px] h-4 px-1 bg-primary/20 text-primary">Done</Badge>}
                        {item.detectionTimeMs !== null && (
                          <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                            <Timer className="h-2.5 w-2.5" />{formatDuration(item.detectionTimeMs)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Remove */}
                    <Button variant="ghost" size="icon" className="h-6 w-6 flex-shrink-0" onClick={(e) => { e.stopPropagation(); removeUpload(item.id); }}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Active Upload Detail */}
        <div className="lg:col-span-2 space-y-6">
          {!activeUpload && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Upload className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="text-muted-foreground">Add files to begin processing</p>
              </CardContent>
            </Card>
          )}

          {activeUpload && (
            <>
              {/* Progress Steps */}
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { key: "upload", label: "Upload", icon: Upload },
                  { key: "detected", label: "AI Detection", icon: Camera },
                  { key: "looked_up", label: "Vehicle Lookup", icon: Car },
                  { key: "done", label: "eChallan", icon: FileText },
                ].map((s, i) => {
                  const step = activeUpload.step;
                  const isActive = (["upload", "detecting"].includes(step) && s.key === "upload")
                    || (step === "detected" && s.key === "detected")
                    || (["lookup", "looked_up"].includes(step) && s.key === "looked_up")
                    || (["challan", "done"].includes(step) && s.key === "done");
                  const isDone = (s.key === "upload" && !["upload", "detecting"].includes(step))
                    || (s.key === "detected" && ["lookup", "looked_up", "challan", "done"].includes(step))
                    || (s.key === "looked_up" && ["challan", "done"].includes(step))
                    || (s.key === "done" && step === "done");
                  return (
                    <div key={s.key} className="flex items-center gap-2">
                      {i > 0 && <div className={`h-px w-8 ${isDone ? "bg-primary" : "bg-border"}`} />}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${isDone ? "bg-primary/10 text-primary" : isActive ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"}`}>
                        {isDone ? <CheckCircle className="h-4 w-4" /> : <s.icon className="h-4 w-4" />}
                        {s.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Preview & Process */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Evidence Preview</CardTitle>
                    <CardDescription>{activeUpload.file.name}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg overflow-hidden border">
                      {activeUpload.file.type.startsWith("video/") ? (
                        <video src={activeUpload.previewUrl} controls className="w-full max-h-64 object-contain" />
                      ) : (
                        <img src={activeUpload.previewUrl} alt="Evidence" className="w-full max-h-64 object-contain" />
                      )}
                    </div>

                    {/* Detection time badge */}
                    {activeUpload.detectionTimeMs !== null && (
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">AI Analysis Time:</span>
                        <Badge variant="outline" className="font-mono">{formatDuration(activeUpload.detectionTimeMs)}</Badge>
                      </div>
                    )}

                    {activeUpload.step === "upload" && (
                      <Button onClick={() => handleProcessOne(activeUpload.id)} disabled={activeUpload.uploading} className="w-full">
                        {activeUpload.uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing with AI...</> : <><Camera className="h-4 w-4 mr-2" /> Detect Vehicles & Violations</>}
                      </Button>
                    )}

                    {activeUpload.step === "detecting" && (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        <span className="ml-2 text-sm text-muted-foreground">AI is analyzing...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Detection Results */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Detection Results</CardTitle>
                    <CardDescription>
                      {activeUpload.detectionResult
                        ? `${activeUpload.detectionResult.total_vehicles} vehicle(s) detected`
                        : activeUpload.step === "detecting" ? "Analyzing..." : "Awaiting processing..."}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {activeUpload.step === "detecting" && (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="ml-3 text-muted-foreground">AI is analyzing the image...</span>
                      </div>
                    )}
                    {activeUpload.detectionResult && activeUpload.detectionResult.vehicles_detected.length > 0 && (() => {
                      const selectedVehicle = activeUpload.detectionResult.vehicles_detected[activeUpload.selectedVehicleIdx];
                      return (
                        <>
                          {activeUpload.detectionResult.vehicles_detected.length > 1 && (
                            <Select
                              value={String(activeUpload.selectedVehicleIdx)}
                              onValueChange={(v) => updateUpload(activeUpload.id, { selectedVehicleIdx: Number(v) })}
                            >
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {activeUpload.detectionResult.vehicles_detected.map((v, i) => (
                                  <SelectItem key={i} value={String(i)}>Vehicle {i + 1}: {v.plate_number || "No plate"} ({v.vehicle_type})</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {selectedVehicle && (
                            <div className="space-y-3">
                              <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Plate Number (click to correct)</Label>
                                <div className="flex gap-2 items-center">
                                  <Input
                                    value={getEffectivePlate(activeUpload, activeUpload.selectedVehicleIdx)}
                                    onChange={(e) => updateUpload(activeUpload.id, {
                                      editablePlates: { ...activeUpload.editablePlates, [activeUpload.selectedVehicleIdx]: e.target.value.toUpperCase() }
                                    })}
                                    placeholder="e.g. AP-16-BZ-3508"
                                    className="font-mono font-bold tracking-wider"
                                  />
                                  {selectedVehicle.plate_number && activeUpload.editablePlates[activeUpload.selectedVehicleIdx] !== undefined && activeUpload.editablePlates[activeUpload.selectedVehicleIdx] !== selectedVehicle.plate_number && (
                                    <>
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                          const correction: PlateCorrection = {
                                            vehicleIdx: activeUpload.selectedVehicleIdx,
                                            originalPlate: selectedVehicle.plate_number!,
                                            correctedPlate: activeUpload.editablePlates[activeUpload.selectedVehicleIdx],
                                            timestamp: new Date().toISOString(),
                                            verified: true,
                                          };
                                          updateUpload(activeUpload.id, {
                                            plateCorrections: [...activeUpload.plateCorrections, correction],
                                          });
                                          toast({ title: "Plate corrected", description: `${selectedVehicle.plate_number} → ${activeUpload.editablePlates[activeUpload.selectedVehicleIdx]}` });
                                        }}
                                      >
                                        <CheckCircle className="h-3 w-3 mr-1" /> Verify
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => {
                                        const updated = { ...activeUpload.editablePlates };
                                        delete updated[activeUpload.selectedVehicleIdx];
                                        updateUpload(activeUpload.id, { editablePlates: updated });
                                      }}>
                                        Reset
                                      </Button>
                                    </>
                                  )}
                                </div>
                                {selectedVehicle.plate_number && (
                                  <p className="text-xs text-muted-foreground">
                                    AI detected: <span className="font-mono">{selectedVehicle.plate_number}</span> ({(selectedVehicle.plate_confidence * 100).toFixed(0)}% confidence)
                                  </p>
                                )}
                                {activeUpload.plateCorrections.filter(c => c.vehicleIdx === activeUpload.selectedVehicleIdx).length > 0 && (
                                  <div className="mt-1 p-2 rounded bg-primary/10 border border-primary/20 text-xs space-y-1">
                                    <p className="font-medium text-primary flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Manually Verified</p>
                                    {activeUpload.plateCorrections.filter(c => c.vehicleIdx === activeUpload.selectedVehicleIdx).map((c, i) => (
                                      <p key={i} className="text-muted-foreground">
                                        <span className="font-mono line-through">{c.originalPlate}</span> → <span className="font-mono font-bold">{c.correctedPlate}</span>
                                        <span className="ml-2 opacity-60">{new Date(c.timestamp).toLocaleTimeString()}</span>
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                <div><span className="text-muted-foreground">Type:</span> {selectedVehicle.vehicle_type}</div>
                                <div><span className="text-muted-foreground">Color:</span> {selectedVehicle.vehicle_color}</div>
                              </div>
                              <div>
                                  <Label className="text-xs text-muted-foreground">Violations Detected <span className="opacity-60">(click to edit)</span></Label>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {selectedVehicle.violations.map((v) => (
                                      <Badge key={v} variant="destructive" className="cursor-pointer">{violationTypeLabels[v] || v}</Badge>
                                    ))}
                                  </div>
                                  <div className="mt-2 border rounded-md p-2 space-y-1 bg-muted/30">
                                    {allViolationTypes.map((vt) => {
                                      const isChecked = selectedVehicle.violations.includes(vt);
                                      return (
                                        <label key={vt} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-muted/50 px-1 py-0.5 rounded">
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            onChange={() => {
                                              const updated = isChecked
                                                ? selectedVehicle.violations.filter(x => x !== vt)
                                                : [...selectedVehicle.violations, vt];
                                              const updatedVehicles = [...activeUpload.detectionResult!.vehicles_detected];
                                              updatedVehicles[activeUpload.selectedVehicleIdx] = { ...selectedVehicle, violations: updated };
                                              updateUpload(activeUpload.id, {
                                                detectionResult: { ...activeUpload.detectionResult!, vehicles_detected: updatedVehicles },
                                              });
                                            }}
                                            className="rounded border-border"
                                          />
                                          <span className={isChecked ? "font-medium" : "text-muted-foreground"}>{violationTypeLabels[vt]}</span>
                                        </label>
                                      );
                                     })}
                                   </div>
                                   {selectedVehicle.violations.includes("other") && (
                                     <div className="mt-2 space-y-2 border rounded-md p-2 bg-muted/30">
                                       <div>
                                         <Label className="text-xs">Violation Description</Label>
                                         <Input
                                           placeholder="e.g. Driving without license"
                                           value={activeUpload.otherDescription}
                                           onChange={(e) => updateUpload(activeUpload.id, { otherDescription: e.target.value })}
                                           className="mt-1 h-8 text-sm"
                                         />
                                       </div>
                                       <div>
                                         <Label className="text-xs">Fine Amount (₹)</Label>
                                         <Input
                                           type="number"
                                           placeholder="e.g. 1000"
                                           value={activeUpload.otherFineAmount}
                                           onChange={(e) => updateUpload(activeUpload.id, { otherFineAmount: e.target.value })}
                                           className="mt-1 h-8 text-sm"
                                         />
                                       </div>
                                     </div>
                                   )}
                                </div>
                              <Button
                                onClick={() => handleVehicleLookup(activeUpload.id)}
                                disabled={!getEffectivePlate(activeUpload, activeUpload.selectedVehicleIdx) || activeUpload.step === "lookup"}
                                className="w-full"
                              >
                                {activeUpload.step === "lookup" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Looking up...</> : <><Car className="h-4 w-4 mr-2" /> Lookup Vehicle Details</>}
                              </Button>
                            </div>
                          )}
                        </>
                      );
                    })()}
                    {activeUpload.detectionResult && activeUpload.detectionResult.vehicles_detected.length === 0 && (
                      <div className="text-center py-8">
                        <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-muted-foreground">No vehicles detected in the image</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Vehicle Lookup & Challan */}
              {activeUpload.vehicleLookup && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        Vehicle & Owner Details
                        {activeUpload.vehicleLookup.mock && (
                          <Badge variant="destructive">
                            <AlertTriangle className="h-3 w-3 mr-1" /> Test Data
                          </Badge>
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{activeUpload.vehicleLookup.owner_name}</span></div>
                        <div><span className="text-muted-foreground">Phone:</span> {activeUpload.vehicleLookup.owner_phone || "N/A"}</div>
                        {activeUpload.vehicleLookup.father_name && (
                          <div><span className="text-muted-foreground">S/O:</span> {activeUpload.vehicleLookup.father_name}</div>
                        )}
                        <div><span className="text-muted-foreground">Vehicle:</span> {activeUpload.vehicleLookup.vehicle_make} {activeUpload.vehicleLookup.vehicle_model}</div>
                        <div><span className="text-muted-foreground">Color:</span> {activeUpload.vehicleLookup.vehicle_color}</div>
                        <div><span className="text-muted-foreground">Fuel:</span> {activeUpload.vehicleLookup.fuel_type || "N/A"}</div>
                        <div><span className="text-muted-foreground">RTO:</span> {activeUpload.vehicleLookup.rto_office}</div>
                        <div><span className="text-muted-foreground">State:</span> {activeUpload.vehicleLookup.state}</div>
                        {activeUpload.vehicleLookup.registration_date && (
                          <div><span className="text-muted-foreground">Reg Date:</span> {activeUpload.vehicleLookup.registration_date}</div>
                        )}
                        {activeUpload.vehicleLookup.rc_status && (
                          <div><span className="text-muted-foreground">RC Status:</span> <Badge variant={activeUpload.vehicleLookup.rc_status === "Active" ? "default" : "destructive"} className="text-xs">{activeUpload.vehicleLookup.rc_status}</Badge></div>
                        )}
                        {activeUpload.vehicleLookup.insurance_valid_until && (
                          <div><span className="text-muted-foreground">Insurance:</span> {activeUpload.vehicleLookup.insurance_valid_until}</div>
                        )}
                        {activeUpload.vehicleLookup.insurance_company && (
                          <div><span className="text-muted-foreground">Insurer:</span> {activeUpload.vehicleLookup.insurance_company}</div>
                        )}
                        <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {activeUpload.vehicleLookup.owner_address}</div>
                        {activeUpload.vehicleLookup.engine_number && activeUpload.vehicleLookup.engine_number !== "N/A" && (
                          <div><span className="text-muted-foreground">Engine:</span> <span className="font-mono text-xs">{activeUpload.vehicleLookup.engine_number}</span></div>
                        )}
                        {activeUpload.vehicleLookup.chassis_number && activeUpload.vehicleLookup.chassis_number !== "N/A" && (
                          <div><span className="text-muted-foreground">Chassis:</span> <span className="font-mono text-xs">{activeUpload.vehicleLookup.chassis_number}</span></div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-lg">Generate eChallan</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label>State</Label>
                        <Select value={activeUpload.selectedState} onValueChange={(v) => updateUpload(activeUpload.id, { selectedState: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                            <SelectItem value="Telangana">Telangana</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Violation Type</Label>
                        <Select value={activeUpload.selectedViolation} onValueChange={(v) => updateUpload(activeUpload.id, { selectedViolation: v })}>
                          <SelectTrigger><SelectValue placeholder="Select violation" /></SelectTrigger>
                          <SelectContent>
                            {Object.entries(violationTypeLabels).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={() => handleCreateChallan(activeUpload.id)} disabled={!activeUpload.selectedViolation || activeUpload.step === "challan"} className="w-full">
                        {activeUpload.step === "challan" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><FileText className="h-4 w-4 mr-2" /> Generate eChallan & Send SMS</>}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Challan Result */}
              {activeUpload.challanResult && (
                <Card className="border-primary/30 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-primary" /> eChallan Generated Successfully
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div><span className="text-muted-foreground">Challan No:</span> <span className="font-mono font-bold">{activeUpload.challanResult.challan_number}</span></div>
                      <div><span className="text-muted-foreground">Fine:</span> <span className="font-bold text-destructive">₹{activeUpload.challanResult.fine_amount}</span></div>
                      <div><span className="text-muted-foreground">Plate:</span> <span className="font-mono">{activeUpload.challanResult.challan?.plate_number}</span></div>
                      <div><span className="text-muted-foreground">Status:</span> <Badge>Issued</Badge></div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => window.open(activeUpload.challanResult.public_url, "_blank")}>
                        <Send className="h-4 w-4 mr-1" /> View Public Link
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => {
                        navigator.clipboard.writeText(activeUpload.challanResult.public_url);
                        toast({ title: "Link copied!" });
                      }}>
                        Copy Public Link
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
