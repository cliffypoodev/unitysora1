import { createClientFromRequest } from "npm:@base44/sdk@0.8.41";
import { secrets } from "base44:runtime";
import { Client, handle_file } from "npm:@gradio/client";

const DEFAULT_SPACE = "OpenKing/wan2-video-generation";
const DEFAULT_API_NAME = "/generate_video";
const MINIMAX_SPACE = "akhaliq/MiniMax-H3-Turbo-Lora";
const MINIMAX_API_NAME = "/generate";
const MINIMAX_FILE_BASE = "https://akhaliq-minimax-h3-turbo-lora.hf.space/gradio_api/file=";
const MINIMAX_CANVAS = {
  "16:9": "1024x576 · 16:9 fast",
  "9:16": "544x960 · 9:16 fast",
  "1:1": "768x768 · 1:1 full",
};
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function clampInteger(value, minimum, maximum, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function normalizeDimension(value, minimum, maximum, fallback) {
  const clamped = clampInteger(value, minimum, maximum, fallback);
  return Math.max(minimum, Math.min(maximum, Math.round(clamped / 16) * 16));
}

function normalizeFrames(value) {
  const clamped = clampInteger(value, 25, 145, 73);
  return Math.max(25, Math.min(145, Math.round((clamped - 1) / 4) * 4 + 1));
}

function findMediaUrl(value) {
  if (!value) return null;
  if (typeof value === "string") {
    return value.startsWith("https://") || value.startsWith("http://") ? value : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    for (const key of ["url", "video_url", "file_url", "output_url", "video", "data"]) {
      const found = findMediaUrl(value[key]);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = findMediaUrl(item);
      if (found) return found;
    }
  }
  return null;
}

function findMediaPath(value) {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaPath(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    if (typeof value.path === "string" && [".mp4", ".webm", ".mov"].some((extension) => value.path.toLowerCase().endsWith(extension))) {
      return value.path;
    }
    for (const item of Object.values(value)) {
      const found = findMediaPath(item);
      if (found) return found;
    }
  }
  return null;
}

async function saveVideo(base44, sourceUrl, token) {
  const headers = token ? { Authorization: "Bearer " + token } : undefined;
  const response = await fetch(sourceUrl, { headers });
  if (!response.ok) throw new Error("Hugging Face returned a video URL that could not be downloaded (" + response.status + ").");

  const blob = await response.blob();
  if (!blob.size) throw new Error("Hugging Face returned an empty video.");
  if (blob.size > MAX_VIDEO_BYTES) throw new Error("The generated video exceeded the 250 MB storage limit.");

  const extension = blob.type.includes("webm") ? "webm" : blob.type.includes("quicktime") ? "mov" : "mp4";
  const file = new File([blob], "hugging-face-video-" + Date.now() + "." + extension, {
    type: blob.type || "video/mp4",
  });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  if (!uploaded?.file_url) throw new Error("The generated video could not be saved to Base44 storage.");
  return uploaded.file_url;
}

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const input = await req.json().catch(() => ({}));
    const prompt = String(input?.prompt || "").trim();
    const referenceImageUrl = String(input?.reference_image_url || "").trim();
    const model = input?.model === "minimax_h3" ? "minimax_h3" : "wan_2_2";
    if (!prompt) return Response.json({ success: false, error: "Prompt is required." }, { status: 400 });
    if (prompt.length > 4000) return Response.json({ success: false, error: "Prompt must be 4,000 characters or fewer." }, { status: 400 });

    const width = normalizeDimension(input?.width, 512, 1920, 1024);
    const height = normalizeDimension(input?.height, 512, 1080, 576);
    const frames = normalizeFrames(input?.num_frames);
    const steps = clampInteger(input?.num_inference_steps, 20, 60, 28);
    const guidance = Math.min(15, Math.max(1, Number(input?.guidance_scale) || 5));
    const seed = Number.isInteger(Number(input?.seed)) ? Number(input.seed) : -1;
    const isMiniMax = model === "minimax_h3";
    const space = isMiniMax ? MINIMAX_SPACE : DEFAULT_SPACE;
    const apiName = isMiniMax ? MINIMAX_API_NAME : DEFAULT_API_NAME;
    const token = secrets.get("HUGGINGFACE_API_KEY") || undefined;

    const client = await Client.connect(space, token ? { token } : {});
    const imageInput = referenceImageUrl ? handle_file(referenceImageUrl) : null;
    const aspectRatio = ["16:9", "9:16", "1:1"].includes(input?.aspect_ratio) ? input.aspect_ratio : "16:9";
    const durationSeconds = clampInteger(input?.duration_seconds, 2, 14, 5);
    const generationArgs = isMiniMax
      ? {
          prompt,
          image_path: imageInput,
          last_image_path: null,
          canvas: MINIMAX_CANVAS[aspectRatio],
          duration: durationSeconds,
          steps: 6,
          seed,
          upsample: false,
          use_lora: true,
          lora: "",
        }
      : [prompt, imageInput, width, height, frames, steps, guidance, seed];

    const encoder = new TextEncoder();
    let heartbeatId;
    let closed = false;
    let job = null;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event) => {
          if (!closed) controller.enqueue(encoder.encode("data: " + JSON.stringify(event) + "\n\n"));
        };
        const finish = () => {
          closed = true;
          if (heartbeatId !== undefined) clearInterval(heartbeatId);
          controller.close();
        };

        send({ type: "status", message: "Connected to Hugging Face. Waiting for a shared GPU..." });
        heartbeatId = setInterval(() => {
          send({ type: "status", message: "Generation is still running on Hugging Face..." });
        }, 15000);

        (async () => {
          try {
            if (isMiniMax) {
              send({ type: "status", message: "MiniMax-H3 is processing the video and soundtrack..." });
              const prediction = await client.predict(apiName, generationArgs);
              const mediaPath = findMediaPath(prediction?.data);
              const sourceUrl = findMediaUrl(prediction?.data) || (mediaPath ? MINIMAX_FILE_BASE + mediaPath : null);
              if (!sourceUrl) throw new Error("The MiniMax-H3 Space completed without returning a video.");

              send({ type: "status", message: "Saving the finished video to private app storage..." });
              const storedUrl = await saveVideo(base44, sourceUrl, token);
              send({
                type: "complete",
                data: {
                  success: true,
                  provider: "huggingface-space",
                  space,
                  model: "MiniMax-H3 Turbo LoRA",
                  video_url: storedUrl,
                  thumbnail_url: storedUrl,
                  source_video_url: sourceUrl,
                  width,
                  height,
                  num_frames: frames,
                  num_inference_steps: 6,
                  guidance_scale: guidance,
                  seed,
                  mode: referenceImageUrl ? "i2v" : "t2v",
                },
              });
              finish();
              return;
            }

            job = client.submit(apiName, generationArgs);
            for await (const message of job) {
              if (message?.type === "status") {
                const queuePosition = message?.position;
                send({
                  type: "status",
                  message: Number.isFinite(queuePosition)
                    ? "Queued on Hugging Face (position " + queuePosition + ")."
                    : "Hugging Face is processing the video...",
                });
              }
              if (message?.type !== "data") continue;

              const sourceUrl = findMediaUrl(message.data);
              if (!sourceUrl) continue;
              send({ type: "status", message: "Saving the finished video to private app storage..." });
              const storedUrl = await saveVideo(base44, sourceUrl, token);
              send({
                type: "complete",
                data: {
                  success: true,
                  provider: "huggingface-space",
                  space,
                  model: "Wan 2.2 TI2V 5B",
                  video_url: storedUrl,
                  thumbnail_url: storedUrl,
                  source_video_url: sourceUrl,
                  width,
                  height,
                  num_frames: frames,
                  num_inference_steps: steps,
                  guidance_scale: guidance,
                  seed,
                  mode: referenceImageUrl ? "i2v" : "t2v",
                },
              });
              finish();
              return;
            }
            throw new Error("The Hugging Face video Space ended without returning a video.");
          } catch (error) {
            send({ type: "error", error: error instanceof Error ? error.message : "Hugging Face video generation failed." });
            finish();
          }
        })();
      },
      cancel() {
        closed = true;
        if (heartbeatId !== undefined) clearInterval(heartbeatId);
        if (typeof job?.cancel === "function") job.cancel();
      },
    });

    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        "x-accel-buffering": "no",
      },
    });
  } catch (error) {
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Hugging Face video generation failed." },
      { status: 500 },
    );
  }
}