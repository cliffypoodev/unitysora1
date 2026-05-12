import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import {
  GitFork, Star, Eye, Code, GitPullRequest, AlertCircle, Shield,
  BarChart2, Folder, FileText, Clock, ChevronRight, Copy, Check,
  BookOpen, Scale, Users, Tag, Globe, Activity, ChevronDown, Database
} from "lucide-react";

const AnimatedElement = ({ children, className = "", delay = 0 }) => {
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
    }, { threshold: 0.05, rootMargin: "0px 0px 200px 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className}`}>
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
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium text-secondary-foreground transition-all shadow-sm">
              <Eye className="w-4 h-4 text-muted-foreground" /> Watch
              <span className="bg-background border border-border px-2 py-0.5 rounded-full text-xs ml-1">235</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium text-secondary-foreground transition-all shadow-sm">
              <GitFork className="w-4 h-4 text-muted-foreground" /> Fork
              <span className="bg-background border border-border px-2 py-0.5 rounded-full text-xs ml-1">2.9k</span>
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium text-secondary-foreground transition-all shadow-sm">
              <Star className="w-4 h-4 text-yellow-500" /> Star
              <span className="bg-background border border-border px-2 py-0.5 rounded-full text-xs ml-1">29k</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-0 overflow-x-auto scrollbar-hide -mb-px">
          {[
            { label: "Code", icon: Code, active: true },
            { label: "Issues", icon: AlertCircle, count: "0" },
            { label: "Pull requests", icon: GitPullRequest, count: "11" },
            { label: "Actions", icon: Activity },
            { label: "Projects", icon: Folder },
            { label: "Security", icon: Shield },
            { label: "Insights", icon: BarChart2 },
          ].map((item) => (
            <button
              key={item.label}
              className={`flex items-center gap-2 px-4 py-3 text-sm transition-all whitespace-nowrap relative ${
                item.active
                  ? "text-foreground font-semibold border-b-2 border-[#fd8c73]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-t-md"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
              {item.count !== undefined && (
                <span className="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-xs font-medium">
                  {item.count}
                </span>
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
    <div className="relative rounded-lg border border-border bg-[#1f2328] overflow-hidden my-4">
      <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/10">
        <span className="text-xs font-medium text-white/70">{title}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2 py-1 rounded transition-colors"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="px-5 py-4 text-sm overflow-x-auto text-white/90 leading-relaxed font-mono"><code>{code}</code></pre>
    </div>
  );
}

function RepoFiles() {
  const [repoFiles, setRepoFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    base44.entities.RepoFile.list("sort_order", 20).then(setRepoFiles).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const FIX_COMMIT = "fix: entry setting in pre-commit hooks (#582)";
  const staticFallback = [
    { name: ".github/workflows", type: "directory", last_commit: "Hotfix/gallery build (#337)", last_updated: "Apr 27, 2024" },
    { name: "assets/texts", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "configs", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "docs", type: "directory", last_commit: "add DCAE download cmd (#817)", last_updated: "last month" },
    { name: "gradio", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "opensora", type: "directory", last_commit: "[ckpt] mitigate gpu mem peak when loading ckpt", last_updated: "last year" },
    { name: "scripts", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "tests", type: "directory", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: ".pre-commit-config.yaml", type: "file", last_commit: FIX_COMMIT, last_updated: "2 years ago" },
    { name: "CONTRIBUTING.md", type: "file", last_commit: "Doc v1.1 (#396)", last_updated: "last year" },
    { name: "LICENSE", type: "file", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
    { name: "README.md", type: "file", last_commit: "[doc] Update README.md (#917)", last_updated: "last month" },
    { name: "requirements.txt", type: "file", last_commit: "Update Open-Sora 2.0 (#807)", last_updated: "last month" },
  ];

  const items = repoFiles.length > 0 ? repoFiles : staticFallback;

  return (
    <div className={`border border-border rounded-lg overflow-hidden bg-card shadow-sm transition-opacity duration-500 ${loading ? "opacity-50" : "opacity-100"}`}>
      <div className="flex items-center gap-3 px-4 py-3.5 bg-muted/40 border-b border-border">
        <img
          src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/01b5412ae_avatars_githubusercontent_com_42895286_a277d15c.png"
          className="w-6 h-6 rounded-full border border-border bg-background"
          alt="contributor"
        />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm flex-1 min-w-0">
          <span className="font-semibold text-foreground">Yanjia0</span>
          <a href="#" className="text-muted-foreground hover:text-accent transition-colors truncate">[doc] Update README.md (#917)</a>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
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
              <tr key={i} className="hover:bg-muted/30 transition-colors duration-150">
                <td className="py-2.5 px-4 w-[250px] sm:w-[300px]">
                  <div className="flex items-center gap-2.5">
                    {file.type === "directory"
                      ? <Folder className="w-4 h-4 text-[#54aeff] flex-shrink-0" />
                      : <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    }
                    <a href="#" className="text-foreground hover:text-accent hover:underline font-medium truncate transition-colors">{file.name}</a>
                  </div>
                </td>
                <td className="py-2.5 px-4 text-muted-foreground hidden sm:table-cell">
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
    <div className="bg-background text-foreground leading-relaxed">
      {/* Logo */}
      <div className="flex flex-col items-center py-10 gap-5 border-b border-border mb-8">
        <AnimatedElement className="flex flex-col items-center gap-4">
          <img
            src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/4589efdb8_github_com_icon_6c4ebda9.png"
            alt="Open-Sora Logo"
            className="h-28 w-auto drop-shadow-lg hover:scale-105 transition-transform duration-500"
          />
          <div className="flex flex-wrap gap-2 justify-center">
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3566b20f0_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f6769746875622f73746172732f6870636169746563682f4f70656e2d536f72613f7374796c653d736f6369616c_eaad82cf.png" alt="Stars" className="h-5" />
            <img src="https://camo.githubusercontent.com/e6b595b117171cbf1291b230177d952d27f8d236d085195bc23f7aa29b28140d/68747470733a2f2f696d672e736869656c64732e696f2f7374617469632f76313f6c6162656c3d54656368205265706f727420322e30266d6573736167653d417278697626636f6c6f723d726564" alt="Tech Report 2.0" className="h-5" />
            <img src="https://camo.githubusercontent.com/e18c9eb845449ccbc2f98bba10c2b1ca9c889291777c51780c209607444c0367/68747470733a2f2f696d672e736869656c64732e696f2f7374617469632f76313f6c6162656c3d54656368205265706f727420312e32266d6573736167653d417278697626636f6c6f723d726564" alt="Tech Report 1.2" className="h-5" />
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/535abee8b_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f47616c6c6572792d566965772d6f72616e67653f6c6f676f3d26_0d47823a.png" alt="Gallery" className="h-5" />
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/c4a0d812f_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f446973636f72642d6a6f696e2d626c756576696f6c65743f6c6f676f3d646973636f726426_8ea2d346.png" alt="Discord" className="h-5" />
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/a3a477e83_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f536c61636b2d436f6c6f7373616c41492d626c756576696f6c65743f6c6f676f3d736c61636b26_a8a9228d.png" alt="Slack" className="h-5" />
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/8dc50bdef_camo_githubusercontent_com_68747470733a2f2f696d672e736869656c64732e696f2f62616467652f547769747465722d446973637573732d626c75653f6c6f676f3d7477697474657226_e18d6058.png" alt="Twitter" className="h-5" />
          </div>
        </AnimatedElement>
      </div>

      <div className="px-6 md:px-10 pb-12 max-w-4xl mx-auto">
        {/* Intro */}
        <AnimatedElement delay={100}>
          <h2 className="text-2xl font-bold text-foreground mb-4 border-b border-border pb-3">
            Open-Sora: Democratizing Efficient Video Production for All
          </h2>
          <p className="text-foreground/90 mb-5 text-base leading-relaxed">
            We design and implement <strong>Open-Sora</strong>, an initiative dedicated to <strong>efficiently</strong> producing high-quality video. We hope to make the model, tools and all details accessible to all. By embracing <strong>open-source</strong> principles, Open-Sora not only democratizes access to advanced video generation techniques, but also offers a streamlined and user-friendly platform that simplifies the complexities of video generation.
          </p>
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-8 flex items-start gap-3">
            <svg className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p className="text-foreground/90 font-medium">
              For a professional AI video-generation product, try{" "}
              <a href="https://video-ocean.com/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-semibold">Video Ocean</a>
              {" "}— powered by a superior model.
            </p>
          </div>
        </AnimatedElement>

        {/* Promo GIFs */}
        <AnimatedElement delay={150} className="space-y-4 mb-12">
          {[
            { url: "https://video-ocean.com/", img: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/f1a8aa8e9_github_com_3_c30d1e7c.gif" },
            { url: "https://hpc-ai.com/", img: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/9b2b3eac7_github_com_1_385c9ff0.gif" },
            { url: "https://hpc-ai.com/model-apis", img: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/60ffc7ec5_github_com_0408_7db1450d.gif" }
          ].map((promo, i) => (
            <a key={i} href={promo.url} target="_blank" rel="noopener noreferrer" className="block group">
              <div className="rounded-xl overflow-hidden border border-border shadow-sm group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-0.5 transform">
                <img src={promo.img} alt="Promo" className="w-full object-cover" />
              </div>
            </a>
          ))}
        </AnimatedElement>

        {/* News */}
        <AnimatedElement delay={200}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" /> News
          </h2>
          <ul className="space-y-4 mb-8">
            {news.map((item, i) => (
              <li key={i} className="flex gap-4">
                <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-foreground bg-muted px-2 py-0.5 rounded text-sm border border-border/50">[{item.date}]</span>
                    {item.highlight && <span className="text-orange-500 text-sm">🔥</span>}
                  </div>
                  <p className="text-foreground/80 leading-relaxed text-sm">
                    <strong>{item.title}:</strong> {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="bg-muted/50 border border-border rounded-lg p-4 mb-12 text-sm text-foreground/80">
            📍 Since Open-Sora is under active development, we remain different branches for different versions. The latest version is{" "}
            <a href="#" className="text-accent font-medium hover:underline">main</a>. Old versions:{" "}
            <a href="#" className="text-accent hover:underline">v1.0</a>,{" "}
            <a href="#" className="text-accent hover:underline">v1.1</a>,{" "}
            <a href="#" className="text-accent hover:underline">v1.2</a>,{" "}
            <a href="#" className="text-accent hover:underline">v1.3</a>.
          </div>
        </AnimatedElement>

        {/* Demo */}
        <AnimatedElement delay={250}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3">🎥 Latest Demo</h2>
          <p className="text-foreground/80 mb-5 text-sm bg-secondary/30 p-3 rounded-md border border-border/30">
            Demos are in compressed GIF format. For original quality, visit our{" "}
            <a href="https://hpcaitech.github.io/Open-Sora/" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline">Gallery</a>.
          </p>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-12">
            {demos.map((demo, i) => (
              <div key={i} className="relative group rounded-lg overflow-hidden border border-border shadow-sm hover:shadow-lg transition-all duration-300 bg-black aspect-video">
                <img src={demo.url} alt={`Demo ${i + 1}`} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="text-white text-xs font-medium">{demo.label}</span>
                </div>
              </div>
            ))}
          </div>
        </AnimatedElement>

        {/* Reports */}
        <AnimatedElement delay={300}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3">🔆 Reports</h2>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-12">
            <ul className="space-y-3 text-sm">
              <li><a href="https://arxiv.org/abs/2503.09642v1" target="_blank" rel="noopener noreferrer" className="text-accent font-semibold hover:underline text-base">Tech Report of Open-Sora 2.0</a></li>
              <li><a href="#" className="text-foreground hover:text-accent transition-colors font-medium">Step by step to train or finetune your own model</a></li>
              <li><a href="#" className="text-foreground hover:text-accent transition-colors font-medium">Step by step to train and evaluate a video autoencoder</a></li>
              <li><a href="#" className="text-foreground hover:text-accent transition-colors font-medium">Visit the high compression video autoencoder</a></li>
              <li className="pt-2">
                <span className="font-semibold text-foreground block mb-2">Reports of previous versions:</span>
                <ul className="ml-4 space-y-1.5 list-disc text-muted-foreground">
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.3</a>: shift-window attention, unified spatial-temporal VAE, etc.</li>
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.2</a>, <a href="https://arxiv.org/abs/2412.20404" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">Tech Report</a>: rectified flow, 3d-VAE, score condition, evaluation, etc.</li>
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.1</a>: multi-resolution/length/aspect-ratio, image/video conditioning/editing, etc.</li>
                  <li><a href="#" className="text-accent hover:underline">Open-Sora 1.0</a>: architecture, captioning, etc.</li>
                </ul>
              </li>
            </ul>
          </div>
        </AnimatedElement>

        {/* Quickstart */}
        <AnimatedElement delay={350}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3">Quickstart</h2>
          <div className="space-y-8 mb-12">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Installation</h3>
              <CodeBlock title="Bash" code={`conda create -n opensora python=3.10
conda activate opensora
git clone https://github.com/hpcaitech/Open-Sora
cd Open-Sora
pip install -v .
pip install xformers==0.0.27.post2 --index-url https://download.pytorch.org/whl/cu121
pip install flash-attn --no-build-isolation`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Model Download</h3>
              <CodeBlock title="Bash" code={`pip install "huggingface_hub[cli]"
huggingface-cli download hpcai-tech/Open-Sora-v2 --local-dir ./ckpts`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-3">Text-to-Video Generation</h3>
              <CodeBlock title="Bash" code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea"`} />
            </div>
          </div>
        </AnimatedElement>

        {/* Evaluation */}
        <AnimatedElement delay={400}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent" /> Evaluation
          </h2>
          <div className="bg-secondary/20 p-5 rounded-xl border border-border mb-12 space-y-6">
            <p className="text-foreground/90 text-sm leading-relaxed">
              On <a href="https://huggingface.co/spaces/Vchitect/VBench_Leaderboard" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline">VBench</a>, Open-Sora 2.0 significantly narrows the gap with OpenAI's Sora, reducing it from 4.52% → 0.69% compared to Open-Sora 1.2.
            </p>
            <div className="bg-white rounded-lg p-2 shadow-sm border border-border/50 overflow-hidden">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/ddbde3e00_github_com_v2_vbench_9df5221a.png" alt="VBench Results" className="w-full h-auto rounded" />
            </div>
            <p className="text-foreground/90 text-sm">Human preference results show our model is on par with HunyuanVideo 11B and Step-Video 30B.</p>
            <div className="bg-white rounded-lg p-2 shadow-sm border border-border/50 overflow-hidden">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/f46bfde16_github_com_v2_winrate_3e9b360a.png" alt="Win Rate" className="w-full h-auto rounded" />
            </div>
            <p className="text-foreground/90 text-sm">With strong performance, Open-Sora 2.0 is cost-effective.</p>
            <div className="bg-white rounded-lg p-2 shadow-sm border border-border/50 overflow-hidden">
              <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/9f18b0b05_github_com_v2_cost_41a45c58.png" alt="Cost comparison" className="w-full h-auto rounded" />
            </div>
          </div>
        </AnimatedElement>

        {/* Contribution */}
        <AnimatedElement delay={450}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-accent" /> Contribution
          </h2>
          <div className="bg-card border border-border rounded-xl p-5 shadow-sm mb-12 text-center">
            <p className="text-foreground/80 mb-4 text-sm">Thanks goes to these wonderful contributors:</p>
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/616edc2d2_camo_githubusercontent.com_68747470733a2f2f636f6e747269622e726f636b732f696d6167653f7265706f3d6870636169746563682f4f70656e2d536f7261_2021682b.png" alt="Contributors" className="w-full max-w-2xl mx-auto rounded" />
          </div>
        </AnimatedElement>

        {/* Star History */}
        <AnimatedElement delay={500}>
          <h2 className="text-xl font-bold text-foreground mb-5 border-b border-border pb-3 flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" /> Star History
          </h2>
          <div className="bg-white p-2 rounded-xl border border-border shadow-sm">
            <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/13696c62c_camo_githubusercontent_com_68747470733a2f2f6170692e737461722d686973746f72792e636f6d2f7376673f7265706f733d6870636169746563682f4f70656e2d536f726126747970653d44617465_720a9037.png" alt="Star History Chart" className="w-full rounded" />
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
  ];
  return (
    <div className="space-y-6 text-sm">
      <AnimatedElement>
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="font-semibold text-foreground text-base mb-3">About</h2>
          <p className="text-foreground/90 mb-4 leading-relaxed">Open-Sora: Democratizing Efficient Video Production for All</p>
          <div className="flex items-start gap-2.5 mb-4">
            <Globe className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <a href="https://hpcaitech.github.io/Open-Sora/" target="_blank" rel="noopener noreferrer" className="text-accent font-medium hover:underline break-all">hpcaitech.github.io/Open-Sora/</a>
          </div>
          <div className="space-y-2 mb-5">
            <a href="#" className="flex items-center gap-2 text-foreground hover:text-accent transition-colors">
              <BookOpen className="w-4 h-4 text-muted-foreground" /> Readme
            </a>
            <a href="#" className="flex items-center gap-2 text-foreground hover:text-accent transition-colors">
              <Scale className="w-4 h-4 text-muted-foreground" /> Apache-2.0 license
            </a>
            <a href="#" className="flex items-center gap-2 text-foreground hover:text-accent transition-colors">
              <Shield className="w-4 h-4 text-muted-foreground" /> Code of conduct
            </a>
            <a href="#" className="flex items-center gap-2 text-foreground hover:text-accent transition-colors">
              <Activity className="w-4 h-4 text-muted-foreground" /> Activity
            </a>
          </div>
          <div className="space-y-2 text-muted-foreground border-t border-border pt-3">
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
        </div>
      </AnimatedElement>

      <AnimatedElement delay={100}>
        <div className="border-t border-border pt-4 px-1">
          <h2 className="font-semibold text-foreground text-base mb-3 flex items-center justify-between">
            Releases <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">4</span>
          </h2>
          <div className="flex items-start gap-2 py-2 hover:bg-muted/30 rounded transition-colors cursor-pointer">
            <Tag className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <a href="#" className="text-foreground font-semibold hover:text-accent transition-colors">Open-Sora V1.3 Release</a>
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-xs px-1.5 py-0 font-semibold">Latest</Badge>
              </div>
              <div className="text-xs text-muted-foreground">Feb 21, 2025</div>
            </div>
          </div>
          <a href="#" className="text-xs text-accent font-medium hover:underline mt-1 inline-block">+ 3 releases</a>
        </div>
      </AnimatedElement>

      <AnimatedElement delay={150}>
        <div className="border-t border-border pt-4 px-1">
          <h2 className="font-semibold text-foreground text-base mb-3 flex items-center justify-between">
            Contributors <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-xs">57</span>
          </h2>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {contributors.map((c, i) => (
              <a key={i} href="#" title={c.name} className="hover:scale-110 transition-transform">
                <img src={c.url} alt={c.name} className="w-8 h-8 rounded-full border-2 border-background" />
              </a>
            ))}
          </div>
          <a href="#" className="text-xs text-accent font-medium hover:underline">+ 43 contributors</a>
        </div>
      </AnimatedElement>

      <AnimatedElement delay={200}>
        <div className="border-t border-border pt-4 px-1">
          <h2 className="font-semibold text-foreground text-base mb-3">Languages</h2>
          <div className="h-2 rounded-full bg-[#3572A5] mb-2 w-full" />
          <div className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-full bg-[#3572A5]" />
            <span className="text-foreground font-medium">Python</span>
            <span className="text-muted-foreground ml-auto">100.0%</span>
          </div>
        </div>
      </AnimatedElement>
    </div>
  );
}

export default function Home() {
  return (
    <div className="bg-background min-h-screen text-foreground pb-20">
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <RepoHeader />
      </motion.div>

      <div className="max-w-[1280px] mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Main content */}
          <div className="flex-1 min-w-0 order-2 md:order-1">
            {/* Branch bar */}
            <AnimatedElement>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-semibold transition-all shadow-sm">
                    <GitFork className="w-4 h-4 text-muted-foreground" />
                    <span>main</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground opacity-70" />
                  </button>
                  <div className="hidden sm:flex items-center gap-3 text-sm">
                    <a href="#" className="text-muted-foreground hover:text-accent transition-colors"><strong className="text-foreground">8</strong> Branches</a>
                    <a href="#" className="text-muted-foreground hover:text-accent transition-colors"><strong className="text-foreground">4</strong> Tags</a>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="hidden sm:block px-3 py-1.5 rounded-md border border-border bg-secondary hover:bg-muted text-sm font-medium transition-all shadow-sm">Go to file</button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#238636] hover:bg-[#2ea043] border border-[rgba(240,246,252,0.1)] text-white text-sm font-semibold transition-all shadow-sm">
                    <Code className="w-4 h-4" />
                    <span>Code</span>
                    <ChevronDown className="w-4 h-4 opacity-70" />
                  </button>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement delay={100}>
              <RepoFiles />
            </AnimatedElement>

            <AnimatedElement delay={150}>
              <div className="mt-5 border border-border rounded-xl overflow-hidden shadow-sm bg-card">
                <div className="flex items-center justify-between px-5 py-3.5 bg-muted/40 border-b border-border">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    <span className="font-semibold text-sm text-foreground">README.md</span>
                  </div>
                </div>
                <ReadmeSection />
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