import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { Wand2, ArrowRight, Play, Zap, Globe, Users, BarChart2, Heart } from "lucide-react";

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
  { icon: Zap, title: "State-of-the-Art 11B Model", desc: "On-par performance with HunyuanVideo 11B & Step-Video 30B, trained for only $200K." },
  { icon: Globe, title: "Text & Image to Video", desc: "Generate videos from text prompts or reference images at 256px and 768px resolutions." },
  { icon: BarChart2, title: "Flexible Controls", desc: "Fine-tune motion score, aesthetic score, camera motion, CFG scale, and sampling steps." },
  { icon: Users, title: "Fully Open-Source", desc: "All model weights, training code, and inference scripts available on GitHub & Hugging Face." },
];

const NEWS = [
  { date: "2025.03.12", text: "Open-Sora 2.0 (11B) released — training cost only $200K. On-par with HunyuanVideo & Step-Video.", hot: true },
  { date: "2025.02.20", text: "Open-Sora 1.3 (1B) released — upgraded VAE and Transformer architecture.", hot: true },
  { date: "2024.12.23", text: "Development cost saved by 50%! Open-source solutions available with H200 GPU vouchers.", hot: false },
  { date: "2024.06.17", text: "Open-Sora 1.2 released with 3D-VAE, rectified flow, and score condition.", hot: false },
];

export default function Home() {
  const [recentVideos, setRecentVideos] = useState([]);

  useEffect(() => {
    base44.entities.GeneratedVideo.filter({ status: "completed" }, "-created_date", 8)
      .then(setRecentVideos)
      .catch(() => {});
  }, []);

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-foreground via-foreground/95 to-primary/80 text-background py-24 px-4">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-80 h-80 bg-accent/20 rounded-full blur-3xl" />
        </div>
        <div className="max-w-[1200px] mx-auto relative z-10 text-center">
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: "easeOut" }}>
            <img
              src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/4589efdb8_github_com_icon_6c4ebda9.png"
              alt="Open-Sora"
              className="h-20 w-auto mx-auto mb-6 drop-shadow-2xl"
            />
            <h1 className="text-5xl sm:text-6xl font-bold mb-4 leading-tight">
              UnitySora
            </h1>
            <p className="text-xl text-background/80 mb-3 max-w-2xl mx-auto leading-relaxed">
              Democratizing Efficient Video Production for All
            </p>
            <p className="text-sm text-background/60 mb-8 max-w-xl mx-auto">
              An open-source initiative to make high-quality AI video generation accessible to everyone.
            </p>
            <div className="flex flex-wrap gap-3 justify-center mb-10">
              <Link to="/generate">
                <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-lg">
                  <Wand2 className="w-5 h-5" /> Generate Video
                </Button>
              </Link>
              <Link to="/gallery">
                <Button size="lg" variant="outline" className="border-background/30 text-background hover:bg-background/10 gap-2">
                  <Play className="w-5 h-5" /> View Gallery
                </Button>
              </Link>

            </div>

          </motion.div>
        </div>
      </section>

      {/* Demo GIF Grid */}
      <section className="py-16 px-4 bg-muted/30 border-y border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Open-Sora v2.0 Demos</h2>
            <p className="text-muted-foreground text-sm">Sample outputs from the Open-Sora 2.0 model</p>
          </div>
          <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
            {DEMO_VIDEOS.map((demo, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border shadow-sm group cursor-pointer bg-card mb-3"
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
          <div className="text-center mt-8">
            <Link to="/gallery">
              <Button variant="outline" className="gap-2">
                View Full Gallery <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-foreground mb-2">Why Open-Sora?</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border border-border rounded-xl p-5 hover:shadow-md transition-shadow"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center mb-3">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-1.5">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* News */}
      <section className="py-16 px-4 bg-muted/20 border-y border-border">
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-foreground">📰 News</h2>
          </div>
          <div className="space-y-3">
            {NEWS.map((item, i) => (
              <div key={i} className="flex gap-4 p-4 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0" />
                <div>
                  <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded mr-2">[{item.date}]</span>
                  {item.hot && <span className="text-orange-500 text-sm mr-2">🔥</span>}
                  <span className="text-sm text-foreground">{item.text}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent user-generated videos */}
      {recentVideos.length > 0 && (
        <section className="py-16 px-4">
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Community Creations</h2>
                <p className="text-muted-foreground text-sm mt-1">Recently generated by users</p>
              </div>
              <Link to="/gallery">
                <Button variant="outline" size="sm" className="gap-1.5">View All <ArrowRight className="w-3.5 h-3.5" /></Button>
              </Link>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {recentVideos.slice(0, 8).map((v, i) => (
                <div key={v.id} className="rounded-xl overflow-hidden border border-border bg-card group shadow-sm hover:shadow-md transition-shadow">
                  <div className="relative bg-black overflow-hidden aspect-video">
                    <img src={v.thumbnail_url} alt={v.prompt} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className="absolute bottom-1 right-1 flex items-center gap-0.5 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">
                      <Heart className="w-2.5 h-2.5" /> {v.likes || 0}
                    </div>
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs text-foreground line-clamp-2 leading-relaxed">{v.prompt}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Eval charts */}
      <section className="py-16 px-4 bg-muted/20 border-t border-border">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-2xl font-bold text-foreground mb-8 text-center">📊 Evaluation</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-3 border border-border shadow-sm">
              <p className="text-xs font-medium text-gray-600 text-center mb-2">VBench Score</p>
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/ddbde3e00_github_com_v2_vbench_9df5221a.png" alt="VBench" className="w-full rounded" />
            </div>
            <div className="bg-white rounded-xl p-3 border border-border shadow-sm">
              <p className="text-xs font-medium text-gray-600 text-center mb-2">Human Preference Win Rate</p>
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/f46bfde16_github_com_v2_winrate_3e9b360a.png" alt="Win Rate" className="w-full rounded" />
            </div>
            <div className="bg-white rounded-xl p-3 border border-border shadow-sm">
              <p className="text-xs font-medium text-gray-600 text-center mb-2">Cost Efficiency</p>
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/9f18b0b05_github_com_v2_cost_41a45c58.png" alt="Cost" className="w-full rounded" />
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 text-center bg-foreground text-background">
        <h2 className="text-3xl font-bold mb-4">Start Generating Videos</h2>
        <p className="text-background/70 mb-8 max-w-lg mx-auto">Enter a text prompt and create high-quality videos in seconds with Open-Sora's 11B model.</p>
        <Link to="/generate">
          <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-semibold shadow-lg px-8">
            <Wand2 className="w-5 h-5" /> Try Now — It's Free
          </Button>
        </Link>
      </section>
    </div>
  );
}