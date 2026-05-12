function corsHeaders(extra = {}) {
  return {
    "access-control-allow-origin": "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    ...extra,
  };
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "content-type": "application/json" }),
  });
}

function getExtension(url, contentType = "") {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".gif") || contentType.includes("gif")) return "gif";
  if (cleanUrl.endsWith(".webm") || contentType.includes("webm")) return "webm";
  if (cleanUrl.endsWith(".mov") || contentType.includes("quicktime")) return "mov";
  return "mp4";
}

function getMimeType(extension, contentType = "") {
  if (contentType && contentType !== "application/octet-stream") return contentType;
  if (extension === "gif") return "image/gif";
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  return "video/mp4";
}

function isAllowedVideoUrl(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    return host === "media.base44.com" || host.endsWith(".base44.com");
  } catch {
    return false;
  }
}

async function readRequestUrl(request) {
  const currentUrl = new URL(request.url);
  const queryUrl = currentUrl.searchParams.get("url");
  if (queryUrl) return queryUrl;

  if (request.method === "POST") {
    const body = await request.json().catch(() => ({}));
    return body.url || body.video_url || body.assetUrl || "";
  }

  return "";
}

export default async function handler(request) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return jsonResponse({ ok: false, error: "Method not allowed" }, 405);
  }

  const videoUrl = await readRequestUrl(request);

  if (!videoUrl) {
    return jsonResponse({ ok: false, error: "Missing video URL." }, 400);
  }

  if (!isAllowedVideoUrl(videoUrl)) {
    return jsonResponse({ ok: false, error: "Only Base44 media URLs are allowed." }, 400);
  }

  try {
    const upstream = await fetch(videoUrl, {
      method: "GET",
      headers: {
        "user-agent": "UnitySora/1.0 video proxy",
        accept: "video/*,image/gif,*/*",
      },
    });

    if (!upstream.ok) {
      return jsonResponse({ ok: false, error: `Video fetch failed with ${upstream.status}` }, 502);
    }

    const arrayBuffer = await upstream.arrayBuffer();
    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      return jsonResponse({ ok: false, error: "Video file was empty." }, 502);
    }

    const upstreamType = upstream.headers.get("content-type") || "";
    const extension = getExtension(videoUrl, upstreamType);
    const mimeType = getMimeType(extension, upstreamType);
    const filename = `unitysora-video.${extension}`;

    return new Response(arrayBuffer, {
      status: 200,
      headers: corsHeaders({
        "content-type": mimeType,
        "content-length": String(arrayBuffer.byteLength),
        "content-disposition": `attachment; filename="${filename}"`,
        "cache-control": "private, max-age=300",
      }),
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error?.message || "Video proxy failed." }, 500);
  }
}
