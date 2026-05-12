function getNestedValue(source, path) {
  return path.split(".").reduce((current, key) => current?.[key], source);
}

function getUrlFromBody(body) {
  const paths = [
    "url",
    "video_url",
    "videoUrl",
    "assetUrl",
    "asset_url",
    "source_video_url",
    "media_url",
    "mediaUrl",
    "data.url",
    "data.video_url",
    "input.url",
    "input.video_url",
    "payload.url",
    "payload.video_url",
  ];

  for (const path of paths) {
    const value = getNestedValue(body, path);
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getUrlFromRequest(req) {
  const requestUrl = new URL(req.url);
  const keys = [
    "url",
    "video_url",
    "videoUrl",
    "assetUrl",
    "asset_url",
    "source_video_url",
    "media_url",
    "mediaUrl",
  ];

  for (const key of keys) {
    const value = requestUrl.searchParams.get(key);
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getExtension(url, mimeType) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();

  if (cleanUrl.endsWith(".gif") || mimeType.includes("gif")) return "gif";
  if (cleanUrl.endsWith(".webm") || mimeType.includes("webm")) return "webm";
  if (cleanUrl.endsWith(".mov") || mimeType.includes("quicktime")) return "mov";
  if (cleanUrl.endsWith(".m4v")) return "m4v";

  return "mp4";
}

function getFilename(url, extension) {
  try {
    const pathname = new URL(url).pathname;
    const lastSegment = pathname.split("/").filter(Boolean).pop();

    if (lastSegment && lastSegment.includes(".")) {
      return decodeURIComponent(lastSegment);
    }
  } catch {
    // Use default filename below.
  }

  return `unitysora-video-${Date.now()}.${extension}`;
}

function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return btoa(binary);
}

async function fetchMedia(url) {
  if (!url) {
    return { error: "Missing media URL", status: 400 };
  }

  const parsedUrl = new URL(url);
  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    return { error: "Invalid media URL", status: 400 };
  }

  const response = await fetch(url);
  if (!response.ok) {
    return { error: `Could not fetch media file: ${response.status}`, status: response.status };
  }

  return { response };
}

Deno.serve(async (req) => {
  try {
    if (req.method === "GET") {
      const url = getUrlFromRequest(req);
      const result = await fetchMedia(url);

      if (result.error) {
        return Response.json({ ok: false, error: result.error }, { status: result.status });
      }

      return new Response(result.response.body, {
        status: 200,
        headers: {
          "Content-Type": result.response.headers.get("content-type") || "application/octet-stream",
          "Content-Length": result.response.headers.get("content-length") || "",
        },
      });
    }

    if (req.method !== "POST") {
      return Response.json({ ok: false, error: "Method not allowed" }, { status: 405 });
    }

    const body = await req.json();
    const url = getUrlFromBody(body || {});
    const result = await fetchMedia(url);

    if (result.error) {
      return Response.json({ ok: false, error: result.error }, { status: result.status });
    }

    const mimeType = result.response.headers.get("content-type") || "application/octet-stream";
    const arrayBuffer = await result.response.arrayBuffer();
    const extension = getExtension(url, mimeType);
    const filename = getFilename(url, extension);

    return Response.json({
      ok: true,
      filename,
      mime_type: mimeType,
      extension,
      size_bytes: arrayBuffer.byteLength,
      base64: arrayBufferToBase64(arrayBuffer),
    });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});