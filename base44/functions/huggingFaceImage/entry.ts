import { createClientFromRequest } from "npm:@base44/sdk";
import { secrets } from "base44:runtime";
import { Client } from "npm:@gradio/client";

const DEFAULT_SPACE = "black-forest-labs/FLUX.1-schnell";
const DEFAULT_API_NAME = "/infer";
const NSFW_SPACE = "IbarakiDouji/WAI-NSFW-illustrious-SDXL";
const NSFW_API_NAME = "/generate";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_SEED = 2147483647;
const BASE_NEGATIVE_PROMPT = "bad quality, worst quality, worst detail, sketch, censor, watermark";

function clampInteger(value: unknown, minimum: number, maximum: number, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(maximum, Math.max(minimum, Math.round(parsed)));
}

function normalizeDimension(value: unknown, minimum: number, maximum: number, fallback: number) {
  const clamped = clampInteger(value, minimum, maximum, fallback);
  return Math.min(maximum, Math.max(minimum, Math.round(clamped / 8) * 8));
}

function randomSeed() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return values[0] & MAX_SEED;
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

function getFluxReturnedSeed(data: unknown, fallback: number) {
  if (!Array.isArray(data)) return fallback;
  const returnedSeed = Number(data[1]);
  return Number.isInteger(returnedSeed)
    ? clampInteger(returnedSeed, 0, MAX_SEED, fallback)
    : fallback;
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
    const nsfw = input?.nsfw === true;
    const prompt = String(input?.prompt || "").trim();
    if (!prompt) return Response.json({ success: false, error: "Prompt is required." }, { status: 400 });
    if (prompt.length > 4000) return Response.json({ success: false, error: "Prompt must be 4,000 characters or fewer." }, { status: 400 });

    const styleNegativePrompt = String(input?.negative_prompt || "").trim().slice(0, 2000);
    const negativePrompt = [BASE_NEGATIVE_PROMPT, styleNegativePrompt].filter(Boolean).join(", ");
    const minimumDimension = nsfw ? 1024 : 256;
    const maximumDimension = nsfw ? 2880 : 2048;
    const width = normalizeDimension(input?.width, minimumDimension, maximumDimension, nsfw ? 1536 : 1024);
    const height = normalizeDimension(input?.height, minimumDimension, maximumDimension, nsfw ? 1536 : 1024);
    const steps = clampInteger(input?.steps, 1, 50, nsfw ? 28 : 4);
    const hasSeed =
      input?.seed !== undefined &&
      input?.seed !== null &&
      input?.seed !== "" &&
      Number.isInteger(Number(input.seed)) &&
      Number(input.seed) >= 0 &&
      Number(input.seed) <= MAX_SEED;
    const requestedSeed = hasSeed ? Number(input.seed) : randomSeed();
    const space = nsfw ? NSFW_SPACE : DEFAULT_SPACE;
    const apiName = nsfw ? NSFW_API_NAME : DEFAULT_API_NAME;
    const token = secrets.get("HUGGINGFACE_API_KEY") || undefined;

    const client = await Client.connect(space, token ? { token } : {});
    const prediction = await client.predict(apiName, nsfw ? [
      prompt,
      negativePrompt,
      requestedSeed,
      width,
      height,
      7,
      steps,
      "Euler a",
      "v17",
      "Custom",
      false,
      0.55,
      1.5,
      true,
    ] : [
      prompt,
      requestedSeed,
      !hasSeed,
      width,
      height,
      steps,
    ]);

    const sourceUrl = findMediaUrl(prediction?.data);
    if (!sourceUrl) throw new Error("The Hugging Face image Space completed without returning an image URL.");

    const storedUrl = await saveImage(base44, sourceUrl, token);
    const actualSeed = nsfw ? requestedSeed : getFluxReturnedSeed(prediction?.data, requestedSeed);

    return Response.json({
      success: true,
      provider: "huggingface-space",
      space,
      model: nsfw ? "WAI NSFW illustrious SDXL v17" : "FLUX.1 Schnell",
      image_url: storedUrl,
      thumbnail_url: storedUrl,
      source_image_url: sourceUrl,
      width,
      height,
      steps,
      seed: actualSeed,
      aspect_ratio: String(input?.aspect_ratio || "1:1"),
      output_size: String(input?.output_size || "standard"),
      quality: String(input?.quality || "balanced"),
      negative_prompt_applied: nsfw,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hugging Face image generation failed.";
    return Response.json({ success: false, error: message }, { status: 500 });
  }
});
