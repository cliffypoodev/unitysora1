import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, ChevronRight, Code, Zap, Server, Cpu, Database, Play, ExternalLink, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const AnimatedElement = ({ children, className, delay = 0 }) => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) { setIsVisible(true); return; }
    const fallback = setTimeout(() => setIsVisible(true), 800 + delay);
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { clearTimeout(fallback); setTimeout(() => setIsVisible(true), delay); observer.unobserve(el); }
    }, { threshold: 0.05, rootMargin: "0px 0px 200px 0px" });
    observer.observe(el);
    return () => { observer.disconnect(); clearTimeout(fallback); };
  }, [delay]);
  return (
    <div ref={ref} className={`transition-all duration-700 ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"} ${className || ""}`}>
      {children}
    </div>
  );
};

function CodeBlock({ code }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div className="relative rounded-md border border-border bg-muted/50 my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-muted border-b border-border">
        <span className="text-xs text-muted-foreground">Shell</span>
        <button onClick={handleCopy} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
      <pre className="px-4 py-3 text-xs overflow-x-auto text-foreground leading-relaxed whitespace-pre-wrap"><code>{code}</code></pre>
    </div>
  );
}

const sections = [
  { id: "installation", label: "Installation", icon: Code },
  { id: "quickstart", label: "Quickstart", icon: Play },
  { id: "model-weights", label: "Model Weights", icon: Database },
  { id: "inference", label: "Inference", icon: Cpu },
  { id: "training", label: "Training", icon: Server },
  { id: "advanced", label: "Advanced Usage", icon: Zap },
];

