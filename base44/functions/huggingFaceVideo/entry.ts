import { createClientFromRequest } from "npm:@base44/sdk";
import { Client, handle_file } from "npm:@gradio/client";

const DEFAULT_SPACE = "OpenKing/wan2-video-generation";
const DEFAULT_API_NAME = "/generate_video";
const MAX_VIDEO_BYTES = 250 * 1024 * 1024;

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function normalizeDimension(value: unknown, minimum: number, maximum: number, fallback: number) {
  const clamped = clampInteger(value, minimum, maximum, fallback);
  return Math.max(minimum, Math.min(maximum, Math.round(clamped / 16) * 16));
}

function normalizeFrames(value: unknown) {
  const clamped = clampInteger(value, 25, 145, 73);
  return Math.max(25, Math.min(145, Math.round((clamped - 1) / 4) * 4 + 1));
}

function findMediaUrl(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return /^https?:\/\//i.test(value) ? value : null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaUrl(item);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["url", "video_url", "file_url", "output_url", "video", "data"]) {
      const found = findMediaUrl(record[key]);
      if (found) return found;
    }
    for (const item of Object.values(record)) {
      const found = findMediaUrl(item);
      if (found) return found;
    }
  }
  return null;
}

async function saveVideo(base44: ReturnType<typeof createClientFromRequest>, sourceUrl: string, token?: string) {
  const headers = token ? { Authorization: "Bearer " + token } : undefined;
  const response = await fetch(sourceUrl, { headers });
  if (!response.ok) {
    throw new Error("Hugging Face returned a video URL that could not be downloaded (" + response.status + ").");
  }

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

function jsonResponse(body: unknown, status: number) {
  return Response.json(body, { status });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return jsonResponse({ success: false, error: "Unauthorized" }, 401);

    const input = await req.json().catch(() => ({}));
    const prompt = String(input?.prompt || "").trim();
    const referenceImageUrl = String(input?.reference_image_url || "").trim();
    if (!prompt) return jsonResponse({ success: false, error: "Prompt is required." }, 400);
    if (prompt.length > 4000) return jsonResponse({ success: false, error: "Prompt must be 4,000 characters or fewer." }, 400);

    const width = normalizeDimension(input?.width, 512, 1920, 1024);
    const height = normalizeDimension(input?.height, 512, 1080, 576);
    const frames = normalizeFrames(input?.num_frames);
    const steps = clampInteger(input?.num_inference_steps, 20, 60, 28);
    const guidance = Math.min(15, Math.max(1, Number(input?.guidance_scale) || 5));
    const seed = Number.isInteger(Number(input?.seed)) ? Number(input.seed) : -1;
    const space = Deno.env.get("HF_VIDEO_SPACE") || DEFAULT_SPACE;
    const apiName = Deno.env.get("HF_VIDEO_API_NAME") || DEFAULT_API_NAME;
    const token = Deno.env.get("HF_TOKEN") || undefined;

    const client = await Client.connect(space, token ? { token } : {});
    const imageInput = referenceImageUrl ? handle_file(referenceImageUrl) : null;
    const job = client.submit(apiName, [
      prompt,
      imageInput,
      width,
      height,
      frames,
      steps,
      guidance,
      seed,
    ]);

    const encoder = new TextEncoder();
    let heartbeatId: number | undefined;
    let closed = false;

    const stream = new ReadableStream({
      start(controller) {
        const send = (event: unknown) => {
          if (closed) return;
          controller.enqueue(encoder.encode("data: " + JSON.stringify(event) + "\n\n"));
        };

        send({ type: "status", message: "Connected to Hugging Face. Waiting for a shared GPU..." });
        heartbeatId = setInterval(() => {
          send({ type: "status", message: "Generation is still running on Hugging Face..." });
        }, 15000);

        (async () => {
          try {
            for await (const message of job) {
              if (message?.type === "status") {
                const queuePosition = message?.position;
                const messageText = Number.isFinite(queuePosition)
                  ? "Queued on Hugging Face (position " + queuePosition + ")."
                  : "Hugging Face is processing the video...";
                send({ type: "status", message: messageText });
              }

              if (message?.type === "data") {
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
                closed = true;
                if (heartbeatId !== undefined) clearInterval(heartbeatId);
                controller.close();
                return;
              }
            }

            throw new Error("The Hugging Face video Space ended without returning a video.");
          } catch (error) {
            const message = error instanceof Error ? error.message : "Hugging Face video generation failed.";
            send({ type: "error", error: message });
            closed = true;
            if (heartbeatId !== undefined) clearInterval(heartbeatId);
            controller.close();
          }
        })();
      },
      cancel() {
        closed = true;
        if (heartbeatId !== undefined) clearInterval(heartbeatId);
        if (typeof job.cancel === "function") job.cancel();
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
    const message = error instanceof Error ? error.message : "Hugging Face video generation failed.";
    return jsonResponse({ success: false, error: message }, 500);
  }
});
