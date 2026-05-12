import { X, Heart, Copy, Wand2, AlertTriangle, Share2, ExternalLink, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";

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

function base64ToBlob(base64, mimeType) {
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new Blob([bytes], { type: mimeType });
}

async function invokeVideoFileProxy(payload) {
  if (base44.integrations?.Core?.InvokeFunction) {
    return base44.integrations.Core.InvokeFunction({
      name: "videoFileProxy",
      data: payload,
    });
  }

  if (base44.functions?.videoFileProxy) {
    return base44.functions.videoFileProxy(payload);
  }

  if (base44.functions?.invoke) {
    return base44.functions.invoke("videoFileProxy", payload);
  }

  if (base44.integrations?.Core?.InvokeBackendFunction) {
    return base44.integrations.Core.InvokeBackendFunction({
      name: "videoFileProxy",
      data: payload,
    });
  }

  throw new Error("Video proxy function is unavailable.");
}

async function buildVideoFile(assetUrl, videoId) {
  const payload = {
    url: assetUrl,
    video_url: assetUrl,
    return_json: true,
    return_base64: true,
  };

  const rawResult = await invokeVideoFileProxy(payload);
  const result = rawResult?.data || rawResult || {};
  const fileData = result.base64 || result.data?.base64 || result.response?.base64;

  if (!fileData) {
    throw new Error("Video proxy did not return file data.");
  }

  const extension = result.extension || result.data?.extension || result.response?.extension || getFileExtensionFromUrl(assetUrl);
  const mimeType = result.mime_type || result.data?.mime_type || result.response?.mime_type || getMimeType(extension);
  const filename = result.filename || result.data?.filename || result.response?.filename || `unitysora-video-${videoId || Date.now()}.${extension}`;
  const blob = base64ToBlob(fileData, mimeType);

  return new File([blob], filename, { type: mimeType });
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
        showMessage("Video file could not be prepared on this device.");
        return;
      }

      showMessage("Preparing the actual video file for iOS...");
      const file = await buildVideoFile(assetUrl, video.id);

      await navigator.share({
        title: "UnitySora video",
        text: video.prompt || "Generated video",
        files: [file],
      });
      showMessage("Video file share/save menu opened.");
    } catch (error) {
      if (error?.name !== "AbortError") {
        console.warn("[UnitySora] Video file share failed", error);
        showMessage("The video file could not be prepared. Please use Open Video or Copy Link instead.");
      }
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