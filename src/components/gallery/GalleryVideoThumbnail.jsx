import { useEffect, useRef, useState } from "react";

function isLikelyVideoUrl(url) {
  const cleanUrl = String(url || "").split("?")[0].toLowerCase();
  return /\.(mp4|webm|mov|m4v)$/.test(cleanUrl);
}

function getImagePoster(video) {
  const poster = video?.thumbnail_url || video?.reference_image_url || "";
  return poster && !isLikelyVideoUrl(poster) ? poster : "";
}

/**
 * Fills its parent. The parent owns the aspect ratio so the masonry
 * layout can size tiles from metadata before anything loads.
 */
export default function GalleryVideoThumbnail({ video, className = "" }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const imagePoster = getImagePoster(video);

  useEffect(() => {
    if (imagePoster || !containerRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsVisible(entry.isIntersecting),
      { rootMargin: "400px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [imagePoster]);

  // Seek slightly into the clip so the poster frame isn't a black first frame.
  const handleLoadedMetadata = () => {
    const element = videoRef.current;
    if (!element || element.duration <= 0) return;
    element.currentTime = Math.min(0.25, Math.max(0.01, element.duration / 20));
  };

  return (
    <div ref={containerRef} className={`w-full h-full bg-black ${className}`}>
      {imagePoster ? (
        <img
          src={imagePoster}
          alt={video?.prompt || "Generated video"}
          loading="lazy"
          className="w-full h-full object-cover no-drag"
        />
      ) : isVisible ? (
        <video
          ref={videoRef}
          src={`${video?.video_url || ""}#t=0.25`}
          muted
          playsInline
          preload="metadata"
          onLoadedMetadata={handleLoadedMetadata}
          className="w-full h-full object-cover pointer-events-none"
        />
      ) : null}
    </div>
  );
}