export default function Docs() {
  const [activeSection, setActiveSection] = useState("installation");

  return (
    <div className="bg-background min-h-screen">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
        className="relative bg-primary overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-foreground/5 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-[1280px] mx-auto px-6 py-14 relative z-10">
          <div className="flex items-center gap-2 text-primary-foreground/70 text-sm mb-3">
            <a href="#" className="hover:text-primary-foreground transition-colors">hpcaitech/Open-Sora</a>
            <ChevronRight className="w-4 h-4" />
            <span className="text-primary-foreground">Documentation</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold text-primary-foreground mb-4 leading-tight">
            Open-Sora<br />
            <span className="bg-gradient-to-r from-primary-foreground via-accent-foreground/80 to-primary-foreground bg-clip-text text-transparent animate-gradient-x">
              Documentation
            </span>
          </h1>
          <p className="text-primary-foreground/80 text-lg max-w-2xl mb-6">
            Everything you need to install, configure, and run Open-Sora for high-quality video generation.
          </p>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/30 text-sm px-3 py-1">v2.0 (latest)</Badge>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/30 text-sm px-3 py-1">11B Parameters</Badge>
            <Badge className="bg-primary-foreground/15 text-primary-foreground border border-primary-foreground/30 text-sm px-3 py-1">Apache-2.0</Badge>
          </div>
        </div>
      </motion.div>

      <div className="max-w-[1280px] mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Sidebar Nav */}
          <nav className="w-52 flex-shrink-0 hidden sm:block sticky top-8 self-start">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">On this page</p>
            <ul className="space-y-1">
              {sections.map((s) => (
                <li key={s.id}>
                  <button
                    onClick={() => setActiveSection(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors text-left ${activeSection === s.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
                  >
                    <s.icon className="w-4 h-4 flex-shrink-0" />
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-10">
            {/* Installation */}
            <AnimatedElement id="installation">
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 bg-muted/40 border-b border-border">
                  <Code className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Installation</h2>
                </div>
                <div className="px-5 py-5">
                  <p className="text-sm text-foreground mb-3">
                    Create a Python 3.10 environment and install all required dependencies:
                  </p>
                  <CodeBlock code={`# create a virtual env and activate (conda)
conda create -n opensora python=3.10
conda activate opensora
# download the repo
git clone https://github.com/hpcaitech/Open-Sora
cd Open-Sora
# Ensure torch >= 2.4.0
pip install -v .
pip install xformers==0.0.27.post2 --index-url https://download.pytorch.org/whl/cu121
pip install flash-attn --no-build-isolation`} />
                  <p className="text-sm text-muted-foreground mt-2">Optionally, install Flash Attention 3 for faster inference speed:</p>
                  <CodeBlock code={`git clone https://github.com/Dao-AILab/flash-attention  # 4f0640d5
cd flash-attention/hopper
python setup.py install`} />
                </div>
              </div>
            </AnimatedElement>

            {/* Model Weights */}
            <AnimatedElement delay={100}>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 bg-muted/40 border-b border-border">
                  <Database className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Model Weights</h2>
                </div>
                <div className="px-5 py-5">
                  <p className="text-sm text-foreground mb-4">
                    The 11B model supports 256px and 768px resolution. Both T2V (text-to-video) and I2V (image-to-video) are supported by a single model.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    <a href="https://huggingface.co/hpcai-tech/Open-Sora-v2" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🤗</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">Hugging Face</p>
                        <p className="text-xs text-muted-foreground">hpcai-tech/Open-Sora-v2</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
                    </a>
                    <a href="https://modelscope.cn/models/luchentech/Open-Sora-v2" target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 transition-all group">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-sm">🤖</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">ModelScope</p>
                        <p className="text-xs text-muted-foreground">luchentech/Open-Sora-v2</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto" />
                    </a>
                  </div>
                  <p className="text-sm text-foreground mb-1 font-medium">Download from Hugging Face:</p>
                  <CodeBlock code={`pip install "huggingface_hub[cli]"
huggingface-cli download hpcai-tech/Open-Sora-v2 --local-dir ./ckpts`} />
                  <p className="text-sm text-foreground mb-1 font-medium">Download from ModelScope:</p>
                  <CodeBlock code={`pip install modelscope
modelscope download hpcai-tech/Open-Sora-v2 --local_dir ./ckpts`} />
                </div>
              </div>
            </AnimatedElement>

            {/* Inference */}
            <AnimatedElement delay={200}>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 bg-muted/40 border-b border-border">
                  <Cpu className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Inference</h2>
                </div>
                <div className="px-5 py-5">
                  <Accordion type="single" collapsible defaultValue="t2v">
                    <AccordionItem value="t2v">
                      <AccordionTrigger className="text-sm font-semibold">Text-to-Video Generation</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground mb-2">For 256x256 resolution (single GPU):</p>
                        <CodeBlock code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea"`} />
                        <p className="text-sm text-muted-foreground mb-2">For 768x768 with multi-GPU:</p>
                        <CodeBlock code={`torchrun --nproc_per_node 8 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_768px.py --save-dir samples --prompt "raining, sea"`} />
                      </AccordionContent>
                    </AccordionItem>
                    <AccordionItem value="i2v">
                      <AccordionTrigger className="text-sm font-semibold">Image-to-Video Generation</AccordionTrigger>
                      <AccordionContent>
                        <p className="text-sm text-muted-foreground mb-2">Given a prompt and a reference image:</p>
                        <CodeBlock code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/256px.py --cond_type i2v_head --prompt "A plump pig wallows in a muddy pond..." --ref assets/texts/i2v.png`} />
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
            </AnimatedElement>

            {/* Computational Efficiency */}
            <AnimatedElement delay={300}>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 bg-muted/40 border-b border-border">
                  <Server className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Computational Efficiency</h2>
                </div>
                <div className="px-5 py-5">
                  <p className="text-sm text-foreground mb-4">Performance on H100/H800 GPUs (Total time in seconds / peak GPU memory in GB):</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground border border-border">Resolution</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground border border-border">1x GPU</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground border border-border">2x GPUs</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground border border-border">4x GPUs</th>
                          <th className="text-left px-4 py-2.5 font-semibold text-foreground border border-border">8x GPUs</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 border border-border font-medium">256×256</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">60s / 52.5GB</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">40s / 44.3GB</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">34s / 44.3GB</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">—</td>
                        </tr>
                        <tr className="hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-2.5 border border-border font-medium">768×768</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">1656s / 60.3GB</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">863s / 48.3GB</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">466s / 44.3GB</td>
                          <td className="px-4 py-2.5 border border-border text-muted-foreground">276s / 44.3GB</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </AnimatedElement>

            {/* Advanced */}
            <AnimatedElement delay={400}>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-4 bg-muted/40 border-b border-border">
                  <Zap className="w-5 h-5 text-primary" />
                  <h2 className="text-base font-bold text-foreground">Advanced Usage</h2>
                </div>
                <div className="px-5 py-5 space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Motion Score</h3>
                    <p className="text-sm text-muted-foreground mb-2">Control the motion intensity with scores 1–7. Default is 4.</p>
                    <CodeBlock code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea" --motion-score 4`} />
                    <div className="grid grid-cols-3 gap-2 mt-3">
                      {[
                        { score: "1", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/ea9876bca_github_com_motion_score_1_8d29da35.gif", label: "Low motion" },
                        { score: "4", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/1180f7302_github_com_motion_score_4_ebf76328.gif", label: "Medium motion" },
                        { score: "7", url: "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/c045485f4_github_com_motion_score_7_04898af4.gif", label: "High motion" },
                      ].map((m) => (
                        <div key={m.score} className="rounded-md overflow-hidden border border-border">
                          <img src={m.url} alt={`Motion score ${m.score}`} className="w-full aspect-video object-cover" />
                          <div className="px-2 py-1.5 bg-muted text-xs text-center text-muted-foreground">
                            Score: <strong className="text-foreground">{m.score}</strong> — {m.label}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Prompt Refinement with ChatGPT</h3>
                    <p className="text-sm text-muted-foreground mb-2">Use ChatGPT to auto-enhance your prompts:</p>
                    <CodeBlock code={`export OPENAI_API_KEY=sk-xxxx
torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea" --refine-prompt True`} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">Reproducibility</h3>
                    <p className="text-sm text-muted-foreground mb-2">Fix a random seed for reproducible results:</p>
                    <CodeBlock code={`torchrun --nproc_per_node 1 --standalone scripts/diffusion/inference.py configs/diffusion/inference/t2i2v_256px.py --save-dir samples --prompt "raining, sea" --sampling_option.seed 42 --seed 42`} />
                  </div>
                </div>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </div>
    </div>
  );
}