import { useState } from "react";
import {
  X,
  Heart,
  Download,
  Copy,
  Wand2,
  AlertTriangle,
  Share2,
  ExternalLink,
  Check,
} from "lucide-react";
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

async function copyToClipboard(text) {
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

export default function VideoModal({ video, onClose, onLike }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  if (!video) return null;

  const playable = hasPlayableVideo(video);
  const isDemo = !video.id && Boolean(video.thumbnail_url);
  const assetUrl = buildAbsoluteUrl(getAssetUrl(video));
  const canExport = Boolean(assetUrl && (playable || isDemo));

  const showMessage = (message) => {
    setExportMessage(message);
    window.setTimeout(() => setExportMessage(""), 6500);
  };

  const makeVideoFile = async () => {
    const response = await fetch(assetUrl, {
      method: "GET",
      mode: "cors",
      cache: "no-store",
    });

    if (!response.ok) throw new Error("The video file could not be fetched.");

    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error("The video file was empty.");

    const extension = getFileExtensionFromUrl(assetUrl, blob.type);
    const fileType = blob.type || (extension === "mov" ? "video/quicktime" : extension === "webm" ? "video/webm" : extension === "gif" ? "image/gif" : "video/mp4");

    return new File([blob], `unitysora-video-${video.id || Date.now()}.${extension}`, { type: fileType });
  };

  const handleNativeShare = async ({ openFallbackPanel = true } = {}) => {
    if (!assetUrl || exporting) return;

    setExporting(true);

    try {
      if (navigator.share) {
        try {
          const file = await makeVideoFile();
          if (!navigator.canShare || navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: "UnitySora video",
              text: video.prompt || "Generated video",
              files: [file],
            });
            showMessage("iOS share/save menu opened with the video file.");
            return;
          }
        } catch {
          // Some hosts block file fetches. Fall through to URL sharing.
        }

        try {
          await navigator.share({
            title: "UnitySora video",
            text: video.prompt || "Generated video",
            url: assetUrl,
          });
          showMessage("iOS share/save menu opened with the video link.");
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
        }
      }

      const copied = await copyToClipboard(assetUrl);
      if (openFallbackPanel) setExportOpen(true);
      showMessage(
        copied
          ? "The iOS share sheet did not open. The video link was copied. Use Open Video or Copy Link below."
          : "The iOS share sheet did not open. Use Open Video or Copy Link below."
      );
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    await handleNativeShare({ openFallbackPanel: true });
  };

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(assetUrl);
    showMessage(copied ? "Video link copied." : "Could not copy the link on this device.");
  };

  const handleOpenVideo = () => {
    if (!assetUrl) return;
    window.open(assetUrl, "_blank", "noopener,noreferrer");
    showMessage("Opened video in a new tab. Use the browser share/save controls there.");
  };

  const handleDownload = async () => {
    if (!assetUrl) return;

    try {
      const response = await fetch(assetUrl, {
        method: "GET",
        mode: "cors",
        cache: "no-store",
      });

      if (!response.ok) throw new Error("The file could not be fetched for download.");

      const blob = await response.blob();
      if (!blob || blob.size === 0) throw new Error("The downloaded file was empty.");

      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const extension = getFileExtensionFromUrl(assetUrl, blob.type);
      link.href = objectUrl;
      link.download = `unitysora-video-${video.id || Date.now()}.${extension}`;
      link.rel = "noopener noreferrer";
      link.style.display = "none";
      document.body.appendChild(link);
      link.click();

      window.setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(objectUrl);
      }, 1000);

      showMessage("Download started. On iPhone, check Files or Downloads. If nothing appears, use Share / Save.");
    } catch {
      const copied = await copyToClipboard(assetUrl);
      showMessage(
        copied
          ? "Direct download was blocked by iOS or the video host. The video link was copied. Use Share / Save instead."
          : "Direct download was blocked by iOS or the video host. Use Share / Save instead."
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="relative bg-black">
          {playable ? (
            <video src={video.video_url} controls autoPlay loop className="w-full object-contain max-h-[60vh]" poster={getPoster(video)} />
          ) : isDemo ? (
            <img src={video.thumbnail_url} alt={video.prompt} className="w-full object-contain max-h-[60vh]" />
          ) : (
            <div className="min-h-[240px] flex flex-col items-center justify-center text-white/80 p-8 text-center">
              <AlertTriangle className="w-10 h-10 mb-3 text-yellow-400" />
              <p className="font-semibold">No playable video URL was returned.</p>
              <p className="text-sm text-white/60 mt-1">This generation should be treated as failed, not completed.</p>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-foreground text-sm leading-relaxed mb-4">{video.prompt}</p>

          {video.error_message && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
              {video.error_message}
            </div>
          )}

          {exportMessage && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="text-xs">{video.resolution}</Badge>
            <Badge variant="outline" className="text-xs">{video.aspect_ratio}</Badge>
            <Badge variant="outline" className="text-xs">{video.duration}</Badge>
            <Badge variant="outline" className="text-xs">{video.mode === "i2v" ? "Image-to-Video" : "Text-to-Video"}</Badge>
            {video.camera_motion && video.camera_motion !== "none" && <Badge variant="outline" className="text-xs">{video.camera_motion}</Badge>}
            {!playable && !isDemo && <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">Missing Video</Badge>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onLike(video)}>
              <Heart className="w-3.5 h-3.5" /> {video.likes || 0} Likes
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyToClipboard(video.prompt || "")}>
              <Copy className="w-3.5 h-3.5" /> Copy Prompt
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { window.location.href = `/generate?prompt=${encodeURIComponent(video.prompt || "")}`; }}>
              <Wand2 className="w-3.5 h-3.5" /> Use Prompt
            </Button>
            {canExport && (
              <Button variant="outline" size="sm" className="gap-1.5" disabled={exporting} onClick={() => handleNativeShare({ openFallbackPanel: true })}>
                {exporting ? <Download className="w-3.5 h-3.5 animate-pulse" /> : <Share2 className="w-3.5 h-3.5" />}
                {exporting ? "Preparing..." : "Export / Save"}
              </Button>
            )}
          </div>

          {canExport && exportOpen && (
            <div className="mt-4 rounded-xl border border-border bg-muted/30 p-3 shadow-sm">
              <p className="text-xs font-semibold text-foreground mb-1">Save or export video</p>
              <p className="text-xs text-muted-foreground mb-3">
                On iPhone, use Share / Save first. Direct Download depends on whether iOS and the video host allow blob downloads.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button type="button" variant="default" size="sm" className="gap-1.5" onClick={handleShare} disabled={exporting}>
                  <Share2 className="w-3.5 h-3.5" /> Share / Save
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" /> Download File
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleOpenVideo}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open Video
                </Button>
              </div>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 mt-2 w-full" onClick={handleCopyLink}>
                <Copy className="w-3.5 h-3.5" /> Copy Video Link
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
