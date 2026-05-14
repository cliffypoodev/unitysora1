import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { ArrowRight, BarChart2, Globe, Heart, ImageIcon, Images, Play, PlayCircle, Users, Video, Wand2, Zap } from "lucide-react";
import VideoModal from "@/components/VideoModal";

const DEMO_VIDEOS = [
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/8a3461ba8_github_com_ft_0001_1_1_b592012d.gif", prompt: "A group of anthropomorphic mushrooms having a disco party in the middle of a dark enchanted forest, with glowing neon lights." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3e8373b8e_github_com_movie_0160_14e4c623.gif", prompt: "A panda bear with distinct black patches climbs and rests on a wooden log platform amid lush, natural foliage." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/54e14cb1f_github_com_movie_0017_3792da5e.gif", prompt: "A man in a gray hoodie and a woman in a light gray jacket jog along a residential sidewalk, smiling and chatting." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/bafccced1_github_com_ft_0012_1_1_a3be425d.gif", prompt: "Chinese ancient style, realism. A young woman, dressed in an embroidered red qipao, walks along ancient streets." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/520245207_github_com_douyin_0005_c7c692d2.gif", prompt: "A vibrant green parrot with hints of yellow and blue perches on a person's lap, who is wearing grey pants." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/392397313_github_com_movie_0037_14e6323a.gif", prompt: "A tomato surfing on a piece of lettuce down a waterfall of ranch dressing, with exaggerated surfing moves." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/1761cdd72_github_com_ft_0055_1_1_695ee2c8.gif", prompt: "A coastal landscape painting with a prominent archway is displayed on an easel in a bright studio." },
  { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/c726b7a5b_github_com_sora_0019_9852d2d9.gif", prompt: "Close-up of a sunflower field at golden hour, petals glowing amber, gentle breeze causing subtle sway." },
];

const FEATURES = [
  { icon: Zap, title: "Fast Creative Generation", desc: "Create private image and video outputs from natural language prompts." },
  { icon: Globe, title: "Image & Video Workflows", desc: "Use dedicated generation pages and private galleries for each media type." },
  { icon: BarChart2, title: "Flexible Controls", desc: "Choose aspect ratios, sizes, steps, and generation options from simple controls." },
  { icon: Users, title: "Private by Account", desc: "Generated media is saved with ownership fields and filtered to your account." },
];

function hasPlayableVideo(video) {
  return Boolean(video?.video_url && String(video.video_url).trim());
}

function getPoster(video) {
  return video?.thumbnail_url || video?.reference_image_url || "";
}

export default function Home() {
  const [recentVideos, setRecentVideos] = useState([]);
  const [selectedDemo, setSelectedDemo] = useState(null);

  useEffect(() => {
    base44.entities.GeneratedVideo.filter({ status: "completed" }, "-created_date", 50)
      .then((results) => setRecentVideos((results || []).filter(hasPlayableVideo).slice(0, 8)))
      .catch(() => setRecentVideos([]));
  }, []);

  return (
    <div className="bg-background min-h-screen">
      <section
        className="relative overflow-hidden bg-cover bg-center text-background py-24 px-4"
        style={{ backgroundImage: "url('https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/b92874e60_ChatGPTImageMay12202602_07_28PM.png')" }}
      >
        <div className="absolute inset-0 pointer-events-none bg-black/50" />
        <div className="max-w-[1200px] mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
            <Badge className="bg-background/10 text-background border-background/20 mb-5">Private AI media generation</Badge>
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight">UnitySora</h1>
            <p className="text-xl text-background/80 mb-3 max-w-2xl mx-auto leading-relaxed">AI Image & Video Generation</p>
            <p className="text-sm text-background/65 mb-8 max-w-xl mx-auto">Create private images and videos from prompts, then manage your outputs in separate galleries.</p>
            <div className="flex flex-wrap gap-3 justify-center mb-10">
              <Link to="/generate">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-lg">
                  <Video className="w-5 h-5" /> Generate Video
                </Button>
              </Link>
              <Link to="/gallery">
                <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10 gap-2">
                  <Play className="w-5 h-5" /> Video Gallery
                </Button>
              </Link>
              <Link to="/generate-image">
                <Button size="lg" className="bg-background text-foreground hover:bg-background/90 gap-2 font-semibold shadow-lg">
                  <Wand2 className="w-5 h-5" /> Generate Image
                </Button>
              </Link>
              <Link to="/image-gallery">
                <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10 gap-2">
                  <Images className="w-5 h-5" /> Image Gallery
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30 border-y border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Creative Video Demos</h2>
            <p className="text-muted-foreground text-sm">Sample motion outputs and prompts</p>
          </div>
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
            {DEMO_VIDEOS.map((demo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border shadow-sm group cursor-pointer bg-card mb-3"
                onClick={() => setSelectedDemo({ prompt: demo.prompt, thumbnail_url: demo.url, resolution: "Demo", aspect_ratio: "Preview", duration: "Loop", mode: "t2v", likes: 0 })}
              >
                <div className="relative bg-black overflow-hidden">
                  <img src={demo.url} alt={demo.prompt} className="w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-foreground/80 leading-relaxed line-clamp-2">{demo.prompt}</p>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="text-center mt-8 flex flex-wrap gap-3 justify-center">
            <Link to="/gallery"><Button variant="outline" className="gap-2">View Video Gallery <ArrowRight className="w-4 h-4" /></Button></Link>
            <Link to="/image-gallery"><Button variant="outline" className="gap-2"><ImageIcon className="w-4 h-4" /> View Image Gallery</Button></Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3"><feature.icon className="w-5 h-5 text-primary" /></div>
                <h3 className="font-semibold text-foreground mb-1.5">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {recentVideos.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Recent Videos</h2>
                <p className="text-muted-foreground text-sm mt-1">Recently generated playable videos</p>
              </div>
              <Link to="/gallery"><Button variant="outline" size="sm" className="gap-1.5">View All <ArrowRight className="w-3.5 h-3.5" /></Button></Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentVideos.map((video) => (
                <button key={video.id} onClick={() => setSelectedDemo(video)} className="text-left rounded-xl overflow-hidden border border-border bg-card group shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative bg-black overflow-hidden aspect-video">
                    <video src={video.video_url} poster={getPoster(video)} muted playsInline preload="metadata" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/10"><PlayCircle className="w-8 h-8 text-white drop-shadow" /></div>
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded"><Heart className="w-2.5 h-2.5" /> {video.likes || 0}</div>
                  </div>
                  <div className="p-2.5"><p className="text-xs text-foreground line-clamp-2 leading-relaxed">{video.prompt}</p></div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="py-20 px-4 text-center bg-foreground text-background">
        <h2 className="text-3xl font-bold mb-4">Start Creating</h2>
        <p className="text-background/70 mb-8 max-w-lg mx-auto">Choose image or video generation and save your creations privately to your account.</p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link to="/generate"><Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-lg px-8"><Video className="w-5 h-5" /> Generate Video</Button></Link>
          <Link to="/generate-image"><Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10 gap-2 font-semibold px-8"><ImageIcon className="w-5 h-5" /> Generate Image</Button></Link>
        </div>
      </section>

      <VideoModal video={selectedDemo} onClose={() => setSelectedDemo(null)} onLike={() => {}} />
    </div>
  );
}