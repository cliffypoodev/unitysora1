import { X, Heart, Copy, Wand2, AlertTriangle, Share2, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function hasPlayableVideo(video) {
  return Boolean(video?.video_url && String(video.video_url).trim());
}

function getPoster(video) {
  return video?.thumbnail_url || video?.reference_image_url || "";
}

function getAssetUrl(video) {
  return video?.video_url || video?.thumbnail_url || "";
}

function buildAbsoluteUrl(url) {
  if (!url) return "";
  try {
    return new URL(url, window.location.origin).href;
  } catch {
    return url;
  }
}

function getFileExtensionFromUrl(url, mimeType = "") {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  if (cleanUrl.endsWith(".gif") || mimeType.includes("gif")) return "gif";
  if (cleanUrl.endsWith(".webm") || mimeType.includes("webm")) return "webm";
  if (cleanUrl.endsWith(".mov") || mimeType.includes("quicktime")) return "mov";
  return "mp4";
}

function getMimeType(extension, blobType = "") {
  if (blobType && blobType !== "application/octet-stream") return blobType;
  if (extension === "gif") return "image/gif";
  if (extension === "webm") return "video/webm";
  if (extension === "mov") return "video/quicktime";
  return "video/mp4";
}

async function copyToClipboard(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function getProxyUrls(assetUrl) {
  const encoded = encodeURIComponent(assetUrl);
  const origin = window.location.origin;

  return [
    `${origin}/api/functions/videoFileProxy?url=${encoded}`,
    `${origin}/functions/videoFileProxy?url=${encoded}`,
  ];
}

async function fetchProxyBlob(assetUrl) {
  let lastError = null;

  for (const proxyUrl of getProxyUrls(assetUrl)) {
    try {
      const response = await fetch(proxyUrl, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Proxy failed with ${response.status}`);
      }

      const blob = await response.blob();

      if (!blob || blob.size === 0) {
        throw new Error("Proxy returned an empty file.");
      }

      return blob;
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError || new Error("No video proxy endpoint worked.");
}

async function buildVideoFile(assetUrl, videoId) {
  let blob = null;

  try {
    blob = await fetchProxyBlob(assetUrl);
  } catch (proxyError) {
    console.warn("[UnitySora] Video proxy failed. Trying direct video fetch.", proxyError);

    const response = await fetch(assetUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });

    if (!response.ok) {
      throw new Error("Could not fetch the video file.");
    }

    blob = await response.blob();
  }

  if (!blob || blob.size === 0) {
    throw new Error("The video file was empty.");
  }

  const extension = getFileExtensionFromUrl(assetUrl, blob.type);
  const mimeType = getMimeType(extension, blob.type);
  const typedBlob =
    blob.type === mimeType ? blob : new Blob([blob], { type: mimeType });

  return new File(
    [typedBlob],
    `unitysora-video-${videoId || Date.now()}.${extension}`,
    { type: mimeType }
  );
}

export default function VideoModal({ video, onClose, onLike }) {
  const [message, setMessage] = useState("");
  const [sharing, setSharing] = useState(false);

  if (!video) return null;

  const playable = hasPlayableVideo(video);
  const isDemo = !video.id && Boolean(video.thumbnail_url);
  const assetUrl = buildAbsoluteUrl(getAssetUrl(video));
  const canExport = Boolean(assetUrl);

  const showMessage = (text) => {
    setMessage(text);
    window.setTimeout(() => setMessage(""), 5500);
  };

  const handleShareSave = async () => {
    if (!assetUrl || sharing) return;
    setSharing(true);

    try {
      if (!navigator.share) {
        const copied = await copyToClipboard(assetUrl);
        showMessage(copied ? "Video link copied. Open the video and use browser save/share controls." : "Use Open Video to save/share from your browser.");
        return;
      }

      try {
        showMessage("Preparing the actual video file for iOS...");
        const file = await buildVideoFile(assetUrl, video.id);

        if (!navigator.canShare || navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "UnitySora video",
            text: video.prompt || "Generated video",
            files: [file],
          });
          showMessage("Video file share/save menu opened.");
          return;
        }
      } catch (fileError) {
        console.warn("[UnitySora] File share failed, falling back to URL share", fileError);
      }

      try {
        await navigator.share({
          title: "UnitySora video link",
          text: video.prompt || "Generated video",
          url: assetUrl,
        });
        showMessage("Only the video link could be shared. If Save Video is missing, tap Open Video and use the browser controls.");
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }

      const copied = await copyToClipboard(assetUrl);
      showMessage(copied ? "Video link copied. Open the video and use browser save/share controls." : "Use Open Video to save/share from your browser.");
    } finally {
      setSharing(false);
    }
  };

  const handleCopyPrompt = async () => {
    const copied = await copyToClipboard(video.prompt || "");
    showMessage(copied ? "Prompt copied." : "Could not copy prompt.");
  };

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(assetUrl);
    showMessage(copied ? "Video link copied." : "Could not copy video link.");
  };

  const handleOpenVideo = () => {
    if (!assetUrl) return;
    window.open(assetUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/70">
      <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="relative bg-black">
          {playable ? (
            <video
              src={video.video_url}
              controls
              playsInline
              preload="metadata"
              className="w-full object-contain max-h-[52vh]"
              poster={getPoster(video)}
            />
          ) : isDemo ? (
            <img src={video.thumbnail_url} alt={video.prompt || "Video preview"} className="w-full object-contain max-h-[52vh]" />
          ) : (
            <div className="min-h-[220px] flex flex-col items-center justify-center text-white/80 p-8 text-center">
              <AlertTriangle className="w-10 h-10 mb-3 text-yellow-400" />
              <p className="font-semibold">No playable video URL was returned.</p>
              <p className="text-sm text-white/60 mt-1">This generation should be treated as failed, not completed.</p>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/70 hover:bg-black/90 text-white rounded-full p-2 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 pb-5">
          {canExport && (
            <div className="mb-4 rounded-xl border border-border bg-muted/30 p-3">
              <Button type="button" size="lg" className="w-full gap-2 bg-primary hover:bg-primary/90" disabled={sharing} onClick={handleShareSave}>
                <Share2 className="w-4 h-4" /> {sharing ? "Preparing Video File..." : "Save Video / Share File"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
                This prepares the actual video file so iOS can show Save Video. If iOS blocks file sharing, use Open Video as a fallback.
              </p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleOpenVideo}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open Video
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopyLink}>
                  <Copy className="w-3.5 h-3.5" /> Copy Link
                </Button>
              </div>
            </div>
          )}

          {message && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{message}</span>
            </div>
          )}

          <p className="text-foreground text-sm leading-relaxed mb-4">{video.prompt}</p>

          {video.error_message && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
              {video.error_message}
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="text-xs">{video.resolution}</Badge>
            <Badge variant="outline" className="text-xs">{video.aspect_ratio}</Badge>
            <Badge variant="outline" className="text-xs">{video.duration}</Badge>
            <Badge variant="outline" className="text-xs">{video.mode === "i2v" ? "Image-to-Video" : "Text-to-Video"}</Badge>
            {!playable && !isDemo && <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">Missing Video</Badge>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onLike?.(video)}>
              <Heart className="w-3.5 h-3.5" /> {video.likes || 0} Likes
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyPrompt}>
              <Copy className="w-3.5 h-3.5" /> Copy Prompt
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { window.location.href = `/generate?prompt=${encodeURIComponent(video.prompt || "")}`; }}>
              <Wand2 className="w-3.5 h-3.5" /> Use Prompt
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}