import { Link } from "react-router-dom";
import { Github, ExternalLink } from "lucide-react";

export default function Footer() {
  return (
    <footer className="bg-muted border-t border-border mt-auto">
      <div className="max-w-[1280px] mx-auto px-4 py-8 hidden">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img
              src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/4589efdb8_github_com_icon_6c4ebda9.png"
              alt="Open-Sora"
              className="h-7 w-auto" />
            
            <div>
              <p className="font-semibold text-foreground text-sm">Open-Sora</p>
              <p className="text-xs text-muted-foreground">Democratizing Efficient Video Production for All</p>
            </div>
          </div>

          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <Link to="/generate" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Generate</Link>
            <Link to="/gallery" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Gallery</Link>
            <Link to="/docs" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Docs</Link>
            <a href="https://github.com/hpcaitech/Open-Sora" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <Github className="w-3 h-3" /> GitHub
            </a>
            <a href="https://arxiv.org/abs/2503.09642v1" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
              <ExternalLink className="w-3 h-3" /> Tech Report
            </a>
            <a href="https://hpcaitech.github.io/Open-Sora/" target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-foreground transition-colors">Gallery Site</a>
          </nav>
        </div>
        <div className="border-t border-border mt-6 pt-4 text-center text-xs text-muted-foreground">
          Open-Sora is open-source under Apache-2.0 license · Built by <a href="https://hpc-ai.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">HPC-AI Tech</a>
        </div>
      </div>
    </footer>);

}