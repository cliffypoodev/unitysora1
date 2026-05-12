function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type, authorization",
    },
  });
}

function getEnv(name) {
  if (typeof process !== "undefined" && process.env && process.env[name]) return process.env[name];
  if (typeof Deno !== "undefined" && Deno.env?.get) return Deno.env.get(name);
  return undefined;
}

async function readBody(request) {
  try {
    return await request.json();
  } catch {
    return {};
  }
}

function pickVideoUrl(data) {
  if (!data) return null;

  const candidates = [
    data.url,
    data.video_url,
    data.videoUrl,
    data.output_url,
    data.outputUrl,
    data.file_url,
    data.fileUrl,
    data?.data?.url,
    data?.data?.video_url,
    data?.data?.output_url,
    data?.output?.url,
    data?.output?.video_url,
    Array.isArray(data?.output) ? data.output[0] : null,
    Array.isArray(data?.urls) ? data.urls[0] : null,
  ];

  return candidates.find((value) => typeof value === "string" && value.trim()) || null;
}

function buildProviderInput(body) {
  const imageUrl = body.image_url || body.reference_image_url || body.input_image_url || body.first_frame_image_url;

  return {
    prompt: body.prompt,
    image: imageUrl,
    image_url: imageUrl,
    input_image: imageUrl,
    input_image_url: imageUrl,
    reference_image: imageUrl,
    reference_image_url: imageUrl,
    first_frame_image: imageUrl,
    first_frame_image_url: imageUrl,
    duration: body.duration || 4,
    aspect_ratio: body.aspect_ratio || "9:16",
    seed: body.seed,
    guidance_scale: body.guidance_scale || body.cfg_scale || 7,
    cfg_scale: body.cfg_scale || body.guidance_scale || 7,
    sampling_steps: body.sampling_steps || 50,
  };
}

async function callRunpod(body) {
  const endpoint = getEnv("RUNPOD_I2V_ENDPOINT_URL") || getEnv("RUNPOD_ENDPOINT_URL");
  const apiKey = getEnv("RUNPOD_API_KEY");

  if (!endpoint || !apiKey) return null;

  const input = buildProviderInput(body);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ input }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || data?.message || `RunPod request failed with ${response.status}`);
  }

  return data;
}

async function callFal(body) {
  const apiKey = getEnv("FAL_KEY") || getEnv("FAL_API_KEY");
  const endpoint = getEnv("FAL_I2V_ENDPOINT") || getEnv("FAL_ENDPOINT");

  if (!apiKey || !endpoint) return null;

  const input = buildProviderInput(body);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Key ${apiKey}`,
    },
    body: JSON.stringify(input),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.detail || data?.error || data?.message || `Fal request failed with ${response.status}`);
  }

  return data;
}

async function callReplicate(body) {
  const apiToken = getEnv("REPLICATE_API_TOKEN");
  const modelVersion = getEnv("REPLICATE_I2V_MODEL_VERSION");

  if (!apiToken || !modelVersion) return null;

  const input = buildProviderInput(body);
  const createResponse = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Token ${apiToken}`,
      prefer: "wait",
    },
    body: JSON.stringify({
      version: modelVersion,
      input,
    }),
  });

  const created = await createResponse.json().catch(() => ({}));

  if (!createResponse.ok) {
    throw new Error(created?.detail || created?.error || `Replicate request failed with ${createResponse.status}`);
  }

  return created;
}

export default async function handler(request) {
  if (request.method === "OPTIONS") return jsonResponse({ ok: true });
  if (request.method !== "POST") return jsonResponse({ ok: false, error: "Method not allowed" }, 405);

  const body = await readBody(request);
  const imageUrl = body.image_url || body.reference_image_url || body.input_image_url || body.first_frame_image_url;

  if (!body.prompt || !String(body.prompt).trim()) {
    return jsonResponse({ ok: false, error: "Prompt is required." }, 400);
  }

  if (!imageUrl || !String(imageUrl).trim()) {
    return jsonResponse({ ok: false, error: "Image-to-video requires a reference image URL." }, 400);
  }

  try {
    const providerName = getEnv("I2V_PROVIDER") || "auto";
    let providerResult = null;

    if (providerName === "runpod" || providerName === "auto") providerResult = await callRunpod(body);
    if (!providerResult && (providerName === "fal" || providerName === "auto")) providerResult = await callFal(body);
    if (!providerResult && (providerName === "replicate" || providerName === "auto")) providerResult = await callReplicate(body);

    if (!providerResult) {
      return jsonResponse({
        ok: false,
        error: "No image-to-video provider is configured. Add RUNPOD_I2V_ENDPOINT_URL + RUNPOD_API_KEY, or FAL_I2V_ENDPOINT + FAL_KEY, or REPLICATE_API_TOKEN + REPLICATE_I2V_MODEL_VERSION in Base44 function environment variables.",
        debug: {
          received_reference_image: true,
          received_prompt: true,
          supported_providers: ["runpod", "fal", "replicate"],
        },
      }, 501);
    }

    const videoUrl = pickVideoUrl(providerResult);

    if (!videoUrl) {
      return jsonResponse({
        ok: false,
        error: "The configured image-to-video provider returned successfully, but no playable video URL was found in the response.",
        provider_result: providerResult,
      }, 502);
    }

    return jsonResponse({
      ok: true,
      url: videoUrl,
      video_url: videoUrl,
      thumbnail_url: videoUrl,
      provider_result: providerResult,
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      error: error?.message || "Image-to-video generation failed.",
    }, 500);
  }
}