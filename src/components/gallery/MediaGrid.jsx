import { useEffect, useMemo, useState } from "react";
import { Check, Heart, Play } from "lucide-react";
import { getAspectRatio } from "@/lib/mediaExport";
import GalleryVideoThumbnail from "./GalleryVideoThumbnail";

/** Column count by viewport, adjusted by the density toggle. */
function useColumnCount(density = "comfortable") {
  const [width, setWidth] = useState(() => (typeof window === "undefined" ? 1280 : window.innerWidth));

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWidth(window.innerWidth));
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frame);
    };
  }, []);

  let columns = 2;
  if (width >= 1920) columns = 5;
  else if (width >= 1440) columns = 4;
  else if (width >= 1024) columns = 3;
  else if (width >= 640) columns = 3;

  if (density === "compact") columns += width >= 640 ? 2 : 1;
  return Math.max(1, columns);
}

/**
 * Greedy shortest-column masonry.
 * CSS `columns` was filling top-to-bottom per column, so "newest first"
 * did not read newest-first. This places items left-to-right in order
 * while still balancing column heights using the known aspect ratio.
 */
function buildColumns(items, columnCount, kind) {
  const columns = Array.from({ length: columnCount }, () => []);
  const heights = new Array(columnCount).fill(0);
  const fallback = kind === "video" ? 9 / 16 : 1;

  items.forEach((item) => {
    let target = 0;
    for (let i = 1; i < columnCount; i += 1) {
      if (heights[i] < heights[target] - 0.001) target = i;
    }
    const aspect = getAspectRatio(item, fallback);
    columns[target].push({ item, aspect });
    heights[target] += 1 / aspect;
  });

  return columns;
}

function Tile({ item, aspect, kind, selecting, selected, onOpen, onToggleSelect }) {
  const isVideo = kind === "video";

  return (
    <button
      type="button"
      onClick={() => (selecting ? onToggleSelect(item.id) : onOpen(item.id))}
      className={[
        "group relative block w-full overflow-hidden rounded-xl bg-surface-2 text-left",
        "transition-[transform,box-shadow] duration-200 will-change-transform",
        "active:scale-[0.985] md:hover:shadow-lift",
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : "",
      ].join(" ")}
      style={{ aspectRatio: aspect }}
    >
      {isVideo ? (
        <GalleryVideoThumbnail video={item} />
      ) : (
        <img
          src={item.thumbnail_url || item.image_url}
          alt={item.prompt || "Generated image"}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover no-drag"
        />
      )}

      {/* Prompt on hover — desktop only, so touch never sees a stuck overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-8">
          <p className="text-[11px] leading-snug text-white/90 line-clamp-2">{item.prompt}</p>
        </div>
      </div>

      {isVideo && (
        <span className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-md bg-black/55 px-1.5 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
          <Play className="w-2.5 h-2.5 fill-current" />
          {item.duration || "clip"}
        </span>
      )}

      {item.likes > 0 && !selecting && (
        <span className="pointer-events-none absolute top-2 right-2 grid place-items-center rounded-full bg-black/50 p-1.5 backdrop-blur-sm">
          <Heart className="w-3 h-3 fill-primary text-primary" />
        </span>
      )}

      {selecting && (
        <span
          className={[
            "absolute top-2 left-2 grid h-6 w-6 place-items-center rounded-full border-2 transition-colors",
            selected ? "border-primary bg-primary text-primary-foreground" : "border-white/70 bg-black/30",
          ].join(" ")}
        >
          {selected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      )}
    </button>
  );
}

export default function MediaGrid({
  items,
  kind = "image",
  density = "comfortable",
  selecting = false,
  selectedIds,
  onOpen,
  onToggleSelect,
}) {
  const columnCount = useColumnCount(density);
  const columns = useMemo(() => buildColumns(items, columnCount, kind), [items, columnCount, kind]);
  const gap = density === "compact" ? "gap-2" : "gap-3";

  return (
    <div className={`flex items-start ${gap}`}>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className={`flex flex-1 min-w-0 flex-col ${gap}`}>
          {column.map(({ item, aspect }) => (
            <Tile
              key={item.id}
              item={item}
              aspect={aspect}
              kind={kind}
              selecting={selecting}
              selected={selectedIds?.has(item.id)}
              onOpen={onOpen}
              onToggleSelect={onToggleSelect}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function MediaGridSkeleton({ kind = "image", density = "comfortable" }) {
  const columnCount = useColumnCount(density);
  const gap = density === "compact" ? "gap-2" : "gap-3";
  const ratios = kind === "video" ? [0.56, 1.78, 1, 0.56, 1.78, 1] : [1, 1.33, 0.75, 1, 1.78, 1];

  return (
    <div className={`flex items-start ${gap}`}>
      {Array.from({ length: columnCount }).map((_, columnIndex) => (
        <div key={columnIndex} className={`flex flex-1 min-w-0 flex-col ${gap}`}>
          {Array.from({ length: 3 }).map((__, tileIndex) => (
            <div
              key={tileIndex}
              className="skeleton rounded-xl"
              style={{ aspectRatio: ratios[(columnIndex + tileIndex) % ratios.length] }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
