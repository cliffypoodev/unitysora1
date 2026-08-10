import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowDownUp,
  Check,
  Heart,
  ImageIcon,
  LayoutGrid,
  Rows3,
  Search,
  Sparkles,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  belongsToCurrentUser,
  getOwnerFields,
  readLocalOwnedImageIds,
  readLocalOwnedVideoIds,
} from "@/lib/videoOwnership";
import MediaGrid, { MediaGridSkeleton } from "@/components/gallery/MediaGrid";
import Lightbox from "@/components/gallery/Lightbox";

const PAGE_SIZE = 36;

const SORTS = [
  { id: "-created_date", label: "Newest" },
  { id: "created_date", label: "Oldest" },
  { id: "-likes", label: "Most liked" },
];

const VIDEO_MODES = [
  { id: "all", label: "All" },
  { id: "t2v", label: "Text to video" },
  { id: "i2v", label: "Image to video" },
];

function hasAsset(item, kind) {
  const url = kind === "video" ? item?.video_url : item?.image_url;
  return Boolean(url && String(url).trim());
}

/* ------------------------------------------------------------------ */

function Segmented({ value, options, onChange, className = "" }) {
  return (
    <div className={`inline-flex p-0.5 rounded-lg bg-muted ${className}`}>
      {options.map((option) => {
        const active = option.id === value;
        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={[
              "px-3 h-8 rounded-[7px] text-[13px] font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              active ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {option.icon && <option.icon className="w-3.5 h-3.5" />}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function Chip({ active, onClick, children, className = "" }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "h-9 px-3 rounded-lg border text-[13px] font-medium transition-colors flex items-center gap-1.5 whitespace-nowrap",
        active
          ? "border-primary/50 bg-primary/10 text-foreground"
          : "border-border text-muted-foreground hover:text-foreground hover:bg-accent",
        className,
      ].join(" ")}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */

export default function Gallery() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user: contextUser } = useAuth();

  const [kind, setKind] = useState(location.pathname.startsWith("/image-gallery") ? "image" : "video");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(PAGE_SIZE);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("-created_date");
  const [mode, setMode] = useState("all");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [density, setDensity] = useState("comfortable");

  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lightboxIndex, setLightboxIndex] = useState(-1);

  const [resolvedUser, setResolvedUser] = useState(contextUser || null);
  const sentinelRef = useRef(null);

  /* Keep tab and URL in step, both directions */
  useEffect(() => {
    const fromPath = location.pathname.startsWith("/image-gallery") ? "image" : "video";
    if (fromPath !== kind) setKind(fromPath);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  const switchKind = (next) => {
    if (next === kind) return;
    setKind(next);
    setItems([]);
    setLoading(true);
    setVisible(PAGE_SIZE);
    setSelectedIds(new Set());
    setSelecting(false);
    navigate(next === "image" ? "/image-gallery" : "/gallery", { replace: true });
  };

  /* Resolve the signed-in user */
  useEffect(() => {
    let cancelled = false;

    async function resolveUser() {
      if (contextUser?.id || contextUser?.email) {
        setResolvedUser(contextUser);
        return;
      }
      try {
        const currentUser = await base44.auth.me();
        if (!cancelled) setResolvedUser(currentUser || null);
      } catch {
        if (!cancelled) setResolvedUser(null);
      }
    }

    resolveUser();
    return () => {
      cancelled = true;
    };
  }, [contextUser]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { owner_user_id: ownerId, owner_email: ownerEmail } = getOwnerFields(resolvedUser);
      if (!ownerId && !ownerEmail) {
        setItems([]);
        return;
      }

      const entity = kind === "video" ? base44.entities.GeneratedVideo : base44.entities.GeneratedImage;
      const localOwnedIds =
        kind === "video"
          ? readLocalOwnedVideoIds(ownerId, ownerEmail)
          : readLocalOwnedImageIds(ownerId, ownerEmail);

      const results = await Promise.all([
        ownerId ? entity.filter({ status: "completed", owner_user_id: ownerId }, sortBy, 300) : Promise.resolve([]),
        ownerEmail ? entity.filter({ status: "completed", owner_email: ownerEmail }, sortBy, 300) : Promise.resolve([]),
        ownerEmail ? entity.filter({ status: "completed", created_by: ownerEmail }, sortBy, 300) : Promise.resolve([]),
      ]);

      const deduped = Array.from(new Map(results.flat().map((item) => [item.id, item])).values());
      const owned = deduped.filter(
        (item) => hasAsset(item, kind) && belongsToCurrentUser(item, ownerId, ownerEmail, localOwnedIds)
      );
      setItems(owned);
    } catch (error) {
      console.error("[UnitySora] Gallery load failed", error);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [kind, sortBy, resolvedUser]);

  useEffect(() => {
    load();
  }, [load]);

  /* Filtering */
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (query && !String(item.prompt || "").toLowerCase().includes(query)) return false;
      if (favoritesOnly && !(item.likes > 0)) return false;
      if (kind === "video" && mode !== "all" && item.mode !== mode) return false;
      return true;
    });
  }, [items, search, favoritesOnly, mode, kind]);

  const shown = useMemo(() => filtered.slice(0, visible), [filtered, visible]);

  useEffect(() => {
    setVisible(PAGE_SIZE);
  }, [search, mode, favoritesOnly, kind, sortBy]);

  /* Infinite scroll */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible((value) => Math.min(value + PAGE_SIZE, filtered.length));
      },
      { rootMargin: "600px" }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [filtered.length]);

  /* Actions */
  const toggleSelect = (id) => {
    setSelectedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleLike = async (item) => {
    const entity = kind === "video" ? base44.entities.GeneratedVideo : base44.entities.GeneratedImage;
    const likes = (item.likes || 0) + 1;
    setItems((previous) => previous.map((entry) => (entry.id === item.id ? { ...entry, likes } : entry)));
    try {
      await entity.update(item.id, { likes });
    } catch (error) {
      console.warn("[UnitySora] Like failed", error);
    }
  };

  const deleteIds = async (ids) => {
    if (!ids.length) return;
    const entity = kind === "video" ? base44.entities.GeneratedVideo : base44.entities.GeneratedImage;
    const label = kind === "video" ? "video" : "image";
    const confirmed = window.confirm(
      `Delete ${ids.length} ${label}${ids.length === 1 ? "" : "s"}? This cannot be undone.`
    );
    if (!confirmed) return;

    setItems((previous) => previous.filter((item) => !ids.includes(item.id)));
    setSelectedIds(new Set());
    setSelecting(false);
    setLightboxIndex(-1);
    await Promise.all(ids.map((id) => entity.delete(id).catch(() => null)));
  };

  const openAt = (id) => setLightboxIndex(filtered.findIndex((item) => item.id === id));

  const createLink = kind === "video" ? "/generate" : "/generate-image";
  const isEmpty = !loading && filtered.length === 0;

  return (
    <div className="min-h-dvh">
      {/* Sticky toolbar */}
      <div className="sticky top-[calc(var(--topbar-h)+env(safe-area-inset-top))] lg:top-0 z-30 glass border-b border-border">
        <div className="mx-auto max-w-[1700px] px-4 lg:px-8 py-3 space-y-3">
          <div className="flex items-center gap-3">
            <Segmented
              value={kind}
              onChange={switchKind}
              options={[
                { id: "image", label: "Images", icon: ImageIcon },
                { id: "video", label: "Videos", icon: Video },
              ]}
            />

            <span className="hidden sm:block text-xs text-muted-foreground tabular ml-1">
              {loading ? "—" : `${filtered.length} item${filtered.length === 1 ? "" : "s"}`}
            </span>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDensity((value) => (value === "compact" ? "comfortable" : "compact"))}
                aria-label="Toggle grid density"
                className="hidden sm:grid h-9 w-9 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
              >
                {density === "compact" ? <Rows3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
              </button>

              <Chip
                active={selecting}
                onClick={() => {
                  setSelecting((value) => !value);
                  setSelectedIds(new Set());
                }}
              >
                {selecting ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                {selecting ? "Done" : "Select"}
              </Chip>

              <Link
                to={createLink}
                className="h-9 px-3.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-semibold flex items-center gap-1.5 active:scale-95 transition-transform"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Create</span>
              </Link>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            <div className="relative shrink-0 w-44 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search prompts"
                className="w-full h-9 pl-9 pr-8 rounded-lg bg-muted border border-transparent text-[13px] placeholder:text-muted-foreground focus:outline-none focus:border-border focus:bg-surface-2 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="relative shrink-0">
              <ArrowDownUp className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <select
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
                className="h-9 pl-8 pr-7 rounded-lg border border-border bg-transparent text-[13px] text-foreground appearance-none focus:outline-none focus:border-primary/50"
              >
                {SORTS.map((option) => (
                  <option key={option.id} value={option.id} className="bg-popover">
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <Chip active={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>
              <Heart className={favoritesOnly ? "w-3.5 h-3.5 fill-primary text-primary" : "w-3.5 h-3.5"} />
              Liked
            </Chip>

            {kind === "video" &&
              VIDEO_MODES.filter((option) => option.id !== "all").map((option) => (
                <Chip
                  key={option.id}
                  active={mode === option.id}
                  onClick={() => setMode(mode === option.id ? "all" : option.id)}
                >
                  {option.label}
                </Chip>
              ))}
          </div>
        </div>

        {/* Selection action bar */}
        {selecting && selectedIds.size > 0 && (
          <div className="border-t border-border bg-surface-2 px-4 lg:px-8 py-2 flex items-center gap-3 animate-fade-in">
            <span className="text-[13px] text-muted-foreground tabular">{selectedIds.size} selected</span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set(filtered.map((item) => item.id)))}
              className="text-[13px] text-foreground hover:text-primary transition-colors"
            >
              Select all
            </button>
            <button
              type="button"
              onClick={() => deleteIds(Array.from(selectedIds))}
              className="ml-auto h-8 px-3 rounded-lg bg-destructive text-destructive-foreground text-[13px] font-medium flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="mx-auto max-w-[1700px] px-4 lg:px-8 py-4">
        {loading ? (
          <MediaGridSkeleton kind={kind} density={density} />
        ) : isEmpty ? (
          <div className="py-24 text-center">
            <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-muted">
              {kind === "video" ? (
                <Video className="w-6 h-6 text-muted-foreground" />
              ) : (
                <ImageIcon className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <p className="font-medium">
              {items.length === 0 ? `No ${kind}s yet` : "Nothing matches those filters"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {items.length === 0
                ? "Anything you generate lands here, private to your account."
                : "Try clearing the search or filters."}
            </p>
            {items.length === 0 && (
              <Link
                to={createLink}
                className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground active:scale-95 transition-transform"
              >
                <Sparkles className="w-4 h-4" />
                Create {kind === "video" ? "a video" : "an image"}
              </Link>
            )}
          </div>
        ) : (
          <>
            <MediaGrid
              items={shown}
              kind={kind}
              density={density}
              selecting={selecting}
              selectedIds={selectedIds}
              onOpen={openAt}
              onToggleSelect={toggleSelect}
            />
            <div ref={sentinelRef} className="h-12" />
            {visible < filtered.length && (
              <p className="pb-8 text-center text-xs text-muted-foreground tabular">
                Showing {shown.length} of {filtered.length}
              </p>
            )}
          </>
        )}
      </div>

      {lightboxIndex >= 0 && (
        <Lightbox
          items={filtered}
          index={lightboxIndex}
          kind={kind}
          onClose={() => setLightboxIndex(-1)}
          onIndexChange={setLightboxIndex}
          onLike={handleLike}
          onDelete={(item) => deleteIds([item.id])}
        />
      )}
    </div>
  );
}
