import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, ImageIcon, Sparkles, Video } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import {
  belongsToCurrentUser,
  getOwnerFields,
  readLocalOwnedImageIds,
  readLocalOwnedVideoIds,
} from "@/lib/videoOwnership";
import GalleryVideoThumbnail from "@/components/gallery/GalleryVideoThumbnail";
import { getAspectRatio } from "@/lib/mediaExport";

function firstName(user) {
  const name = String(user?.full_name || "").trim();
  return name ? name.split(/\s+/)[0] : "";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function RecentRow({ title, items, kind, to }) {
  if (!items.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-3">
        <h2 className="text-[15px] font-semibold tracking-tight">{title}</h2>
        <Link
          to={to}
          className="ml-auto flex items-center gap-1 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
        >
          All <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto scrollbar-hide px-4 lg:mx-0 lg:px-0">
        {items.map((item) => (
          <Link
            key={item.id}
            to={to}
            className="group relative h-36 shrink-0 overflow-hidden rounded-xl bg-surface-2 sm:h-44"
            style={{ aspectRatio: getAspectRatio(item, kind === "video" ? 9 / 16 : 1) }}
          >
            {kind === "video" ? (
              <GalleryVideoThumbnail video={item} />
            ) : (
              <img
                src={item.thumbnail_url || item.image_url}
                alt={item.prompt || ""}
                loading="lazy"
                className="h-full w-full object-cover no-drag"
              />
            )}
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const { user: contextUser, isAuthenticated } = useAuth();
  const [kind, setKind] = useState("image");
  const [prompt, setPrompt] = useState("");
  const [images, setImages] = useState([]);
  const [videos, setVideos] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadRecent() {
      try {
        const user = contextUser?.id || contextUser?.email ? contextUser : await base44.auth.me();
        const { owner_user_id: ownerId, owner_email: ownerEmail } = getOwnerFields(user);
        if (!ownerId && !ownerEmail) return;

        const [imageResults, videoResults] = await Promise.all([
          base44.entities.GeneratedImage.filter({ status: "completed" }, "-created_date", 60).catch(() => []),
          base44.entities.GeneratedVideo.filter({ status: "completed" }, "-created_date", 60).catch(() => []),
        ]);

        const ownedImages = readLocalOwnedImageIds(ownerId, ownerEmail);
        const ownedVideos = readLocalOwnedVideoIds(ownerId, ownerEmail);

        if (cancelled) return;
        setImages(
          (imageResults || [])
            .filter((item) => item.image_url && belongsToCurrentUser(item, ownerId, ownerEmail, ownedImages))
            .slice(0, 12)
        );
        setVideos(
          (videoResults || [])
            .filter((item) => item.video_url && belongsToCurrentUser(item, ownerId, ownerEmail, ownedVideos))
            .slice(0, 12)
        );
      } catch {
        /* Home is decorative; a failed fetch should never block it. */
      }
    }

    loadRecent();
    return () => {
      cancelled = true;
    };
  }, [contextUser]);

  const isEmpty = useMemo(() => !images.length && !videos.length, [images, videos]);

  const submit = () => {
    const target = kind === "video" ? "/generate" : "/generate-image";
    const query = prompt.trim() ? `?prompt=${encodeURIComponent(prompt.trim())}` : "";
    navigate(target + query);
  };

  return (
    <div className="min-h-dvh">
      <div className="mx-auto max-w-[1200px] px-4 lg:px-8 py-6 lg:py-10 space-y-8">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">
            {greeting()}
            {firstName(contextUser) ? `, ${firstName(contextUser)}` : ""}
          </p>
          <h1 className="text-[26px] lg:text-3xl font-semibold tracking-tight">What are we making?</h1>
        </header>

        {/* Composer */}
        <div className="rounded-2xl border border-border surface p-3.5 shadow-lift">
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) submit();
            }}
            rows={3}
            placeholder={
              kind === "video"
                ? "A slow dolly through a rain-lit street at night..."
                : "A portrait lit by a single window, 85mm, soft falloff..."
            }
            className="w-full resize-none bg-transparent text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
          />

          <div className="mt-2 flex items-center gap-2 border-t border-border pt-3">
            <div className="inline-flex rounded-lg bg-muted p-0.5">
              {[
                { id: "image", label: "Image", icon: ImageIcon },
                { id: "video", label: "Video", icon: Video },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setKind(option.id)}
                  className={[
                    "flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[13px] font-medium transition-colors",
                    kind === option.id
                      ? "bg-surface-2 text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  ].join(" ")}
                >
                  <option.icon className="h-3.5 w-3.5" />
                  {option.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={submit}
              className="ml-auto flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-transform active:scale-95"
            >
              <Sparkles className="h-4 w-4" />
              Start
            </button>
          </div>
        </div>

        {isEmpty ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-muted-foreground">
              {isAuthenticated
                ? "Nothing generated yet. Anything you make shows up here."
                : "Sign in to start generating privately."}
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            <RecentRow title="Recent images" items={images} kind="image" to="/image-gallery" />
            <RecentRow title="Recent videos" items={videos} kind="video" to="/gallery" />
          </div>
        )}
      </div>
    </div>
  );
}
