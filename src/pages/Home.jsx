import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { GitFork, Star, Eye, Code, GitPullRequest, AlertCircle, Shield, BarChart2, Folder, FileText, Clock, ChevronRight, Copy, Check, BookOpen, Scale, Users, Tag, Globe, Activity, Play, Video, MapPin, Flame, Sun, Terminal, Box, Quote, HelpCircle, ChevronDown, Database } from 'lucide-react';

// Inline CSS for keyframes
const style = document.createElement('style');
style.textContent = `
  @keyframes floatA { 0%, 100% { transform: translateY(0) rotate(0deg) scale(1); } 50% { transform: translateY(-20px) rotate(5deg) scale(1.05); } }
  @keyframes floatB { 0%, 100% { transform: translateY(0) rotate(0deg) scale(1); } 50% { transform: translateY(20px) rotate(-5deg) scale(1.05); } }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  @keyframes pulse-subtle { 0%, 100% { opacity: 1; } 50% { opacity: 0.8; } }
`;
document.head.appendChild(style);

const AnimatedElement = ({ children, className = "", delay = 0, yOffset = 20 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setIsVisible(true); return; }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        clearTimeout(fallback);
        setTimeout(() => setIsVisible(true), delay);
        observer.unobserve(el);
      }
    }, { threshold: 0.05, rootMargin: "0px 0px -50px 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <div
      ref={ref}
      style={{ transitionProperty: 'opacity, transform', transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)' }}
      className={`duration-1000 ${isVisible ? "opacity-100 translate-y-0" : `opacity-0 translate-y-[${yOffset}px]`} ${className}`}
    >
      {children}
    </div>
  );
};

