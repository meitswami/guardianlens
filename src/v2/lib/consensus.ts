/**
 * Cross-frame consensus.
 *
 * One AI read of one picture can be wrong. v2 analyses several frames of the
 * same incident and only trusts what the frames agree on:
 *  - plate reads are repaired, grouped per vehicle and voted character by character
 *  - a violation is "confirmed" only when enough sightings of that vehicle report it
 */

export interface DetectedVehicle {
  vehicle_type?: string;
  plate_number?: string | null;
  plate_confidence?: number;
  vehicle_color?: string;
  vehicle_make?: string;
  vehicle_model?: string;
  violations?: string[];
  violation_descriptions?: string[];
}

export interface FrameDetection {
  frameIndex: number;
  vehicles: DetectedVehicle[];
}

export type ViolationStatus = "confirmed" | "unconfirmed" | "single_frame";
export type ScoreLevel = "high" | "review" | "low";

export interface ViolationConsensus {
  type: string;
  frames: number[];
  ratio: number;
  status: ViolationStatus;
  description: string;
}

export interface VehicleConsensus {
  key: string;
  identified: boolean;
  plate: string | null;
  plateDisplay: string | null;
  plateValid: boolean;
  plateKind: PlateKind;
  stateCode: string | null;
  plateAgreement: number;
  reads: { frameIndex: number; plate: string | null; confidence: number }[];
  sightings: number;
  totalFrames: number;
  vehicleType: string;
  color: string;
  make: string;
  model: string;
  violations: ViolationConsensus[];
  score: number;
  level: ScoreLevel;
  flags: string[];
}

export type PlateKind = "standard" | "bharat" | "invalid";

const STATE_CODES = new Set(
  "AN AP AR AS BR CG CH DD DL DN GA GJ HP HR JH JK KA KL LA LD MH ML MN MP MZ NL OD OR PB PY RJ SK TN TR TS TG UK UA UP WB".split(" "),
);

const TO_LETTER: Record<string, string> = { "0": "O", "1": "I", "8": "B", "5": "S", "2": "Z", "6": "G" };
const TO_DIGIT: Record<string, string> = { O: "0", Q: "0", D: "0", I: "1", L: "1", B: "8", S: "5", Z: "2", G: "6" };

