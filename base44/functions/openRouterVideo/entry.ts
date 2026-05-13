import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const OPENROUTER_VIDEO_URL = "https://openrouter.ai/api/v1/videos";
const PRIMARY_MODEL = "alibaba/wan-2.6";
const FALLBACK_MODEL = "kwaivgi/kling-v3.0-std";
const POLL_INTERVAL_MS = 10000;
const MAX_POLL_TIME_MS = 8 * 60 * 1000;

const MODEL_CONFIG = {
  "alibaba/wan-2.6": { label: "Wan 2.6", maxDuration: 15 },
  "kwaivgi/kling-v3.0-std": { label: "Kling v3.0 Standard", maxDuration: 15 },
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeAspectRatio(aspectRatio) {
  if (aspectRatio === "9:16" || aspectRatio === "3:4") return "9:16";
  if (aspectRatio === "1:1") return "1:1";
  return "16:9";
}

function normalizeDuration(rawDuration, model) {
  const parsed = parseInt(String(rawDuration || 8), 10);
  const maxDuration = MODEL_CONFIG[model]?.maxDuration || 15;
  if (Number.isNaN(parsed)) return Math.min(8, maxDuration);
  if (parsed <= 4) return 4;
  if (parsed <= 8) return 8;
  if (parsed <= 10) return Math.min(10, maxDuration);
  return Math.min(15, maxDuration);
}

function normalizeSize(size, aspectRatio) {
  const value = String(size || "").trim();
  const allowed = new Set(["1280x720", "720x1280", "1024x1024", "1920x1080", "1080x1920"]);
  if (allowed.has(value)) return value;

  const normalizedAspect = normalizeAspectRatio(aspectRatio);
  if (normalizedAspect === "9:16") return "720x1280";
  if (normalizedAspect === "1:1") return "1024x1024";
  return "1280x720";
}

function isModelBlockMessage(message) {
  const text = String(message || "").toLowerCase();
  return ["guardrail", "safety", "policy", "moderation", "prohibited", "blocked", "rejected", "content violation"].some((term) => text.includes(term));
}

function buildHeaders() {
  const apiKey = Deno.env.get("OPENROUTER_API_KEY") || "";
  if (!apiKey) throw new Error("Missing OPENROUTER_API_KEY environment variable.");

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };

  const referer = Deno.env.get("OPENROUTER_SITE_URL") || "";
  const title = Deno.env.get("OPENROUTER_APP_NAME") || "UnitySora";
  if (referer) headers["HTTP-Referer"] = referer;
  if (title) headers["X-Title"] = title;
  return headers;
}

function buildVideoRequest({ model, prompt, duration, aspect_ratio, size, seed, reference_image_url, generate_audio }) {
  const body = {
    model,
    prompt: String(prompt || ""),
    duration: normalizeDuration(duration, model),
    aspect_ratio: normalizeAspectRatio(aspect_ratio),
    size: normalizeSize(size, aspect_ratio),
    generate_audio: Boolean(generate_audio),
  };

  if (Number.isInteger(seed)) body.seed = seed;

  if (reference_image_url) {
    body.frame_images = [{
      type: "image_url",
      image_url: { url: reference_image_url },
      frame_type: "first_frame",
    }];
  }

  return body;
}

async function submitVideoJob(body, headers) {
  const response = await fetch(OPENROUTER_VIDEO_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = data?.error?.message || data?.error || data?.message || `OpenRouter submit failed with status ${response.status}`;
    throw new Error(message);
  }

  if (!data?.polling_url || !data?.id) {
    throw new Error("OpenRouter did not return a valid job id/polling URL.");
  }

  return data;
}

async function pollVideoJob(pollingUrl, headers) {
  const startedAt = Date.now();
  const url = pollingUrl.startsWith("http") ? pollingUrl : `https://openrouter.ai${pollingUrl}`;

  while (Date.now() - startedAt < MAX_POLL_TIME_MS) {
    await sleep(POLL_INTERVAL_MS);
    const response = await fetch(url, { method: "GET", headers });
    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const message = data?.error?.message || data?.error || data?.message || `OpenRouter poll failed with status ${response.status}`;
      throw new Error(message);
    }

    const status = data?.status;
    if (status === "completed") return data;
    if (status === "failed" || status === "cancelled" || status === "expired") {
      throw new Error(data?.error || `Video generation ${status}.`);
    }
  }

  throw new Error("OpenRouter video generation timed out while polling.");
}

function extractPlayableUrl(statusData) {
  if (Array.isArray(statusData?.unsigned_urls) && statusData.unsigned_urls[0]) return statusData.unsigned_urls[0];
  if (typeof statusData?.content_url === "string" && statusData.content_url) return statusData.content_url;
  return null;
}

async function copyVideoToAppStorage(base44, sourceUrl, headers, id) {
  const response = await fetch(sourceUrl, { headers });
  if (!response.ok) throw new Error(`Generated video could not be downloaded from OpenRouter (${response.status}).`);

  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error("Generated video download was empty.");

  const file = new File([blob], `openrouter-video-${id || Date.now()}.mp4`, { type: blob.type || "video/mp4" });
  const uploaded = await base44.asServiceRole.integrations.Core.UploadFile({ file });
  if (!uploaded?.file_url) throw new Error("Generated video could not be saved to app storage.");
  return uploaded.file_url;
}

async function runAttempt(base44, model, input, headers) {
  const requestBody = buildVideoRequest({
    model,
    prompt: input.prompt,
    duration: input.duration,
    aspect_ratio: input.aspect_ratio,
    size: input.size,
    seed: input.seed,
    reference_image_url: input.reference_image_url,
    generate_audio: input.generate_audio,
  });

  const submitted = await submitVideoJob(requestBody, headers);
  const finished = await pollVideoJob(submitted.polling_url, headers);
  const playableUrl = extractPlayableUrl(finished);

  if (!playableUrl) throw new Error("OpenRouter completed, but no downloadable video URL was returned.");

  const storedVideoUrl = await copyVideoToAppStorage(base44, playableUrl, headers, finished.id || submitted.id);

  return {
    ok: true,
    model_used: model,
    model_label: MODEL_CONFIG[model]?.label || model,
    id: finished.id || submitted.id,
    polling_url: submitted.polling_url,
    status: finished.status || "completed",
    video_url: storedVideoUrl,
    thumbnail_url: storedVideoUrl,
    source_video_url: playableUrl,
    usage: finished.usage || null,
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const input = await req.json();
    if (!input || typeof input.prompt !== "string" || !input.prompt.trim()) {
      return Response.json({ ok: false, error: "Prompt is required." }, { status: 400 });
    }

    const headers = buildHeaders();
    const preferredModel = input.preferred_model || PRIMARY_MODEL;
    const fallbackModel = input.fallback_model || FALLBACK_MODEL;
    const orderedModels = [preferredModel, fallbackModel].filter((model, index, arr) => model && arr.indexOf(model) === index);
    const errors = [];

    for (const model of orderedModels) {
      try {
        const result = await runAttempt(base44, model, input, headers);
        return Response.json({ ok: true, ...result, attempted_models: [...errors.map((item) => item.model), model] });
      } catch (error) {
        errors.push({ model, error: error?.message || "Unknown model failure." });
      }
    }

    const summary = errors.map((item) => `${item.model}: ${item.error}`).join(" | ");
    const modelBlocked = isModelBlockMessage(summary);
    return Response.json({
      ok: false,
      provider_blocked: modelBlocked,
      error: modelBlocked ? `The model/provider rejected this prompt. ${summary}` : `All video model attempts failed. ${summary}`,
    }, { status: modelBlocked ? 422 : 500 });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});