/**
 * v2 runtime configuration.
 *
 * Every value comes from the environment so the same build runs on Vercel,
 * a VPS or anywhere else. Values can also be overridden at runtime without a
 * rebuild by defining `window.__GL_CONFIG__` before the app loads (for example
 * from a small `/config.js` served by the host).
 */
type RuntimeOverrides = Partial<Record<keyof V2Config, string | number>>;

export interface V2Config {
  supabaseUrl: string;
  supabaseKey: string;
  /** true when v2 uses the same backend as v1 (shared login session) */
  sharedBackend: boolean;
  evidenceBucket: string;
  detectFunction: string;
  framesPerVideo: number;
  aiConcurrency: number;
  confirmThreshold: number;
  basePath: string;
}

const env = import.meta.env as Record<string, string | undefined>;
const runtime: RuntimeOverrides =
  (typeof window !== "undefined" && (window as unknown as { __GL_CONFIG__?: RuntimeOverrides }).__GL_CONFIG__) || {};

function str(key: keyof V2Config, envKey: string, fallback = ""): string {
  const r = runtime[key];
  if (r !== undefined && r !== "") return String(r);
  const e = env[envKey];
  return e !== undefined && e !== "" ? e : fallback;
}

function num(key: keyof V2Config, envKey: string, fallback: number, min: number, max: number): number {
  const n = Number(str(key, envKey, String(fallback)));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

const v1Url = env.VITE_SUPABASE_URL ?? "";
const v1Key = env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "";
const supabaseUrl = str("supabaseUrl", "VITE_V2_SUPABASE_URL", v1Url);
const supabaseKey = str("supabaseKey", "VITE_V2_SUPABASE_PUBLISHABLE_KEY", v1Key);

export const v2Config: V2Config = {
  supabaseUrl,
  supabaseKey,
  sharedBackend: supabaseUrl === v1Url && supabaseKey === v1Key,
  evidenceBucket: str("evidenceBucket", "VITE_V2_EVIDENCE_BUCKET", "evidence"),
  detectFunction: str("detectFunction", "VITE_V2_DETECT_FUNCTION", "process-evidence"),
  framesPerVideo: Math.round(num("framesPerVideo", "VITE_V2_FRAMES_PER_VIDEO", 5, 1, 12)),
  aiConcurrency: Math.round(num("aiConcurrency", "VITE_V2_AI_CONCURRENCY", 3, 1, 8)),
  confirmThreshold: num("confirmThreshold", "VITE_V2_CONFIRM_THRESHOLD", 0.6, 0.1, 1),
  basePath: "/v2",
};
