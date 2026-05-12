import { X, Heart, Download, Copy, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function VideoModal({ video, onClose, onLike }) {
  if (!video) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-card border border-border rounded-2xl overflow-hidden max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Video / Image */}
        <div className="relative bg-black">
          {video.video_url ? (
            <video
              src={video.video_url}
              controls
              autoPlay
              loop
              className="w-full object-contain max-h-[60vh]"
              poster={video.thumbnail_url}
            />
          ) : (
            <img
              src={video.thumbnail_url}
              alt={video.prompt}
              className="w-full object-contain max-h-[60vh]"
            />
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 bg-black/60 hover:bg-black/80 text-white rounded-full p-1.5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        <div className="p-5">
          <p className="text-foreground text-sm leading-relaxed mb-4">{video.prompt}</p>

          <div className="flex flex-wrap gap-2 mb-4">
            <Badge variant="outline" className="text-xs">{video.resolution}</Badge>
            <Badge variant="outline" className="text-xs">{video.aspect_ratio}</Badge>
            <Badge variant="outline" className="text-xs">{video.duration}</Badge>
            <Badge variant="outline" className="text-xs">{video.mode === "i2v" ? "Image-to-Video" : "Text-to-Video"}</Badge>
            {video.camera_motion && video.camera_motion !== "none" && (
              <Badge variant="outline" className="text-xs">{video.camera_motion}</Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => onLike(video)}
            >
              <Heart className="w-3.5 h-3.5" /> {video.likes || 0} Likes
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => navigator.clipboard.writeText(video.prompt)}
            >
              <Copy className="w-3.5 h-3.5" /> Copy Prompt
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={() => { window.location.href = `/generate?prompt=${encodeURIComponent(video.prompt)}`; }}
            >
              <Wand2 className="w-3.5 h-3.5" /> Use Prompt
            </Button>
            <a href={video.video_url || video.thumbnail_url} target="_blank" rel="noopener noreferrer" download>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="w-3.5 h-3.5" /> Download
              </Button>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}