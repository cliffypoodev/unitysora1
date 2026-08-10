import { createClientFromRequest } from "npm:@base44/sdk";
import { secrets } from "base44:runtime";
import { Client } from "npm:@gradio/client";

const DEFAULT_SPACE = "black-forest-labs/FLUX.1-schnell";
const DEFAULT_API_NAME = "/infer";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
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
    for (const key of ["url", "image_url", "file_url", "output_url", "data"]) {
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

async function saveImage(base44: ReturnType<typeof createClientFromRequest>, sourceUrl: string, token?: string) {
  const headers = token ? { Authorization: "Bearer " + token } : undefined;
  const response = await fetch(sourceUrl, { headers });
  if (!response.ok) throw new Error("Hugging Face returned an image URL that could not be downloaded (" + response.status + ").");

  const blob = await response.blob();
  if (!blob.size) throw new Error("Hugging Face returned an empty image.");
  if (blob.size > MAX_IMAGE_BYTES) throw new Error("The generated image exceeded the 25 MB storage limit.");

  const extension = blob.type.includes("jpeg") ? "jpg" : blob.type.includes("webp") ? "webp" : "png";
  const file = new File([blob], "hugging-face-image-" + Date.now() + "." + extension, {
    type: blob.type || "image/png",
  });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  if (!uploaded?.file_url) throw new Error("The generated image could not be saved to Base44 storage.");
  return uploaded.file_url;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const input = await req.json().catch(() => ({}));
    const prompt = String(input?.prompt || "").trim();
    if (!prompt) return Response.json({ success: false, error: "Prompt is required." }, { status: 400 });
    if (prompt.length > 4000) return Response.json({ success: false, error: "Prompt must be 4,000 characters or fewer." }, { status: 400 });

    const width = clampInteger(input?.width, 256, 1536, 1024);
    const height = clampInteger(input?.height, 256, 1536, 1024);
    const steps = clampInteger(input?.steps, 1, 12, 4);
    const hasSeed = Number.isInteger(Number(input?.seed)) && Number(input?.seed) >= 0;
    const seed = hasSeed ? clampInteger(input.seed, 0, 2147483647, 0) : 0;
    const space = DEFAULT_SPACE;
    const apiName = DEFAULT_API_NAME;
    const token = secrets.get("HUGGINGFACE_API_KEY") || undefined;

    const client = await Client.connect(space, token ? { token } : {});
    const prediction = await client.predict(apiName, [
      prompt,
      seed,
      !hasSeed,
      width,
      height,
      steps,
    ]);

    const sourceUrl = findMediaUrl(prediction?.data);
    if (!sourceUrl) throw new Error("The Hugging Face image Space completed without returning an image URL.");

    const storedUrl = await saveImage(base44, sourceUrl, token);
    return Response.json({
      success: true,
      provider: "huggingface-space",
      space,
      model: "FLUX.1 Schnell",
      image_url: storedUrl,
      thumbnail_url: storedUrl,
      source_image_url: sourceUrl,
      width,
      height,
      steps,
      seed: hasSeed ? seed : null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hugging Face image generation failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});