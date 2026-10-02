export interface Frame {
  /** position in the source video in seconds (0 for still images) */
  timeSec: number;
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
}

const MAX_WIDTH = 1600;
const JPEG_QUALITY = 0.88;

function canvasToJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode frame"))), "image/jpeg", JPEG_QUALITY),
  );
}

async function drawToFrame(source: CanvasImageSource, w: number, h: number, timeSec: number): Promise<Frame> {
  if (!w || !h) throw new Error("Source has no picture data");
  const scale = Math.min(1, MAX_WIDTH / w);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is not available in this browser");
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  const blob = await canvasToJpeg(canvas);
  return { timeSec, blob, previewUrl: URL.createObjectURL(blob), width: canvas.width, height: canvas.height };
}

/** Evenly spaced sample times, avoiding the very first and last instants of the clip. */
export function sampleTimes(durationSec: number, count: number): number[] {
  if (!Number.isFinite(durationSec) || durationSec <= 0) return [0];
  if (count <= 1) return [durationSec / 2];
  return Array.from({ length: count }, (_, i) => +(((i + 0.5) * durationSec) / count).toFixed(3));
}

function seek(video: HTMLVideoElement, t: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("Could not read this video")); };
    const cleanup = () => { video.removeEventListener("seeked", done); video.removeEventListener("error", fail); };
    video.addEventListener("seeked", done);
    video.addEventListener("error", fail);
    video.currentTime = t;
  });
}

/** Sample `count` frames from a video file, in the browser. */
export async function framesFromVideo(file: Blob, count: number): Promise<Frame[]> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("This video format is not supported by the browser"));
      video.src = url;
    });
    const frames: Frame[] = [];
    for (const t of sampleTimes(video.duration, count)) {
      await seek(video, t);
      frames.push(await drawToFrame(video, video.videoWidth, video.videoHeight, t));
    }
    return frames;
  } finally {
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}

export async function frameFromImage(file: Blob): Promise<Frame> {
  const bitmap = await createImageBitmap(file);
  try {
    return await drawToFrame(bitmap, bitmap.width, bitmap.height, 0);
  } finally {
    bitmap.close();
  }
}

/** Grab the current picture of a playing <video> (device camera or live stream). */
export function frameFromVideoElement(video: HTMLVideoElement, timeSec = 0): Promise<Frame> {
  return drawToFrame(video, video.videoWidth, video.videoHeight, timeSec);
}

export function releaseFrames(frames: Frame[]) {
  frames.forEach((f) => URL.revokeObjectURL(f.previewUrl));
}