export function normalizePlate(raw: string | null | undefined): string {
  return (raw ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Fix the usual OCR mix-ups using the fixed layout of Indian plates:
 * the first two characters are letters (state) and the last four are digits.
 */
export function repairPlate(raw: string | null | undefined): string {
  const p = normalizePlate(raw);
  if (p.length < 8 || p.length > 10) return p;
  if (/^.{2}BH/.test(p)) return p; // Bharat series starts with the year, leave as read
  const chars = p.split("");
  for (let i = 0; i < 2; i++) chars[i] = TO_LETTER[chars[i]] ?? chars[i];
  for (let i = chars.length - 4; i < chars.length; i++) chars[i] = TO_DIGIT[chars[i]] ?? chars[i];
  return chars.join("");
}

export function validatePlate(plate: string): { valid: boolean; kind: PlateKind; stateCode: string | null } {
  if (/^\d{2}BH\d{4}[A-Z]{1,2}$/.test(plate)) return { valid: true, kind: "bharat", stateCode: null };
  const m = /^([A-Z]{2})\d{1,2}[A-Z]{0,3}\d{4}$/.exec(plate);
  if (m && STATE_CODES.has(m[1])) return { valid: true, kind: "standard", stateCode: m[1] };
  return { valid: false, kind: "invalid", stateCode: m ? m[1] : null };
}

export function formatPlate(plate: string): string {
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{4})$/.exec(plate);
  if (m) return [m[1], m[2], m[3], m[4]].filter(Boolean).join(" ");
  const b = /^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/.exec(plate);
  return b ? b.slice(1).join(" ") : plate;
}

export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

interface Sighting {
  frameIndex: number;
  plate: string; // repaired, may be ""
  confidence: number;
  vehicle: DetectedVehicle;
}

function clampConfidence(c: unknown): number {
  const n = typeof c === "number" && Number.isFinite(c) ? c : 0.5;
  return Math.min(1, Math.max(0, n));
}

/** Vote a plate from several reads: pick the most supported length, then vote each position. */
export function votePlate(reads: { plate: string; confidence: number }[]): { plate: string; agreement: number } {
  const usable = reads.filter((r) => r.plate);
  if (!usable.length) return { plate: "", agreement: 0 };
  const byLength = new Map<number, number>();
  usable.forEach((r) => byLength.set(r.plate.length, (byLength.get(r.plate.length) ?? 0) + r.confidence + 0.01));
  const length = [...byLength.entries()].sort((a, b) => b[1] - a[1])[0][0];
  const same = usable.filter((r) => r.plate.length === length);
  let plate = "";
  for (let i = 0; i < length; i++) {
    const votes = new Map<string, number>();
    same.forEach((r) => votes.set(r.plate[i], (votes.get(r.plate[i]) ?? 0) + r.confidence + 0.01));
    plate += [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0];
  }
  return { plate, agreement: usable.filter((r) => r.plate === plate).length / usable.length };
}

function mostCommon(values: (string | undefined)[]): string {
  const counts = new Map<string, number>();
  values.forEach((v) => {
    const k = (v ?? "").trim();
    if (k && k.toLowerCase() !== "unknown" && k.toLowerCase() !== "n/a") counts.set(k, (counts.get(k) ?? 0) + 1);
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
}

export function buildConsensus(frames: FrameDetection[], confirmThreshold = 0.6): VehicleConsensus[] {
  const totalFrames = frames.length;
  const clusters: { identified: boolean; type: string; sightings: Sighting[] }[] = [];

  for (const frame of frames) {
    for (const vehicle of frame.vehicles ?? []) {
      const sighting: Sighting = {
        frameIndex: frame.frameIndex,
        plate: repairPlate(vehicle.plate_number),
        confidence: clampConfidence(vehicle.plate_confidence),
        vehicle,
      };
      const type = (vehicle.vehicle_type ?? "other").toLowerCase();
      const cluster = sighting.plate.length >= 6
        ? clusters.find((c) => c.identified && c.sightings.some((s) => editDistance(s.plate, sighting.plate) <= 2))
        : clusters.find((c) => !c.identified && c.type === type);
      if (cluster) cluster.sightings.push(sighting);
      else clusters.push({ identified: sighting.plate.length >= 6, type, sightings: [sighting] });
    }
  }

  return clusters.map((cluster, idx) => {
    const { sightings, identified } = cluster;
    const framesSeen = [...new Set(sightings.map((s) => s.frameIndex))];
    const vote = votePlate(sightings);
    const check = identified ? validatePlate(vote.plate) : { valid: false, kind: "invalid" as PlateKind, stateCode: null };
    const avgConfidence = sightings.reduce((sum, s) => sum + s.confidence, 0) / sightings.length;

    const violationFrames = new Map<string, Set<number>>();
    const violationText = new Map<string, string>();
    sightings.forEach((s) =>
      (s.vehicle.violations ?? []).forEach((v, i) => {
        if (!v) return;
        if (!violationFrames.has(v)) violationFrames.set(v, new Set());
        violationFrames.get(v)!.add(s.frameIndex);
        const text = s.vehicle.violation_descriptions?.[i];
        if (text && !violationText.has(v)) violationText.set(v, text);
      }),
    );
    const violations: ViolationConsensus[] = [...violationFrames.entries()].map(([type, set]) => {
      const ratio = set.size / framesSeen.length;
      const status: ViolationStatus =
        totalFrames < 2 ? "single_frame" : set.size >= 2 && ratio >= confirmThreshold ? "confirmed" : "unconfirmed";
      return { type, frames: [...set].sort((a, b) => a - b), ratio, status, description: violationText.get(type) ?? "" };
    });

    const coverage = framesSeen.length / totalFrames;
    const plateScore = identified ? avgConfidence * (0.5 + 0.5 * vote.agreement) * (check.valid ? 1 : 0.6) : 0;
    let score = Math.round(100 * (0.65 * plateScore + 0.35 * coverage));
    if (totalFrames < 2) score = Math.min(score, 70);
    const level: ScoreLevel = score >= 85 ? "high" : score >= 60 ? "review" : "low";

    const flags: string[] = [];
    if (!identified) flags.push("No number plate could be read");
    else if (!check.valid) flags.push("Plate does not match a valid Indian format");
    if (identified && vote.agreement < 1) flags.push("Plate read differs between frames");
    if (totalFrames < 2) flags.push("Only one frame: nothing to cross-check against");
    else if (framesSeen.length < 2) flags.push(`Seen in only 1 of ${totalFrames} frames`);
    if (violations.some((v) => v.status === "unconfirmed")) flags.push("Some violations were not repeated across frames");

    return {
      key: identified ? vote.plate : `unidentified-${cluster.type}-${idx}`,
      identified,
      plate: identified ? vote.plate : null,
      plateDisplay: identified ? formatPlate(vote.plate) : null,
      plateValid: check.valid,
      plateKind: check.kind,
      stateCode: check.stateCode,
      plateAgreement: vote.agreement,
      reads: sightings.map((s) => ({ frameIndex: s.frameIndex, plate: s.plate || null, confidence: s.confidence })),
      sightings: framesSeen.length,
      totalFrames,
      vehicleType: cluster.type,
      color: mostCommon(sightings.map((s) => s.vehicle.vehicle_color)),
      make: mostCommon(sightings.map((s) => s.vehicle.vehicle_make)),
      model: mostCommon(sightings.map((s) => s.vehicle.vehicle_model)),
      violations,
      score,
      level,
      flags,
    };
  }).sort((a, b) => b.violations.length - a.violations.length || b.score - a.score);
}
