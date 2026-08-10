import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Copy,
  Download,
  Heart,
  Info,
  Share2,
  Trash2,
  Wand2,
  X,
} from "lucide-react";
import { copyToClipboard, downloadMedia, shareMedia } from "@/lib/mediaExport";

const SWIPE_DISTANCE = 60;
const DISMISS_DISTANCE = 110;

function MetaRow({ label, value }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] uppercase tracking-wide text-white/40 shrink-0">{label}</span>
      <span className="text-xs text-white/85 text-right tabular break-all">{value}</span>
    </div>
  );
}

export default function Lightbox({
  items = [],
  index,
  kind = "image",
  onClose,
  onIndexChange,
  onLike,
  onDelete,
}) {
  const navigate = useNavigate();
  const [showInfo, setShowInfo] = useState(false);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const touchRef = useRef(null);

  const item = items[index];
  const isVideo = kind === "video";
  const assetUrl = isVideo ? item?.video_url : item?.image_url;
  const hasAsset = Boolean(assetUrl && String(assetUrl).trim());

  const go = useCallback(
    (delta) => {
      const next = index + delta;
      if (next < 0 || next >= items.length) return;
      setShowInfo(false);
      setStatus("");
      onIndexChange(next);
    },
    [index, items.length, onIndexChange]
  );

  const flash = (message) => {
    if (!message) return;
    setStatus(message);
    window.setTimeout(() => setStatus(""), 4000);
  };

  /* Keyboard */
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "i") setShowInfo((value) => !value);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose]);

  /* Scroll lock */
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  if (!item) return null;

  /* Touch: horizontal paging, vertical dismiss */
  const onTouchStart = (event) => {
    const touch = event.touches[0];
    touchRef.current = { x: touch.clientX, y: touch.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  const onTouchMove = (event) => {
    if (!touchRef.current) return;
    const touch = event.touches[0];
    setDrag({
      x: touch.clientX - touchRef.current.x,
      y: touch.clientY - touchRef.current.y,
      active: true,
    });
  };

  const onTouchEnd = () => {
    const { x, y } = drag;
    touchRef.current = null;
    setDrag({ x: 0, y: 0, active: false });

    if (Math.abs(y) > Math.abs(x) && y > DISMISS_DISTANCE) {
      onClose();
      return;
    }
    if (Math.abs(x) > SWIPE_DISTANCE) go(x < 0 ? 1 : -1);
  };

  const handleShare = async () => {
    setBusy(true);
    flash(await shareMedia({ url: assetUrl, kind, id: item.id, prompt: item.prompt }));
    setBusy(false);
  };

  const handleDownload = async () => {
    setBusy(true);
    flash(await downloadMedia({ url: assetUrl, kind, id: item.id }));
    setBusy(false);
  };

  const handleReuse = () => {
    const target = isVideo ? "/generate" : "/generate-image";
    navigate(`${target}?prompt=${encodeURIComponent(item.prompt || "")}`);
  };

  const dismissProgress = Math.min(Math.abs(drag.y) / 400, 0.7);

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col bg-black animate-fade-in"
      role="dialog"
      aria-modal="true"
      style={{ opacity: drag.active ? 1 - dismissProgress : 1 }}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center gap-2 px-3 pt-safe shrink-0">
        <div className="h-14 flex items-center gap-2 w-full">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white active:scale-95 transition-transform"
          >
            <X className="w-5 h-5" />
          </button>

          <span className="text-xs text-white/50 tabular ml-1">
            {index + 1} / {items.length}
          </span>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowInfo((value) => !value)}
              aria-label="Details"
              className={[
                "w-10 h-10 grid place-items-center rounded-full active:scale-95 transition-transform",
                showInfo ? "bg-white text-black" : "bg-white/10 text-white",
              ].join(" ")}
            >
              <Info className="w-5 h-5" />
            </button>
            {hasAsset && (
              <button
                type="button"
                onClick={handleShare}
                disabled={busy}
                aria-label="Share or save"
                className="w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white active:scale-95 transition-transform disabled:opacity-50"
              >
                <Share2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stage */}
      <div
        className="relative flex-1 min-h-0 flex items-center justify-center px-2"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {index > 0 && (
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Previous"
            className="hidden md:grid absolute left-4 z-10 w-11 h-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        <div
          className="max-h-full max-w-full flex items-center justify-center"
          style={{
            transform: drag.active ? `translate(${drag.x * 0.35}px, ${drag.y * 0.6}px)` : "none",
            transition: drag.active ? "none" : "transform 0.25s cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {!hasAsset ? (
            <div className="text-center text-white/70 px-8">
              <AlertTriangle className="w-10 h-10 mx-auto mb-3 text-warning" />
              <p className="font-medium">No {kind} file was returned</p>
              <p className="text-sm text-white/45 mt-1">
                This generation should be treated as failed.
              </p>
            </div>
          ) : isVideo ? (
            <video
              key={item.id}
              src={item.video_url}
              poster={item.thumbnail_url || item.reference_image_url}
              controls
              autoPlay
              loop
              playsInline
              className="max-h-[calc(100dvh-16rem)] max-w-full rounded-lg"
            />
          ) : (
            <img
              key={item.id}
              src={item.image_url}
              alt={item.prompt || "Generated image"}
              className="max-h-[calc(100dvh-16rem)] max-w-full object-contain rounded-lg no-drag"
            />
          )}
        </div>

        {index < items.length - 1 && (
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Next"
            className="hidden md:grid absolute right-4 z-10 w-11 h-11 place-items-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 shrink-0 px-4 pb-safe">
        {status && (
          <div className="mb-2 rounded-lg bg-white/10 px-3 py-2 text-xs text-white/85 animate-fade-in">
            {status}
          </div>
        )}

        {showInfo && (
          <div className="mb-3 max-h-56 overflow-y-auto touch-scroll rounded-xl bg-white/[0.06] p-3 animate-fade-up">
            <MetaRow label="Resolution" value={item.resolution} />
            <MetaRow label="Aspect" value={item.aspect_ratio} />
            {isVideo ? (
              <>
                <MetaRow label="Duration" value={item.duration} />
                <MetaRow label="Mode" value={item.mode === "i2v" ? "Image to video" : "Text to video"} />
                <MetaRow label="Frames" value={item.num_frames} />
                <MetaRow label="Steps" value={item.sampling_steps} />
              </>
            ) : (
              <>
                <MetaRow label="Style" value={item.style_label} />
                <MetaRow label="Steps" value={item.steps} />
              </>
            )}
            <MetaRow label="Model" value={item.model} />
            <MetaRow label="Seed" value={item.seed} />
            <MetaRow label="Created" value={item.created_date?.slice(0, 10)} />
          </div>
        )}

        <p className="text-sm text-white/80 leading-relaxed line-clamp-3 mb-3">{item.prompt}</p>

        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-3">
          <button
            type="button"
            onClick={() => onLike?.(item)}
            className="shrink-0 h-10 px-3.5 rounded-full bg-white/10 text-white text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Heart className={item.likes > 0 ? "w-4 h-4 fill-current text-primary" : "w-4 h-4"} />
            <span className="tabular">{item.likes || 0}</span>
          </button>

          <button
            type="button"
            onClick={async () => flash((await copyToClipboard(item.prompt || "")) ? "Prompt copied." : "Could not copy.")}
            className="shrink-0 h-10 px-3.5 rounded-full bg-white/10 text-white text-sm flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Copy className="w-4 h-4" /> Prompt
          </button>

          <button
            type="button"
            onClick={handleReuse}
            className="shrink-0 h-10 px-3.5 rounded-full bg-primary text-primary-foreground text-sm font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
          >
            <Wand2 className="w-4 h-4" /> Reuse
          </button>

          {hasAsset && (
            <button
              type="button"
              onClick={handleDownload}
              disabled={busy}
              className="shrink-0 h-10 px-3.5 rounded-full bg-white/10 text-white text-sm flex items-center gap-1.5 active:scale-95 transition-transform disabled:opacity-50"
            >
              <Download className="w-4 h-4" /> Save
            </button>
          )}

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item)}
              className="shrink-0 h-10 px-3.5 rounded-full bg-destructive/15 text-destructive text-sm flex items-center gap-1.5 active:scale-95 transition-transform ml-auto"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
