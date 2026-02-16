import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Upload, Camera, Loader2, CheckCircle, AlertTriangle, Car, FileText, Send } from "lucide-react";

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
}

type ProcessingStep = "upload" | "detecting" | "detected" | "lookup" | "looked_up" | "challan" | "done";

const violationTypeLabels: Record<string, string> = {
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

export default function UploadProcess() {
  const [step, setStep] = useState<ProcessingStep>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [detectionResult, setDetectionResult] = useState<DetectionResult | null>(null);
  const [selectedVehicleIdx, setSelectedVehicleIdx] = useState(0);
  const [vehicleLookup, setVehicleLookup] = useState<VehicleLookupData | null>(null);
  const [selectedState, setSelectedState] = useState("Rajasthan");
  const [selectedViolation, setSelectedViolation] = useState("");
  const [challanResult, setChallanResult] = useState<any>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setStep("upload");
    setDetectionResult(null);
    setVehicleLookup(null);
    setChallanResult(null);
  };

  const handleUploadAndProcess = useCallback(async () => {
    if (!file) return;
    setUploading(true);
    setStep("detecting");
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("evidence")
        .upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("evidence")
        .getPublicUrl(filePath);

      const isVideo = file.type.startsWith("video/");
      const { data, error } = await supabase.functions.invoke("process-evidence", {
        body: isVideo ? { video_url: publicUrl } : { image_url: publicUrl },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setDetectionResult(data.result);
      setStep("detected");
      toast({ title: "Detection complete", description: `Found ${data.result.total_vehicles} vehicle(s)` });
    } catch (e: any) {
      toast({ title: "Processing failed", description: e.message, variant: "destructive" });
      setStep("upload");
    } finally {
      setUploading(false);
    }
  }, [file, toast]);

  const handleVehicleLookup = useCallback(async () => {
    const vehicle = detectionResult?.vehicles_detected[selectedVehicleIdx];
    if (!vehicle?.plate_number) {
      toast({ title: "No plate detected", description: "Enter plate manually or select another vehicle", variant: "destructive" });
      return;
    }
    setStep("lookup");
    try {
      const { data, error } = await supabase.functions.invoke("vehicle-lookup", {
        body: { plate_number: vehicle.plate_number },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setVehicleLookup(data.data);
      setSelectedState(data.data.state || "Rajasthan");
      if (vehicle.violations.length > 0) setSelectedViolation(vehicle.violations[0]);
      setStep("looked_up");
    } catch (e: any) {
      toast({ title: "Lookup failed", description: e.message, variant: "destructive" });
      setStep("detected");
    }
  }, [detectionResult, selectedVehicleIdx, toast]);

  const handleCreateChallan = useCallback(async () => {
    if (!vehicleLookup || !selectedViolation) return;
    setStep("challan");
    try {
      const vehicle = detectionResult?.vehicles_detected[selectedVehicleIdx];
      const { data: { publicUrl } } = supabase.storage.from("evidence").getPublicUrl(`uploads/${file?.name}`);

      const { data, error } = await supabase.functions.invoke("create-challan", {
        body: {
          plate_number: vehicleLookup.plate_number,
          violation_type: selectedViolation,
          violation_label: violationTypeLabels[selectedViolation] || selectedViolation,
          state: selectedState,
          image_url: publicUrl || null,
          vehicle_data: vehicleLookup,
          ai_detection_data: vehicle,
          severity: "medium",
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setChallanResult(data);

      // Send SMS notification
      await supabase.functions.invoke("send-challan-sms", {
        body: { challan_id: data.challan.id },
      });

      setStep("done");
      toast({ title: "eChallan Generated!", description: `Challan ${data.challan_number} created and SMS sent` });
    } catch (e: any) {
      toast({ title: "Challan creation failed", description: e.message, variant: "destructive" });
      setStep("looked_up");
    }
  }, [vehicleLookup, selectedViolation, selectedState, detectionResult, selectedVehicleIdx, file, toast]);

  const selectedVehicle = detectionResult?.vehicles_detected[selectedVehicleIdx];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Upload & Process Evidence</h1>
        <p className="text-muted-foreground">Upload traffic images/videos for AI-powered violation detection and eChallan generation</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2 flex-wrap">
        {[
          { key: "upload", label: "Upload", icon: Upload },
          { key: "detected", label: "AI Detection", icon: Camera },
          { key: "looked_up", label: "Vehicle Lookup", icon: Car },
          { key: "done", label: "eChallan", icon: FileText },
        ].map((s, i) => {
          const isActive = ["upload", "detecting"].includes(step) && s.key === "upload"
            || ["detected"].includes(step) && s.key === "detected"
            || ["lookup", "looked_up"].includes(step) && s.key === "looked_up"
            || ["challan", "done"].includes(step) && s.key === "done";
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
        {/* Upload & Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Evidence Upload</CardTitle>
            <CardDescription>Upload an image or video of traffic violation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <Input type="file" accept="image/*,video/*" onChange={handleFileChange} className="hidden" id="evidence-file" />
              <label htmlFor="evidence-file" className="cursor-pointer space-y-2 block">
                <Upload className="h-10 w-10 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Click to upload image or video</p>
                <p className="text-xs text-muted-foreground">JPG, PNG, MP4 supported</p>
              </label>
            </div>
            {previewUrl && (
              <div className="rounded-lg overflow-hidden border">
                {file?.type.startsWith("video/") ? (
                  <video src={previewUrl} controls className="w-full max-h-64 object-contain" />
                ) : (
                  <img src={previewUrl} alt="Evidence" className="w-full max-h-64 object-contain" />
                )}
              </div>
            )}
            <Button onClick={handleUploadAndProcess} disabled={!file || uploading || step !== "upload"} className="w-full">
              {uploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing with AI...</> : <><Camera className="h-4 w-4 mr-2" /> Detect Vehicles & Violations</>}
            </Button>
          </CardContent>
        </Card>

        {/* Detection Results */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">AI Detection Results</CardTitle>
            <CardDescription>{detectionResult ? `${detectionResult.total_vehicles} vehicle(s) detected` : "Awaiting upload..."}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === "detecting" && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="ml-3 text-muted-foreground">AI is analyzing the image...</span>
              </div>
            )}
            {detectionResult && detectionResult.vehicles_detected.length > 0 && (
              <>
                {detectionResult.vehicles_detected.length > 1 && (
                  <Select value={String(selectedVehicleIdx)} onValueChange={(v) => setSelectedVehicleIdx(Number(v))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {detectionResult.vehicles_detected.map((v, i) => (
                        <SelectItem key={i} value={String(i)}>Vehicle {i + 1}: {v.plate_number || "No plate"} ({v.vehicle_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {selectedVehicle && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Plate:</span> <span className="font-mono font-bold">{selectedVehicle.plate_number || "Not detected"}</span></div>
                      <div><span className="text-muted-foreground">Type:</span> {selectedVehicle.vehicle_type}</div>
                      <div><span className="text-muted-foreground">Color:</span> {selectedVehicle.vehicle_color}</div>
                      <div><span className="text-muted-foreground">Confidence:</span> {(selectedVehicle.plate_confidence * 100).toFixed(0)}%</div>
                    </div>
                    {selectedVehicle.violations.length > 0 ? (
                      <div>
                        <Label className="text-xs text-muted-foreground">Violations Detected</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedVehicle.violations.map((v) => (
                            <Badge key={v} variant="destructive">{violationTypeLabels[v] || v}</Badge>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" /> No violations detected</Badge>
                    )}
                    <Button onClick={handleVehicleLookup} disabled={!selectedVehicle.plate_number || step === "lookup"} className="w-full">
                      {step === "lookup" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Looking up...</> : <><Car className="h-4 w-4 mr-2" /> Lookup Vehicle Details</>}
                    </Button>
                  </div>
                )}
              </>
            )}
            {detectionResult && detectionResult.vehicles_detected.length === 0 && (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">No vehicles detected in the image</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Lookup Results & Challan Creation */}
      {vehicleLookup && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Vehicle & Owner Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">Owner:</span> <span className="font-medium">{vehicleLookup.owner_name}</span></div>
                <div><span className="text-muted-foreground">Phone:</span> {vehicleLookup.owner_phone || "N/A"}</div>
                <div><span className="text-muted-foreground">Vehicle:</span> {vehicleLookup.vehicle_make} {vehicleLookup.vehicle_model}</div>
                <div><span className="text-muted-foreground">Color:</span> {vehicleLookup.vehicle_color}</div>
                <div><span className="text-muted-foreground">RTO:</span> {vehicleLookup.rto_office}</div>
                <div><span className="text-muted-foreground">State:</span> {vehicleLookup.state}</div>
                <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {vehicleLookup.owner_address}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Generate eChallan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>State</Label>
                <Select value={selectedState} onValueChange={setSelectedState}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Rajasthan">Rajasthan</SelectItem>
                    <SelectItem value="Telangana">Telangana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Violation Type</Label>
                <Select value={selectedViolation} onValueChange={setSelectedViolation}>
                  <SelectTrigger><SelectValue placeholder="Select violation" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(violationTypeLabels).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateChallan} disabled={!selectedViolation || step === "challan"} className="w-full">
                {step === "challan" ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : <><FileText className="h-4 w-4 mr-2" /> Generate eChallan & Send SMS</>}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Challan Result */}
      {challanResult && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" /> eChallan Generated Successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div><span className="text-muted-foreground">Challan No:</span> <span className="font-mono font-bold">{challanResult.challan_number}</span></div>
              <div><span className="text-muted-foreground">Fine:</span> <span className="font-bold text-destructive">₹{challanResult.fine_amount}</span></div>
              <div><span className="text-muted-foreground">Plate:</span> <span className="font-mono">{challanResult.challan?.plate_number}</span></div>
              <div><span className="text-muted-foreground">Status:</span> <Badge>Issued</Badge></div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={() => window.open(challanResult.public_url, "_blank")}>
                <Send className="h-4 w-4 mr-1" /> View Public Link
              </Button>
              <Button variant="outline" size="sm" onClick={() => {
                navigator.clipboard.writeText(challanResult.public_url);
                toast({ title: "Link copied!" });
              }}>
                Copy Public Link
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
