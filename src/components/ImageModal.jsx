import { useState } from "react";
import { AlertTriangle, Check, Copy, Download, ExternalLink, Heart, Share2, Wand2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

function hasImage(image) {
  return Boolean(image?.image_url && String(image.image_url).trim());
}

function getAssetUrl(image) {
  return image?.image_url || image?.thumbnail_url || image?.source_image_url || "";
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
  if (cleanUrl.endsWith(".jpg") || cleanUrl.endsWith(".jpeg") || mimeType.includes("jpeg")) return "jpg";
  if (cleanUrl.endsWith(".webp") || mimeType.includes("webp")) return "webp";
  if (cleanUrl.endsWith(".gif") || mimeType.includes("gif")) return "gif";
  return "png";
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

export default function ImageModal({ image, onClose, onLike }) {
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMessage, setExportMessage] = useState("");
  const [exporting, setExporting] = useState(false);

  if (!image) return null;

  const playable = hasImage(image);
  const assetUrl = buildAbsoluteUrl(getAssetUrl(image));
  const canExport = Boolean(assetUrl && playable);

  const showMessage = (message) => {
    setExportMessage(message);
    window.setTimeout(() => setExportMessage(""), 6500);
  };

  const makeImageFile = async () => {
    const response = await fetch(assetUrl, { method: "GET", mode: "cors", cache: "no-store" });
    if (!response.ok) throw new Error("The image file could not be fetched.");

    const blob = await response.blob();
    if (!blob || blob.size === 0) throw new Error("The image file was empty.");

    const extension = getFileExtensionFromUrl(assetUrl, blob.type);
    const fileType = blob.type || (extension === "jpg" ? "image/jpeg" : `image/${extension}`);
    return new File([blob], `unitysora-image-${image.id || Date.now()}.${extension}`, { type: fileType });
  };

  const handleNativeShare = async ({ openFallbackPanel = true } = {}) => {
    if (!assetUrl || exporting) return;
    setExporting(true);

    try {
      if (navigator.share) {
        try {
          const file = await makeImageFile();
          if (!navigator.canShare || navigator.canShare({ files: [file] })) {
            await navigator.share({ title: "UnitySora image", text: image.prompt || "Generated image", files: [file] });
            showMessage("Share/save menu opened with the image file.");
            return;
          }
        } catch {
          // Some hosts block file fetches. Fall through to URL sharing.
        }

        try {
          await navigator.share({ title: "UnitySora image", text: image.prompt || "Generated image", url: assetUrl });
          showMessage("Share/save menu opened with the image link.");
          return;
        } catch (error) {
          if (error?.name === "AbortError") return;
        }
      }

      const copied = await copyToClipboard(assetUrl);
      if (openFallbackPanel) setExportOpen(true);
      showMessage(copied ? "The image link was copied. Use Open Image or Download below." : "Use Open Image or Download below.");
    } finally {
      setExporting(false);
    }
  };

  const handleCopyLink = async () => {
    const copied = await copyToClipboard(assetUrl);
    showMessage(copied ? "Image link copied." : "Could not copy the image link on this device.");
  };

  const handleOpenImage = () => {
    if (!assetUrl) return;
    window.open(assetUrl, "_blank", "noopener,noreferrer");
    showMessage("Opened image in a new tab.");
  };

  const handleDownload = async () => {
    if (!assetUrl) return;

    try {
      const file = await makeImageFile();
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

      showMessage("Download started. If nothing appears, use Share / Save or Open Image.");
    } catch {
      const copied = await copyToClipboard(assetUrl);
      showMessage(copied ? "Direct download was blocked. The image link was copied." : "Direct download was blocked. Use Share / Save instead.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl overflow-hidden max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="relative bg-black">
          {playable ? (
            <img src={image.image_url} alt={image.prompt || "Generated image"} className="w-full object-contain max-h-[65vh]" />
          ) : (
            <div className="min-h-[240px] flex flex-col items-center justify-center text-white/80 p-8 text-center">
              <AlertTriangle className="w-10 h-10 mb-3 text-yellow-400" />
              <p className="font-semibold">No image URL was returned.</p>
              <p className="text-sm text-white/60 mt-1">This generation should be treated as failed, not completed.</p>
            </div>
          )}
          <button onClick={onClose} className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          <p className="text-foreground text-sm leading-relaxed mb-4">{image.prompt}</p>

          {image.error_message && (
            <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700">
              {image.error_message}
            </div>
          )}

          {exportMessage && (
            <div className="mb-4 rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 flex items-start gap-2">
              <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{exportMessage}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="text-xs">{image.resolution || `${image.width || 1024}x${image.height || 1024}`}</Badge>
            <Badge variant="outline" className="text-xs">{image.aspect_ratio || "1:1"}</Badge>
            <Badge variant="outline" className="text-xs">{image.steps || 12} steps</Badge>
            {!playable && <Badge className="bg-red-500/10 text-red-700 border-red-500/20 text-xs">Missing Image</Badge>}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onLike(image)}>
              <Heart className="w-3.5 h-3.5" /> {image.likes || 0} Likes
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => copyToClipboard(image.prompt || "")}>
              <Copy className="w-3.5 h-3.5" /> Copy Prompt
            </Button>
            <Button size="sm" className="gap-1.5" onClick={() => { window.location.href = `/generate-image?prompt=${encodeURIComponent(image.prompt || "")}`; }}>
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
              <p className="text-xs font-semibold text-foreground mb-1">Save or export image</p>
              <p className="text-xs text-muted-foreground mb-3">Use Share / Save first on mobile. Direct Download depends on browser and image host permissions.</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button type="button" variant="default" size="sm" className="gap-1.5" onClick={() => handleNativeShare({ openFallbackPanel: false })} disabled={exporting}>
                  <Share2 className="w-3.5 h-3.5" /> Share / Save
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleDownload}>
                  <Download className="w-3.5 h-3.5" /> Download File
                </Button>
                <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleOpenImage}>
                  <ExternalLink className="w-3.5 h-3.5" /> Open Image
                </Button>
              </div>
              <Button type="button" variant="ghost" size="sm" className="gap-1.5 mt-2 w-full" onClick={handleCopyLink}>
                <Copy className="w-3.5 h-3.5" /> Copy Image Link
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}