import { backend } from "./backend";
import { v2Config } from "../config";
import { sha256Hex } from "./hash";
import { errorMessage } from "./errors";
import type { Frame } from "./frames";
import type { DetectedVehicle } from "./consensus";

export interface FrameResult {
  frameIndex: number;
  timeSec: number;
  sha256: string;
  storagePath: string | null;
  status: "pending" | "running" | "done" | "error";
  vehicles: DetectedVehicle[];
  scene: string;
  error: string | null;
  ms: number | null;
}

export function pendingResult(frame: Frame, frameIndex: number): FrameResult {
  return {
    frameIndex, timeSec: frame.timeSec, sha256: "", storagePath: null, status: "pending",
    vehicles: [], scene: "", error: null, ms: null,
  };
}

async function functionError(error: { message?: string; context?: { json?: () => Promise<{ error?: unknown }> } }): Promise<string> {
  // supabase-js wraps non-2xx replies; the useful message is in the response body
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return String(body.error);
  } catch { /* fall through */ }
  return error?.message ?? "AI analysis failed";
}

async function analyzeOne(frame: Frame, frameIndex: number, runId: string): Promise<FrameResult> {
  const started = performance.now();
  const base = pendingResult(frame, frameIndex);
  try {
    base.sha256 = await sha256Hex(frame.blob);
    const day = new Date().toISOString().slice(0, 10);
    const path = `v2/${day}/${runId}/frame-${String(frameIndex + 1).padStart(2, "0")}.jpg`;
    const bucket = backend.storage.from(v2Config.evidenceBucket);
    const { error: uploadError } = await bucket.upload(path, frame.blob, { contentType: "image/jpeg" });
    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
    base.storagePath = path;

    const { data, error } = await backend.functions.invoke(v2Config.detectFunction, {
      body: { image_url: bucket.getPublicUrl(path).data.publicUrl },
    });
    if (error) throw new Error(await functionError(error));
    if (data?.error) throw new Error(String(data.error));
    const result = data?.result ?? {};
    if (!Array.isArray(result.vehicles_detected)) throw new Error("AI reply could not be read for this frame");

    return {
      ...base, status: "done", vehicles: result.vehicles_detected,
      scene: typeof result.scene_description === "string" ? result.scene_description : "",
      ms: Math.round(performance.now() - started),
    };
  } catch (e) {
    return { ...base, status: "error", error: errorMessage(e, "Unknown error"), ms: Math.round(performance.now() - started) };
  }
}

/** Analyse all frames with a small worker pool. `onUpdate` fires as each frame starts and finishes. */
export async function analyzeFrames(
  frames: Frame[],
  runId: string,
  onUpdate: (result: FrameResult) => void,
): Promise<FrameResult[]> {
  const results: FrameResult[] = frames.map(pendingResult);
  let next = 0;
  const worker = async () => {
    while (next < frames.length) {
      const i = next++;
      onUpdate({ ...results[i], status: "running" });
      results[i] = await analyzeOne(frames[i], i, runId);
      onUpdate(results[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(v2Config.aiConcurrency, frames.length) }, worker));
  return results;
}
