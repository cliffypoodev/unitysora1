/**
 * Shared share / download / clipboard helpers.
 * Previously duplicated across ImageModal and VideoModal.
 */

export function buildAbsoluteUrl(url) {
  if (!url) return "";
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

export function getExtension(url, mimeType = "", kind = "image") {
  const clean = String(url || "").split("?")[0].toLowerCase();
  if (kind === "video") {
    if (clean.endsWith(".gif") || mimeType.includes("gif")) return "gif";
    if (clean.endsWith(".webm") || mimeType.includes("webm")) return "webm";
    if (clean.endsWith(".mov") || mimeType.includes("quicktime")) return "mov";
    return "mp4";
  }
  if (clean.endsWith(".jpg") || clean.endsWith(".jpeg") || mimeType.includes("jpeg")) return "jpg";
  if (clean.endsWith(".webp") || mimeType.includes("webp")) return "webp";
  if (clean.endsWith(".gif") || mimeType.includes("gif")) return "gif";
  return "png";
}

export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const copied = document.execCommand("copy");
    document.body.removeChild(textarea);
    return copied;
  }
}

async function fetchAsFile(url, kind, id) {
  const response = await fetch(url, { method: "GET", mode: "cors", cache: "no-store" });
  if (!response.ok) throw new Error("The file could not be fetched.");

  const blob = await response.blob();
  if (!blob || blob.size === 0) throw new Error("The file was empty.");

  const extension = getExtension(url, blob.type, kind);
  const fallbackType =
    kind === "video"
      ? extension === "mov"
        ? "video/quicktime"
        : extension === "webm"
          ? "video/webm"
          : "video/mp4"
      : extension === "jpg"
        ? "image/jpeg"
        : `image/${extension}`;

  return new File([blob], `unitysora-${kind}-${id || Date.now()}.${extension}`, {
    type: blob.type || fallbackType,
  });
}

/**
 * iOS-first save path: native share sheet with the actual file, then the URL,
 * then clipboard. Returns a short status string for the UI.
 */
export async function shareMedia({ url, kind = "image", id, prompt }) {
  const assetUrl = buildAbsoluteUrl(url);
  if (!assetUrl) return "Nothing to share.";

  if (navigator.share) {
    try {
      const file = await fetchAsFile(assetUrl, kind, id);
      if (!navigator.canShare || navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `UnitySora ${kind}`,
          text: prompt || `Generated ${kind}`,
          files: [file],
        });
        return "Share sheet opened — choose Save to Photos.";
      }
    } catch (error) {
      if (error?.name === "AbortError") return "";
    }

    try {
      await navigator.share({ title: `UnitySora ${kind}`, text: prompt || "", url: assetUrl });
      return "Share sheet opened with the link.";
    } catch (error) {
      if (error?.name === "AbortError") return "";
    }
  }

  const copied = await copyToClipboard(assetUrl);
  return copied ? "Link copied — sharing is unavailable here." : "Sharing is unavailable here.";
}

export async function downloadMedia({ url, kind = "image", id }) {
  const assetUrl = buildAbsoluteUrl(url);
  if (!assetUrl) return "Nothing to download.";

  try {
    const file = await fetchAsFile(assetUrl, kind, id);
    const objectUrl = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = file.name;
    link.rel = "noopener noreferrer";
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    window.setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(objectUrl);
    }, 1000);
    return "Download started.";
  } catch {
    const copied = await copyToClipboard(assetUrl);
    return copied
      ? "Download was blocked — link copied instead."
      : "Download was blocked. Try Share instead.";
  }
}

/** Aspect ratio as a number (width / height), for masonry layout. */
export function getAspectRatio(item, fallback = 1) {
  const width = Number(item?.width);
  const height = Number(item?.height);
  if (width > 0 && height > 0) return width / height;

  const resolution = String(item?.resolution || "");
  const parsed = resolution.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (parsed) {
    const w = Number(parsed[1]);
    const h = Number(parsed[2]);
    if (w > 0 && h > 0) return w / h;
  }

  const ratio = String(item?.aspect_ratio || "");
  const split = ratio.match(/^(\d+)\s*:\s*(\d+)$/);
  if (split) {
    const w = Number(split[1]);
    const h = Number(split[2]);
    if (w > 0 && h > 0) return w / h;
  }

  return fallback;
}
