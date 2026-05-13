import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { belongsToCurrentUser, getOwnerFields, readLocalOwnedVideoIds } from "@/lib/videoOwnership";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Filter, Heart, Image, Loader2, PlayCircle, Search, Wand2 } from "lucide-react";
import VideoModal from "@/components/VideoModal";
import GalleryVideoThumbnail from "@/components/gallery/GalleryVideoThumbnail";

function hasPlayableVideo(video) {
  return Boolean(video?.video_url && String(video.video_url).trim());
}

function getPoster(video) {
  return video?.thumbnail_url || video?.reference_image_url || "";
}

function isLikelyVideoUrl(url) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v)$/.test(cleanUrl);
}

function getDisplayDuration(duration) {
  const seconds = parseInt(String(duration || "4s"), 10);
  if (Number.isNaN(seconds)) return "4s";
  return `${Math.min(seconds, 8)}s`;
}

export default function GalleryPrivate() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [sortBy, setSortBy] = useState("-created_date");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const { user: contextUser } = useAuth();
  const [resolvedUser, setResolvedUser] = useState(contextUser || null);

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
    return () => { cancelled = true; };
  }, [contextUser]);

  useEffect(() => {
    loadVideos();
  }, [sortBy, resolvedUser]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const ownerFields = getOwnerFields(resolvedUser);
      const ownerId = ownerFields.owner_user_id;
      const ownerEmail = ownerFields.owner_email;

      if (!ownerId && !ownerEmail) {
        setVideos([]);
        return;
      }

      const localOwnedIds = readLocalOwnedVideoIds(ownerId, ownerEmail);
      const results = await Promise.all([
        ownerId ? base44.entities.GeneratedVideo.filter({ status: "completed", owner_user_id: ownerId }, sortBy, 200) : Promise.resolve([]),
        ownerEmail ? base44.entities.GeneratedVideo.filter({ status: "completed", owner_email: ownerEmail }, sortBy, 200) : Promise.resolve([]),
        ownerEmail ? base44.entities.GeneratedVideo.filter({ status: "completed", created_by: ownerEmail }, sortBy, 200) : Promise.resolve([]),
      ]);

      const deduped = Array.from(new Map(results.flat().map((item) => [item.id, item])).values());
      const playable = deduped.filter((video) => hasPlayableVideo(video) && belongsToCurrentUser(video, ownerId, ownerEmail, localOwnedIds));
      console.info("[UnitySora] Gallery loaded", { fetched: deduped.length, shown: playable.length });
      setVideos(playable);
    } catch (error) {
      console.error("[UnitySora] Gallery load failed", error);
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (event, video) => {
    if (event?.stopPropagation) event.stopPropagation();
    const newLikes = (video.likes || 0) + 1;
    try {
      await base44.entities.GeneratedVideo.update(video.id, { likes: newLikes });
    } catch (error) {
      console.warn("[UnitySora] Like update failed", error);
    }
    setVideos((prev) => prev.map((item) => (item.id === video.id ? { ...item, likes: newLikes } : item)));
    if (selectedVideo?.id === video.id) setSelectedVideo((prev) => ({ ...prev, likes: newLikes }));
  };

  const filtered = useMemo(() => {
    return videos.filter((video) => {
      const matchSearch = !search || video.prompt?.toLowerCase().includes(search.toLowerCase());
      const matchMode = filterMode === "all" || video.mode === filterMode;
      return hasPlayableVideo(video) && matchSearch && matchMode;
    });
  }, [videos, search, filterMode]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Gallery</h1>
          <p className="text-muted-foreground text-lg mb-1">Your generated videos</p>
          <div className="flex justify-center gap-3 mt-4">
            <Link to="/generate">
              <Button className="gap-2 bg-primary hover:bg-primary/90">
                <Wand2 className="w-4 h-4" /> Generate Video
              </Button>
            </Link>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search prompts..." className="pl-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-40 text-sm"><Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="t2v">Text-to-Video</SelectItem>
                <SelectItem value="i2v">Image-to-Video</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 text-sm"><Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="-created_date">Newest First</SelectItem>
                <SelectItem value="created_date">Oldest First</SelectItem>
                <SelectItem value="-likes">Most Liked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, index) => <div key={index} className="rounded-xl bg-muted animate-pulse aspect-[9/16]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Image className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-2">No videos found</p>
            <p className="text-sm text-muted-foreground mb-6">Generate a video to see it here in your private gallery.</p>
            <Link to="/generate"><Button className="gap-2 bg-primary hover:bg-primary/90"><Wand2 className="w-4 h-4" /> Generate Video</Button></Link>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
            {filtered.map((video, index) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
                onClick={() => setSelectedVideo(video)}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border bg-card group shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer mb-4"
              >
                <div className="relative overflow-hidden bg-black">
                  <GalleryVideoThumbnail video={video} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors"><PlayCircle className="w-10 h-10 text-white drop-shadow" /></div>
                  <button onClick={(event) => handleLike(event, video)} className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs transition-all opacity-0 group-hover:opacity-100"><Heart className="w-3 h-3" /> {video.likes || 0}</button>
                  <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">{getDisplayDuration(video.duration)}</Badge><Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">{video.aspect_ratio || "9:16"}</Badge></div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground leading-relaxed line-clamp-3">{video.prompt}</p>
                  <div className="flex items-center justify-between mt-2"><span className="text-[10px] text-muted-foreground">{video.resolution}</span><span className="text-[10px] text-muted-foreground uppercase font-medium">{video.mode === "i2v" ? "Image-to-Video" : "Text-to-Video"}</span></div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <VideoModal video={selectedVideo} onClose={() => setSelectedVideo(null)} onLike={(video) => handleLike(null, video)} />
    </div>
  );
}