function RepoHeader() {
  return (
    <div className="border-b border-border bg-background pt-4 pb-0 z-10 relative shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2 flex-wrap text-lg">
            <BookOpen className="w-5 h-5 text-muted-foreground" />
            <span className="text-accent font-medium hover:underline cursor-pointer">hpcaitech</span>
            <span className="text-muted-foreground px-1">/</span>
            <a href="#" className="font-semibold text-foreground hover:text-accent transition-colors">Open-Sora</a>
            <Badge className="bg-transparent text-muted-foreground border border-border text-xs px-2 py-0.5 rounded-full font-medium ml-2">Public</Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium text-secondary-foreground transition-all shadow-sm hover:shadow active:scale-95">
              <Eye className="w-4 h-4 text-muted-foreground" /> Watch
              <span className="bg-background border border-border px-2 py-0.5 rounded-full text-xs ml-1">235</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium text-secondary-foreground transition-all shadow-sm hover:shadow active:scale-95">
              <GitFork className="w-4 h-4 text-muted-foreground" /> Fork
              <span className="bg-background border border-border px-2 py-0.5 rounded-full text-xs ml-1">2.9k</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium text-secondary-foreground transition-all shadow-sm hover:shadow active:scale-95 group">
              <Star className="w-4 h-4 text-muted-foreground group-hover:text-yellow-500 transition-colors" /> Star
              <span className="bg-background border border-border px-2 py-0.5 rounded-full text-xs ml-1">29k</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto scrollbar-hide -mb-px">
          {[
            { label: "Code", icon: Code, active: true },
            { label: "Issues", icon: AlertCircle, count: "0" },
            { label: "Pull requests", icon: GitPullRequest, count: "11" },
            { label: "Actions", icon: Activity },
            { label: "Projects", icon: Folder },
            { label: "Security", icon: Shield },
            { label: "Insights", icon: BarChart2 },
          ].map((item, i) => (
            <button key={item.label} className={`flex items-center gap-2 px-4 py-3 text-sm transition-all whitespace-nowrap relative group ${item.active ? "text-foreground font-semibold" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground rounded-t-md"}`}>
              <item.icon className={`w-4 h-4 ${item.active ? "text-foreground" : "text-muted-foreground group-hover:text-foreground transition-colors"}`} />
              {item.label}
              {item.count !== undefined && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${item.active ? 'bg-muted text-foreground' : 'bg-secondary text-muted-foreground group-hover:bg-muted group-hover:text-foreground'}`}>
                  {item.count}
                </span>
              )}
              {item.active && (
                <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#fd8c73] rounded-t-sm" />
              )}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}

function CodeBlock({ code, title = "Shell" }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="relative rounded-lg border border-border bg-foreground shadow-sm overflow-hidden my-4 group transition-shadow hover:shadow-md">
      <div className="flex items-center justify-between px-4 py-2.5 bg-background/5 border-b border-background/10">
        <span className="text-xs font-medium text-background/80 flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5" /> {title}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs font-medium text-background/70 hover:text-background hover:bg-background/10 px-2 py-1 rounded transition-colors active:scale-95"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-5 py-4 text-sm overflow-x-auto text-background/90 leading-relaxed font-mono"><code>{code}</code></pre>
    </div>
  );
}

function RepoFiles() {
  const [repoFiles, setRepoFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    base44.entities.RepoFile.list("sort_order", 20).then(setRepoFiles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const staticFallback = [
    { name: ".github/workflows", type: "directory", last_commit: "Hotfix/gallery build (#337)", last_updated: "Apr 27, 2024" },
    { name: "assets/texts", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "configs", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "docs", type: "directory", last_commit: "add DCAE download cmd (#817)", last_updated: "last month" },
    { name: "gradio", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "opensora", type: "directory", last_commit: "[ckpt] mitigate gpu mem peak when loading ckpt", last_updated: "last year" },
    { name: "scripts", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "tests", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: ".pre-commit-config.yaml", type: "file", last_commit: fix_commit_text, last_updated: "2 years ago" },
    { name: "CONTRIBUTING.md", type: "file", last_commit: "Doc v1.1 (#396)", last_updated: "last year" },
    { name: "LICENSE", type: "file", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "README.md", type: "file", last_commit: "[doc] Update README.md (#917)", last_updated: "last month" },
    { name: "requirements.txt", type: "file", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
  ];

  const fix_commit_text = "fix: entry setting in pre-commit hooks (#582)";
  const items = repoFiles.length > 0 ? repoFiles : staticFallback;

  return (
    <div className={`border border-border rounded-lg overflow-hidden bg-card shadow-sm transition-all duration-700 ${loading ? "opacity-50 blur-sm" : "opacity-100 blur-0"}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 bg-muted/40 border-b border-border">
        <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/01b5412ae_avatars_githubusercontent_com_42895286_a277d15c.png" className="w-6 h-6 rounded-full border border-border bg-background" alt="contributor" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm flex-1 min-w-0">
          <span className="font-semibold text-foreground hover:text-accent cursor-pointer transition-colors">Yanjia0</span>
          <a href="#" className="text-muted-foreground hover:text-accent transition-colors truncate">[doc] Update README.md (#917)</a>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
          <a href="#" className="hover:text-accent transition-colors hidden sm:block">b5b5c92</a>
          <span className="hidden sm:block">13 days ago</span>
          <a href="#" className="flex items-center gap-1.5 hover:text-accent transition-colors font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span className="text-foreground">1,333</span> Commits
          </a>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <tbody className="divide-y divide-border">
            {items.map((file, i) => (
              <tr key={i} className="group hover:bg-muted/30 transition-colors duration-200">
                <td className="py-2.5 px-4 w-[250px] sm:w-[300px]">
                  <div className="flex items-center gap-2.5">
                    {file.type === "directory"
                      ? <Folder className="w-4 h-4 text-[#54aeff] fill-[#54aeff]/20 flex-shrink-0" />
                      : <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                    <a href="#" className="text-foreground hover:text-accent hover:underline font-medium truncate transition-colors">{file.name}</a>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell w-auto">
                  <a href="#" className="hover:text-accent transition-colors truncate block max-w-md">{file.last_commit}</a>
                </td>
                <td className="py-2.5 px-4 text-muted-foreground text-right whitespace-nowrap hidden sm:table-cell w-[120px]">
                  {file.last_updated}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReadmeSection() {
  const demos = [
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/8a3461ba8_github_com_ft_0001_1_1_b592012d.gif", label: "5s 1024×576" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3e8373b8e_github_com_movie_0160_14e4c623.gif", label: "5s 576×1024" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/54e14cb1f_github_com_movie_0017_3792da5e.gif", label: "5s 576×1024" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/bafccced1_github_com_ft_0012_1_1_a3be425d.gif", label: "5s 1024×576" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/520245207_github_com_douyin_0005_c7c692d2.gif", label: "5s 576×1024" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/392397313_github_com_movie_0037_14e6323a.gif", label: "5s 576×1024" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/1761cdd72_github_com_ft_0055_1_1_695ee2c8.gif", label: "5s 1024×576" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/c726b7a5b_github_com_sora_0019_9852d2d9.gif", label: "5s 576×1024" },
    { url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/95e4f853a_github_com_movie_0463_40411fe9.gif", label: "5s 576×1024" },
  ];

  const news = [
    { date: "2025.03.12", title: "Open-Sora 2.0 Released", description: "We released Open-Sora 2.0 (11B). 11B model achieves on-par performance with 11B HunyuanVideo & 30B Step-Video. Training cost: only $200K.", highlight: true },
    { date: "2025.02.20", title: "Open-Sora 1.3 Released", description: "We released Open-Sora 1.3 (1B). With the upgraded VAE and Transformer architecture, video quality greatly improved.", highlight: true },
    { date: "2024.12.23", title: "50% Cost Reduction", description: "The development cost of video generation models has saved by 50%! Open-source solutions with H200 GPU vouchers.", highlight: false },
    { date: "2024.06.17", title: "Open-Sora 1.2 Released", description: "We released Open-Sora 1.2, which includes 3D-VAE, rectified flow, and score condition.", highlight: false },
    { date: "2024.04.25", title: "Open-Sora 1.1 Released", description: "Support for 2s~15s, 144p to 720p, any aspect ratio text-to-video, image-to-video, video-to-video generation.", highlight: false },
    { date: "2024.03.18", title: "Open-Sora 1.0 Released", description: "Fully open-source project for video generation. Model can produce 2s 512x512 videos with only 3 days training.", highlight: false },
  ];

  return (
    <div className="bg-background text-foreground text-base leading-relaxed break-words">
      {/* Hero / Logo Section */}
      <div className="relative overflow-hidden py-12 flex flex-col items-center gap-6 border-b border-border/50 mb-8">
        {/* Decorative Orbs */}
        <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none z-0" style={{ animation: 'floatA 10s infinite' }} />
        <div className="absolute top-1/3 right-1/4 -translate-y-1/2 w-80 h-80 bg-accent/10 rounded-full blur-3xl pointer-events-none z-0" style={{ animation: 'floatB 12s infinite 2s' }} />

        <AnimatedElement className="relative z-10 flex flex-col items-center">
          <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/4589efdb8_github_com_icon_6c4ebda9.png" alt="Open-Sora Logo" className="h-32 w-auto mb-6 drop-shadow-lg hover:scale-105 transition-transform duration-500" />

          <div className="flex flex-wrap gap-2.5 justify-center mb-4">
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3566b20f0_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f73746172732f6870636169746563682f4f70656e2d536f72613f7374796c653d736f6369616c_eaad82cf.png" alt="Stars" className="h-5" /></a>
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://camo.githubusercontent.com/e6b595b117171cbf1291b230177d952d27f8d236d085195bc23f7aa29b28140d/68747470733a2f2f696d672e736869656c64732e696f2f7374617469632f76313f6c6162656c3d54656368205265706f727420322e30266d6573736167653d417278697626636f6c6f723d726564" alt="Tech Report 2.0" className="h-5" /></a>
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://camo.githubusercontent.com/e18c9eb845449ccbc2f98bba10c2b1ca9c889291777c51780c209607444c0367/68747470733a2f2f696d672e736869656c64732e696f2f7374617469632f76313f6c6162656c3d54656368205265706f727420312e32266d6573736167653d417278697626636f6c6f723d726564" alt="Tech Report 1.2" className="h-5" /></a>
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/535abee8b_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f47616c6c6572792d566965772d6f72616e67653f6c6f676f3d26_0d47823a.png" alt="Gallery" className="h-5" /></a>
          </div>
          <div className="flex flex-wrap gap-2.5 justify-center">
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/c4a0d812f_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f446973636f72642d6a6f696e2d626c756576696f6c65743f6c6f676f3d646973636f726426_8ea2d346.png" alt="Discord" className="h-5" /></a>
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/a3a477e83_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f536c61636b2d436f6c6f7373616c41492d626c756576696f6c65743f6c6f676f3d736c61636b26_a8a9228d.png" alt="Slack" className="h-5" /></a>
            <a href="#" className="hover:opacity-80 transition-opacity"><img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/8dc50bdef_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f547769747465722d446973637573732d626c75653f6c6f676f3d7477697474657226_e18d6058.png" alt="Twitter" className="h-5" /></a>
          </div>
        </AnimatedElement>
      </div>

      <div className="px-6 md:px-10 pb-12 max-w-4xl mx-auto">
        {/* Intro */}
        <AnimatedElement delay={100}>
          <h2 className="text-3xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">
            Open-Sora: Democratizing Efficient Video Production for All
          </h2>
          <p className="text-foreground/90 mb-5 text-lg leading-relaxed">
            We design and implement <strong>Open-Sora</strong>, an initiative dedicated to <strong>efficiently</strong> producing high-quality video. We hope to make the model, tools and all details accessible to all. By embracing <strong>open-source</strong> principles, Open-Sora not only democratizes access to advanced video generation techniques, but also offers a streamlined and user-friendly platform that simplifies the complexities of video generation. With Open-Sora, our goal is to foster innovation, creativity, and inclusivity within the field of content creation.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8 flex items-start gap-3 shadow-sm">
            <Info className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
            <p className="text-foreground/90 font-medium">
              For a professional AI video-generation product, try{" "}
              <a href="https://video-ocean.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary/80 hover:underline transition-colors underline-offset-4 font-semibold">Video Ocean</a>
              {" "}— powered by a superior model.
            </p>
          </div>
        </AnimatedElement>

        {/* Promos */}
        <AnimatedElement delay={150} className="space-y-4 mb-12">
          {[
            { url: "https://video-ocean.com/", img: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/f1a8aa8e9_github_com_3_c30d1e7c.gif" },
            { url: "https://hpc-ai.com/", img: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/9b2b3eac7_github_com_1_385c9ff0.gif" },
            { url: "https://hpc-ai.com/model-apis", img: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/60ffc7ec5_github_com_0408_7db1450d.gif" }
          ].map((promo, i) => (
            <a key={i} href={promo.url} target="_blank" rel="noopener noreferrer" className="block group">
              <div className="relative rounded-xl overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-all duration-300 transform group-hover:-translate-y-1">
                <img src={promo.img} alt="Promo" className="w-full object-cover" />
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/5 transition-colors duration-300" />
              </div>
            </a>
          ))}
        </AnimatedElement>

        {/* News */}
        <AnimatedElement delay={200}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">
            <FileText className="w-6 h-6 text-accent" /> News
          </h2>
          <ul className="space-y-4 mb-8">
            {news.map((item, i) => (
              <li key={i} className="flex gap-4 group">
                <div className="w-2 h-2 rounded-full bg-border group-hover:bg-accent mt-2 flex-shrink-0 transition-colors" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded text-sm border border-border/50">[{item.date}]</span>
                    {item.highlight && <Flame className="w-4 h-4 text-orange-500 animate-pulse" />}
                  </div>
                  <p className="text-foreground/80 leading-relaxed">
                    <strong>{item.title}:</strong> {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-12 flex items-start gap-3 text-sm text-foreground/80">
            <MapPin className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p>
              Since Open-Sora is under active development, we remain different branches for different versions. The latest version is{" "}
              <a href="#" className="text-accent font-medium hover:underline">main</a>. Old versions include:{" "}
              <a href="#" className="text-accent hover:underline">v1.0</a>,{" "}
              <a href="#" className="text-accent hover:underline">v1.1</a>,{" "}
              <a href="#" className="text-accent hover:underline">v1.2</a>,{" "}
              <a href="#" className="text-accent hover:underline">v1.3</a>.
            </p>
          </div>
        </AnimatedElement>

        {/* Latest Demo */}
        <AnimatedElement delay={250}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">
            <Video className="w-6 h-6 text-accent" /> Latest Demo
          </h2>
          <p className="text-foreground/80 mb-6 bg-secondary/30 p-3 rounded-md border border-border/30">
            Demos are presented in compressed GIF format for convenience. For original quality samples and their corresponding prompts, please visit our{" "}
            <a href="https://hpcaitech.github.io/Open-Sora/" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline flex-inline items-center gap-1">Gallery <ExternalLink className="w-3 h-3" /></a>.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-12">
            {demos.map((demo, i) => (
              <AnimatedElement key={i} delay={i * 50} yOffset={10}>
                <div className="relative group rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-black aspect-[9/16]">
                  <img src={demo.url} alt={`Demo ${i + 1}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
                    <span className="text-white text-xs font-medium bg-white/20 backdrop-blur-sm px-2 py-1 rounded-sm">{demo.label}</span>
                  </div>
                </div>
              </AnimatedElement>
            ))}
          </div>
        </AnimatedElement>

        {/* Reports */}
        <AnimatedElement delay={300}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">
            <Sun className="w-6 h-6 text-yellow-500" /> Reports
          </h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-12">
            <ul className="space-y-4 text-foreground/90">
              <li className="flex items-start gap-3">
                <Box className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
                <a href="https://arxiv.org/abs/2503.09642v1" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline text-lg">Tech Report of Open-Sora 2.0</a>
              </li>
              <li className="flex items-start gap-3">
                <Box className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <a href="#" className="text-foreground hover:text-accent transition-colors font-medium">Step by step to train or finetune your own model</a>
              </li>
              <li className="flex items-start gap-3">
                <Box className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <a href="#" className="text-foreground hover:text-accent transition-colors font-medium">Step by step to train and evaluate an video autoencoder</a>
              </li>
              <li className="flex items-start gap-3">
                <Box className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <a href="#" className="text-foreground hover:text-accent transition-colors font-medium">Visit the high compression video autoencoder</a>
              </li>
              <li className="pt-2">
                <span className="font-semibold text-foreground mb-2 block">Reports of previous versions:</span>
                <ul className="ml-6 space-y-2 list-disc text-muted-foreground">
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.3</a>: shift-window attention, unified spatial-temporal VAE, etc.</li>
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.2</a>, <a href="https://arxiv.org/abs/2412.20404" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Tech Report</a>: rectified flow, 3d-VAE, score condition, evaluation, etc.</li>
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.1</a>: multi-resolution/length/aspect-ratio, image/video conditioning/editing, data preprocessing, etc.</li>
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.0</a>: architecture, captioning, etc.</li>
                </ul>
              </li>
            </ul>
          </div>
        </AnimatedElement>

        {/* Quickstart */}
        <AnimatedElement delay={350}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">Quickstart</h2>

          <div className="space-y-8 mb-12">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2"><Play className="w-5 h-5 text-muted-foreground" /> Installation</h3>
              <CodeBlock title="Bash" code={`# create a virtual env and activate (conda)
conda create -n opensora python=3.10
conda activate opensora

# download the repo
git clone https://github.com/hpcaitech/Open-Sora
cd Open-Sora

# Ensure torch >= 2.4.0
pip install -v .  # for development mode, \`pip install -v -e .\`
pip install xformers==0.0.27.post2 --index-url https://download.pytorch.org/whl/cu121
pip install flash-attn --no-build-isolation`} />
              <p className="text-foreground/80 mt-2 text-sm bg-muted/50 p-3 rounded-md border border-border/50">Optionally, you can install flash attention 3 for faster speed.</p>
              <CodeBlock title="Bash" code={`git clone https://github.com/Dao-AILab/flash-attention  # 4f0640d5
cd flash-attention/hopper
python setup.py install`} />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2"><Database className="w-5 h-5 text-muted-foreground" /> Model Download</h3>
              <p className="text-foreground/80 mb-3 leading-relaxed">
                Our 11B model supports 256px and 768px resolution. Both T2V and I2V are supported by one model.{" "}
                <a href="https://huggingface.co/hpcai-tech/Open-Sora-v2" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline inline-flex items-center gap-1">🤗 Huggingface</a>{" "}
                <a href="https://modelscope.cn/models/luchentech/Open-Sora-v2" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline inline-flex items-center gap-1">🤖 ModelScope</a>.
              </p>
              <p className="text-foreground font-medium mb-1 text-sm">Download from huggingface:</p>
              <CodeBlock title="Bash" code={`pip install "huggingface_hub[cli]"
huggingface-cli download hpcai-tech/Open-Sora-v2 --local-dir ./ckpts`} />
              <p className="text-foreground font-medium mb-1 mt-4 text-sm">Download from ModelScope:</p>
              <CodeBlock title="Bash" code={`pip install modelscope
modelscope download hpcai-tech/Open-Sora-v2 --local_dir ./ckpts`} />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2"><Video className="w-5 h-5 text-muted-foreground" /> Text-to-Video Generation</h3>
              <p className="text-foreground font-medium mb-1 text-sm">For 256x256 resolution:</p>
              <CodeBlock title="Bash" code={`# Generate one given prompt
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea"

# Save memory with offloading
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea" --offload True`} />
              <p className="text-foreground font-medium mb-1 mt-4 text-sm">For 768x768 resolution:</p>
              <CodeBlock title="Bash" code={`# One GPU
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_768px.py --save-dir samples --prompt "raining, sea"

# Multi-GPU with colossalai sp
torchrun --nproc_per_node 8 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_768px.py --save-dir samples --prompt "raining, sea"`} />
            </div>
            
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-3 flex items-center gap-2"><Box className="w-5 h-5 text-muted-foreground" /> Image-to-Video Generation</h3>
              <p className="text-foreground/80 mb-2 text-sm">Given a prompt and a reference image, you can generate a video with the following command:</p>
              <CodeBlock title="Bash" code={`# 256px
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/i2v_256px.py --save-dir samples --prompt "raining, sea" --image-path path/to/image.jpg

# 768px (one GPU)
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/i2v_768px.py --save-dir samples --prompt "raining, sea" --image-path path/to/image.jpg`} />
            </div>
          </div>
        </AnimatedElement>
        
        {/* Advanced Usage */}
        <AnimatedElement delay={400}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">Advanced Usage</h2>
          
          <div className="space-y-8 mb-12">
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow transition-shadow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Motion Score</h3>
              <p className="text-sm text-muted-foreground mb-4">During training, we provide motion score into the text prompt. During inference, you can use the following command to generate videos with motion score (the default score is 4):</p>
              <CodeBlock title="Bash" code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2v_256px.py --save-dir samples --prompt "raining, sea" --motion-score 7`} />
            </div>

            <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow transition-shadow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Prompt Refine</h3>
              <p className="text-sm text-muted-foreground mb-4">We take advantage of ChatGPT to refine the prompt. You can use the following command to refine the prompt. This function is available for both text-to-video and image-to-video generation.</p>
              <CodeBlock title="Bash" code={`# set OPENAI_API_KEY first
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2v_256px.py --save-dir samples --prompt "raining, sea" --refine-prompt True`} />
            </div>
            
            <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow transition-shadow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Reproducibility</h3>
              <p className="text-sm text-muted-foreground mb-4">To make the results reproducible, you can set the random seed by adding <code>--seed &lt;seed_number&gt;</code> to the command.</p>
              <CodeBlock title="Bash" code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2v_256px.py --save-dir samples --prompt "raining, sea" --seed 42`} />
            </div>
            
             <div className="bg-card border border-border p-6 rounded-xl shadow-sm hover:shadow transition-shadow">
              <h3 className="text-lg font-semibold text-foreground mb-2">Computational Efficiency</h3>
              <p className="text-sm text-muted-foreground mb-4">We test the computational efficiency of our models on H100 (80G) GPUs. For 256x256, we use colossalai's tensor parallelism, and ... (refer to Tech Report). For 768x768, we use colossalai's sequence parallelism. All uses number of steps 50. The results are presented in the format: <code>time (s) / peak GPU memory (GB)</code></p>
              
              <div className="overflow-x-auto mt-4 rounded-lg border border-border">
                <table className="w-full text-sm text-left">
                  <thead className="bg-muted text-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-4 py-2">Resolution</th>
                      <th className="px-4 py-2">1x GPU</th>
                      <th className="px-4 py-2">2x GPUs</th>
                      <th className="px-4 py-2">4x GPUs</th>
                      <th className="px-4 py-2">8x GPUs</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    <tr className="bg-background">
                      <td className="px-4 py-2 font-medium text-foreground">256x256</td>
                      <td className="px-4 py-2 text-accent">69 / 12.3</td>
                      <td className="px-4 py-2 text-accent">46 / 14.3</td>
                      <td className="px-4 py-2 text-accent">34 / 14.3</td>
                      <td className="px-4 py-2 text-accent">-</td>
                    </tr>
                    <tr className="bg-muted/30">
                      <td className="px-4 py-2 font-medium text-foreground">768x768</td>
                      <td className="px-4 py-2 text-accent">1016 / 49.3</td>
                      <td className="px-4 py-2 text-accent">593 / 43.1</td>
                      <td className="px-4 py-2 text-accent">366 / 44.1</td>
                      <td className="px-4 py-2 text-accent">274 / 44.3</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </AnimatedElement>

        {/* Evaluation */}
        <AnimatedElement delay={450}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight mt-4"><BarChart2 className="w-6 h-6 text-accent" /> Evaluation</h2>
          <div className="bg-secondary/20 p-6 rounded-xl border border-border mb-12">
            <p className="text-foreground/90 mb-6 leading-relaxed">
              On <a href="https://huggingface.co/spaces/Vchitect/VBench_Leaderboard" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline">VBench</a>, Open-Sora 2.0 significantly narrows the gap with OpenAI's Sora, reducing it from 4.52% → 0.69% compared to Open-Sora 1.2.
            </p>
            <div className="bg-white rounded-lg p-2 shadow-sm border border-border/50 overflow-hidden mb-8 transform hover:scale-[1.01] transition-transform">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/ddbde3e00_github_com_v2_vbench_9df5221a.png" alt="VBench Results" className="w-full h-auto rounded" />
            </div>
            
            <p className="text-foreground/90 mb-6 leading-relaxed">Human preference results show our model is on par with HunyuanVideo 11B and Step-Video 30B.</p>
            <div className="bg-white rounded-lg p-2 shadow-sm border border-border/50 overflow-hidden mb-8 transform hover:scale-[1.01] transition-transform">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/f46bfde16_github_com_v2_winrate_3e9b360a.png" alt="Win Rate against top models" className="w-full h-auto rounded" />
            </div>
            
            <p className="text-foreground/90 mb-6 leading-relaxed">With strong performance, Open-Sora 2.0 is cost-effective.</p>
            <div className="bg-white rounded-lg p-2 shadow-sm border border-border/50 overflow-hidden transform hover:scale-[1.01] transition-transform">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/9f18b0b05_github_com_v2_cost_41a45c58.png" alt="Cost comparison" className="w-full h-auto rounded" />
            </div>
          </div>
        </AnimatedElement>

        {/* Contribution */}
        <AnimatedElement delay={500}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight"><Users className="w-6 h-6 text-accent" /> Contribution</h2>
          <div className="bg-card border border-border rounded-xl p-6 shadow-sm mb-12 text-center">
            <p className="text-foreground/80 mb-6">Thanks goes to these wonderful contributors:</p>
            <a href="#" target="_blank" rel="noopener noreferrer" className="block transform hover:scale-[1.02] transition-transform duration-300">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/616edc2d2_camo_githubusercontent.com_68747470733a2f2f636f6e747269622e726f636b732f696d6167653f7265706f3d6870636169746563682f4f70656e2d536f7261_2021682b.png" alt="Contributors" className="w-full max-w-2xl mx-auto rounded" />
            </a>
            <p className="text-foreground/80 mt-6 text-sm">
              If you wish to contribute to this project, please refer to the{" "}
              <a href="#" className="text-accent font-medium hover:underline">Contribution Guideline</a>.
            </p>
          </div>
        </AnimatedElement>
        
        {/* Acknowledgement */}
        <AnimatedElement delay={550}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight">Acknowledgement</h2>
          <div className="text-foreground/80 space-y-3 text-sm bg-muted/30 p-6 rounded-xl border border-border mb-12">
            <p>Here we only list a few of the projects. For other works and datasets, please refer to our report.</p>
            <ul className="list-disc ml-6 space-y-2">
              <li><a href="#" className="text-accent hover:underline">ColossalAI</a>: A powerful large model parallel acceleration and optimization system.</li>
              <li><a href="#" className="text-accent hover:underline">DiT</a>: Scalable Diffusion Models with Transformers.</li>
              <li><a href="#" className="text-accent hover:underline">OpenDiT</a>: An acceleration for DiT training. We adopt valuable acceleration strategies for training progress from OpenDiT.</li>
              <li><a href="#" className="text-accent hover:underline">PixArt-alpha</a>: Fast training of Diffusion Transformer for Photorealistic Text-to-Image Synthesis.</li>
              <li><a href="#" className="text-accent hover:underline">Latte</a>: Latent Diffusion Transformer for Video Generation.</li>
              <li><a href="#" className="text-accent hover:underline">HunyuanVideo</a>: Open-source text-to-video model.</li>
              <li><a href="#" className="text-accent hover:underline">Step-Video-T2V</a>: Open-source text-to-video model.</li>
              <li><a href="#" className="text-accent hover:underline">DCAE</a>: Deep Compression AutoEncoder for Image compression.</li>
              <li><a href="#" className="text-accent hover:underline">BLIP</a>: A powerful text image embedding model.</li>
              <li><a href="#" className="text-accent hover:underline">T5</a>: A powerful text encoder.</li>
              <li><a href="#" className="text-accent hover:underline">LLaVA</a>: A powerful image captioning model based on LLaMA and Vicuna.</li>
              <li><a href="#" className="text-accent hover:underline">VideoLLaVA</a>: A powerful video captioning model.</li>
              <li><a href="#" className="text-accent hover:underline">VastDesk</a>: A large-scale video dataset with long durations and structured caption.</li>
            </ul>
          </div>
        </AnimatedElement>
        
        {/* Citation */}
        <AnimatedElement delay={600}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight"><Quote className="w-6 h-6 text-accent" /> Citation</h2>
          <div className="mb-12">
             <CodeBlock title="BibTeX" code={`@article{opensora,
  title={Open-Sora: Democratizing efficient video production for all},
  author={Zheng, Zangwei and Xiang, Jian and Yang, Xinyu and Ye, Chenhui and Li, Shenggui and Zhong, Lu and You, Yang},
  journal={arXiv preprint arXiv:2412.20404},
  year={2024}
}`} />
            <CodeBlock title="BibTeX" code={`@article{opensora2,
  title={Open-Sora 2.0: Training a Commercial-level Video Generation Model in $200K},
  author={Zheng, Zangwei and Xiang, Jian and Yang, Xinyu and Ye, Chenhui and Zhong, Lu and You, Yang},
  journal={arXiv preprint arXiv:2503.09642},
  year={2025}
}`} />
          </div>
        </AnimatedElement>

        {/* Star History */}
        <AnimatedElement delay={650}>
          <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-3 tracking-tight"><Star className="w-6 h-6 text-accent fill-accent" /> Star History</h2>
          <div className="bg-white p-2 rounded-xl border border-border shadow-sm transform hover:scale-[1.01] transition-transform duration-300">
            <a href="https://star-history.com/#hpcaitech/Open-Sora&Date" target="_blank" rel="noopener noreferrer">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/13696c62c_camo_githubusercontent_com_68747470733a2f2f6170692e737461722d686973746f72792e636f6d2f7376673f7265706f733d6870636169746563682f4f70656e2d536f726126747970653d44617465_720a9037.png" alt="Star History Chart" className="w-full rounded" />
            </a>
          </div>
        </AnimatedElement>
      </div>
    </div>
  );
}

function Sidebar() {
  const contributors = [
    { name: "@Shen-Chenhui", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/b1d7250d7_avatars_githubusercontent_com_24800477_d04505ff.png" },
    { name: "@FrankLeeeee", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/1314192e3_avatars_githubusercontent_com_31818963_6b7585d7.png" },
    { name: "@zhengzangw", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/4503e09c4_avatars_githubusercontent_com_30647653_d4631f19.png" },
    { name: "@tomyoung903", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/1293b3ef3_avatars_githubusercontent_com_44153440_4f793fbc.png" },
    { name: "@xyupeng", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/03a5447a8_avatars_githubusercontent_com_99191637_5fa8b2a7.png" },
    { name: "@Yanjia0", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/5b829e4a1_avatars_githubusercontent_com_42895286_edd21967.png" },
    { name: "@ver217", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/861b0323f_avatars_githubusercontent_com_23111350_dc02bb08.png" },
    { name: "@1zeryu", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/114010c21_avatars_githubusercontent_com_90625606_69689679.png" },
    { name: "More", url: "https://avatars.githubusercontent.com/u/104106511?s=64&v=4" }
  ];
  return (
    <div className="space-y-6 text-sm">
      {/* About */}
      <AnimatedElement>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-foreground text-base mb-3">About</h2>
          <p className="text-foreground/90 mb-4 leading-relaxed text-[15px]">Open-Sora: Democratizing Efficient Video Production for All</p>
          <div className="flex items-start gap-2.5 mb-5">
            <Globe className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <a href="https://hpcaitech.github.io/Open-Sora/" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline break-all">hpcaitech.github.io/Open-Sora/</a>
          </div>
          <div className="space-y-3 mb-6">
            <a href="#" className="flex items-center gap-2.5 text-foreground hover:text-accent transition-colors font-medium group">
              <BookOpen className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" /> Readme
            </a>
            <a href="#" className="flex items-center gap-2.5 text-foreground hover:text-accent transition-colors font-medium group">
              <Scale className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" /> Apache-2.0 license
            </a>
            <a href="#" className="flex items-center gap-2.5 text-foreground hover:text-accent transition-colors font-medium group">
              <Shield className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" /> Code of conduct
            </a>
            <a href="#" className="flex items-center gap-2.5 text-foreground hover:text-accent transition-colors font-medium group">
              <Activity className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" /> Activity
            </a>
            <a href="#" className="flex items-center gap-2.5 text-foreground hover:text-accent transition-colors font-medium group">
              <Star className="w-4 h-4 text-muted-foreground group-hover:text-accent transition-colors" /> Custom properties
            </a>
          </div>
          <div className="space-y-2.5 text-muted-foreground">
             <a href="#" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Star className="w-4 h-4" /> <strong className="text-foreground">29k</strong> stars
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-accent transition-colors">
              <Eye className="w-4 h-4" /> <strong className="text-foreground">235</strong> watching
            </a>
            <a href="#" className="flex items-center gap-2 hover:text-accent transition-colors">
              <GitFork className="w-4 h-4" /> <strong className="text-foreground">2.9k</strong> forks
            </a>
          </div>
          <div className="mt-5 pt-4 border-t border-border">
            <a href="#" className="text-accent font-medium hover:underline text-[13px]">Report repository</a>
          </div>
        </div>
      </AnimatedElement>

      {/* Releases */}
      <AnimatedElement delay={100}>
        <div className="border-t border-border pt-5 px-1">
          <h2 className="font-semibold text-foreground text-base mb-4 flex items-center justify-between group cursor-pointer hover:text-accent transition-colors">
            Releases <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium group-hover:bg-accent group-hover:text-accent-foreground transition-colors">4</span>
          </h2>
          <div className="flex items-start gap-3 py-2 -mx-2 px-2 hover:bg-muted/50 rounded-md transition-colors cursor-pointer group">
            <Tag className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-0.5">
                <a href="#" className="text-foreground font-semibold group-hover:text-accent transition-colors">Open-Sora V1.3 Release</a>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs px-1.5 py-0 rounded font-semibold">Latest</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Feb 21, 2025</div>
            </div>
          </div>
          <a href="#" className="text-[13px] text-accent font-medium hover:underline mt-2 inline-block">+ 3 releases</a>
        </div>
      </AnimatedElement>
      
      {/* Packages */}
      <AnimatedElement delay={150}>
        <div className="border-t border-border pt-5 px-1">
          <h2 className="font-semibold text-foreground text-base mb-2 hover:text-accent transition-colors cursor-pointer">Packages</h2>
          <p className="text-muted-foreground text-[13px]">No packages published</p>
        </div>
      </AnimatedElement>

      {/* Contributors */}
      <AnimatedElement delay={200}>
        <div className="border-t border-border pt-5 px-1">
          <h2 className="font-semibold text-foreground text-base mb-4 flex items-center justify-between group cursor-pointer hover:text-accent transition-colors">
            Contributors <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs font-medium group-hover:bg-accent group-hover:text-accent-foreground transition-colors">57</span>
          </h2>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {contributors.map((c, i) => (
              <a key={i} href="#" title={c.name} className="hover:scale-110 hover:z-10 transition-transform relative rounded-full ring-2 ring-transparent hover:ring-accent">
                <img src={c.url} alt={c.name} className="w-8 h-8 rounded-full border border-border bg-background" />
              </a>
            ))}
          </div>
          <a href="#" className="text-[13px] text-accent font-medium hover:underline inline-block">+ 48 contributors</a>
        </div>
      </AnimatedElement>

      {/* Languages */}
      <AnimatedElement delay={250}>
        <div className="border-t border-border pt-5 px-1">
          <h2 className="font-semibold text-foreground text-base mb-4 hover:text-accent transition-colors cursor-pointer">Languages</h2>
          <div className="h-2 rounded-full bg-border overflow-hidden mb-3 w-full flex">
            <div className="h-full bg-[#3572A5] w-full hover:brightness-110 transition-all cursor-pointer" title="Python 100.0%" />
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3572A5]" />
            <span className="text-foreground font-medium">Python</span>
            <span className="text-muted-foreground ml-auto">100.0%</span>
          </div>
        </div>
      </AnimatedElement>
    </div>
  );
}

const CodeIconSVG = () => (
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" fill="currentColor" className="w-4 h-4 text-white">
    <path d="M0 2.75C0 1.784.784 1 1.75 1h12.5c.966 0 1.75.784 1.75 1.75v10.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25Zm1.75-.25a.25.25 0 0 0-.25.25v10.5c0 .138.112.25.25.25h12.5a.25.25 0 0 0 .25-.25V2.75a.25.25 0 0 0-.25-.25ZM7.25 8a.75.75 0 0 1-.22.53l-2.25 2.25a.749.749 0 0 1-1.275-.326.749.749 0 0 1 .215-.734L5.44 8 3.72 6.28a.749.749 0 0 1 .326-1.275.749.749 0 0 1 .734.215l2.25 2.25c.141.14.22.331.22.53Zm1.5 1.5a.75.75 0 0 1 .75-.75h4.5a.75.75 0 0 1 0 1.5h-4.5a.75.75 0 0 1-.75-.75Z"></path>
  </svg>
);

export default function Home() {
  return (
    <div className="bg-background min-h-screen font-sans text-foreground pb-20">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      >
        <RepoHeader />
      </motion.div>

      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0 order-2 md:order-1">
            {/* Branch bar */}
            <AnimatedElement>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 bg-muted/20 p-2 rounded-lg border border-transparent hover:border-border/50 transition-colors">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-semibold transition-all shadow-sm active:scale-95 group">
                    <GitFork className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                    <span>main</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground opacity-70" />
                  </button>
                  <div className="flex items-center gap-4 text-sm hidden sm:flex">
                    <a href="#" className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors group">
                      <GitFork className="w-4 h-4 opacity-70 group-hover:opacity-100" /> <strong className="text-foreground group-hover:text-accent">8</strong> Branches
                    </a>
                    <a href="#" className="flex items-center gap-1.5 text-muted-foreground hover:text-accent transition-colors group">
                      <Tag className="w-4 h-4 opacity-70 group-hover:opacity-100" /> <strong className="text-foreground group-hover:text-accent">4</strong> Tags
                    </a>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button className="hidden sm:block px-4 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium transition-all shadow-sm active:scale-95 text-foreground">Go to file</button>
                  <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-sm font-semibold transition-all shadow-sm hover:shadow active:scale-95 relative overflow-hidden group">
                    <CodeIconSVG />
                    <span>Code</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out" />
                  </button>
                </div>
              </div>
            </AnimatedElement>

            {/* File table */}
            <AnimatedElement delay={100}>
              <RepoFiles />
            </AnimatedElement>

            {/* README */}
            <AnimatedElement delay={150}>
              <div className="mt-6 border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                <div className="flex items-center justify-between px-6 py-4 bg-muted/40 border-b border-border sticky top-0 z-10 backdrop-blur-sm">
                  <div className="flex items-center gap-3">
                    <div className="bg-background p-1.5 rounded-md border border-border shadow-sm">
                      <List className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <span className="font-semibold text-base text-foreground">README.md</span>
                  </div>
                  <div className="flex items-center gap-2 hidden sm:flex">
                    <button className="p-1.5 rounded-md hover:bg-muted text-muted-foreground transition-colors"><Edit className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="relative">
                  <ReadmeSection />
                </div>
              </div>
            </AnimatedElement>
          </div>

          {/* Sidebar */}
          <div className="w-full md:w-[296px] flex-shrink-0 order-1 md:order-2">
            <Sidebar />
          </div>
        </div>
      </div>
    </div>
  );
}

// Minimal Icons for UI missing from lucide
function List(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"></line>
      <line x1="8" y1="12" x2="21" y2="12"></line>
      <line x1="8" y1="18" x2="21" y2="18"></line>
      <line x1="3" y1="6" x2="3.01" y2="6"></line>
      <line x1="3" y1="12" x2="3.01" y2="12"></line>
      <line x1="3" y1="18" x2="3.01" y2="18"></line>
    </svg>
  );
}
function Edit(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
  );
}
function ExternalLink(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
      <polyline points="15 3 21 3 21 9"></polyline>
      <line x1="10" y1="14" x2="21" y2="3"></line>
    </svg>
  );
}
function Info(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"></circle>
      <line x1="12" y1="16" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12.01" y2="8"></line>
    </svg>
  );
}