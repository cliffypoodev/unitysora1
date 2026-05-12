import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Heart, Search, Wand2, Filter, Clock, Image, PlayCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import VideoModal from "@/components/VideoModal";

function hasPlayableVideo(video) {
  return Boolean(video?.video_url && String(video.video_url).trim());
}

function getPoster(video) {
  return video?.thumbnail_url || video?.reference_image_url || "";
}

export default function Gallery() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState("all");
  const [sortBy, setSortBy] = useState("-created_date");
  const [selectedVideo, setSelectedVideo] = useState(null);

  useEffect(() => {
    loadVideos();
  }, [sortBy]);

  const loadVideos = async () => {
    setLoading(true);
    try {
      const results = await base44.entities.GeneratedVideo.filter({ status: "completed" }, sortBy, 100);
      setVideos((results || []).filter(hasPlayableVideo));
    } catch {
      setVideos([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (e, video) => {
    if (e && e.stopPropagation) e.stopPropagation();
    const newLikes = (video.likes || 0) + 1;
    await base44.entities.GeneratedVideo.update(video.id, { likes: newLikes });
    setVideos((prev) => prev.map((v) => v.id === video.id ? { ...v, likes: newLikes } : v));
    if (selectedVideo?.id === video.id) setSelectedVideo((prev) => ({ ...prev, likes: newLikes }));
  };

  const filtered = videos.filter((v) => {
    const matchSearch = !search || v.prompt?.toLowerCase().includes(search.toLowerCase());
    const matchMode = filterMode === "all" || v.mode === filterMode;
    return hasPlayableVideo(v) && matchSearch && matchMode;
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-[1400px] mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Gallery</h1>
          <p className="text-muted-foreground text-lg mb-1">Open-Sora: Democratizing Efficient Video Production for All</p>
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
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search prompts..." className="pl-9 text-sm" />
          </div>
          <div className="flex gap-2">
            <Select value={filterMode} onValueChange={setFilterMode}>
              <SelectTrigger className="w-40 text-sm">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="t2v">Text-to-Video</SelectItem>
                <SelectItem value="i2v">Image-to-Video</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-44 text-sm">
                <Clock className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
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
            {Array.from({ length: 8 }).map((_, i) => <div key={i} className="rounded-xl bg-muted animate-pulse aspect-[9/16]" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-24">
            <Image className="w-14 h-14 mx-auto text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium mb-2">No playable videos yet</p>
            <p className="text-sm text-muted-foreground mb-6">Failed or incomplete generations are hidden instead of shown as fake completed videos.</p>
            <Link to="/generate"><Button className="gap-2 bg-primary hover:bg-primary/90"><Wand2 className="w-4 h-4" /> Generate Video</Button></Link>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 md:columns-4 gap-4 space-y-4">
            {filtered.map((video, i) => (
              <motion.div
                key={video.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => setSelectedVideo(video)}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border bg-card group shadow-sm hover:shadow-lg transition-all duration-300 cursor-pointer mb-4"
              >
                <div className="relative overflow-hidden bg-black">
                  <video
                    src={video.video_url}
                    poster={getPoster(video)}
                    muted
                    playsInline
                    preload="metadata"
                    className="w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/20 transition-colors">
                    <PlayCircle className="w-10 h-10 text-white drop-shadow" />
                  </div>
                  <button onClick={(e) => handleLike(e, video)} className="absolute top-2 right-2 flex items-center gap-1 bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white rounded-full px-2 py-1 text-xs transition-all opacity-0 group-hover:opacity-100">
                    <Heart className="w-3 h-3" /> {video.likes || 0}
                  </button>
                  <div className="absolute bottom-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">{video.duration || "4s"}</Badge>
                    <Badge className="bg-black/60 text-white border-0 text-xs backdrop-blur-sm">{video.aspect_ratio || "9:16"}</Badge>
                  </div>
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground leading-relaxed line-clamp-3">{video.prompt}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[10px] text-muted-foreground">{video.resolution}</span>
                    <span className="text-[10px] text-muted-foreground uppercase font-medium">{video.mode === "i2v" ? "Image-to-Video" : "Text-to-Video"}</span>
                  </div>
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