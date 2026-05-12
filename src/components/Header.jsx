import { useState } from "react";
import { Link } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, ChevronDown, Search, BookOpen, Code, Shield, Zap, Building, Globe, X } from "lucide-react";

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground border-b border-primary-foreground/10 shadow-sm transition-colors duration-300">
      <div className="max-w-[1280px] mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2 group">
          <svg height="32" viewBox="0 0 16 16" width="32" aria-hidden="true" fill="currentColor" className="text-primary-foreground group-hover:opacity-80 transition-opacity">
            <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
          </svg>
          <span className="font-semibold text-primary-foreground text-lg hidden sm:inline">GitHub</span>
        </Link>

        {/* Desktop Search */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground/70 text-sm cursor-pointer hover:bg-primary-foreground/20 hover:border-primary-foreground/50 transition-all flex-1 max-w-72 shadow-inner">
          <Search className="w-4 h-4 flex-shrink-0 opacity-70" />
          <span className="text-sm font-medium">Search or jump to...</span>
          <div className="ml-auto flex gap-0.5">
            <kbd className="bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/20 text-[10px] px-1.5 py-0.5 rounded-sm font-mono flex items-center justify-center">
              /
            </kbd>
          </div>
        </div>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex items-center gap-1.5 ml-2">
          {["Platform", "Solutions", "Open Source", "Enterprise"].map((item) => (
            <button key={item} className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-md transition-all group">
              {item} <ChevronDown className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
          <a href="#" className="px-3 py-2 text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-md transition-all">Pricing</a>
        </nav>

        {/* Right actions */}
        <div className="hidden sm:flex items-center gap-3 ml-auto">
          <a href="#" className="text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground transition-colors px-2 py-2">Sign in</a>
          <a href="#" className="text-sm font-semibold px-4 py-2 rounded-md border border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 transition-all relative overflow-hidden group shadow-sm hover:shadow">
            Sign up
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-primary-foreground/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 ease-in-out" />
          </a>
        </div>

        {/* Mobile menu */}
        <div className="ml-auto sm:hidden flex items-center gap-2">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-primary text-primary-foreground border-l border-primary-foreground/10 p-0 shadow-2xl">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-primary-foreground/10">
                  <Link to="/" className="flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <svg height="28" viewBox="0 0 16 16" width="28" fill="currentColor" className="text-primary-foreground">
                      <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
                    </svg>
                    <span className="font-semibold text-primary-foreground text-lg">GitHub</span>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-primary-foreground hover:bg-primary-foreground/10 rounded-full" onClick={() => setMobileOpen(false)}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4 border-b border-primary-foreground/10">
                   <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-primary-foreground/30 bg-primary-foreground/10 text-primary-foreground/70 text-sm">
                    <Search className="w-4 h-4 opacity-70" />
                    <span>Search or jump to...</span>
                  </div>
                </div>
                <nav className="flex flex-col p-4 gap-2 overflow-y-auto">
                  <Link to="/" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                    <Code className="w-5 h-5 opacity-70" />Open-Sora Repository
                  </Link>
                  <Link to="/Docs" onClick={() => setMobileOpen(false)} className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                    <BookOpen className="w-5 h-5 opacity-70" />Documentation
                  </Link>
                  <div className="h-px bg-primary-foreground/10 my-2" />
                  <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                    <Globe className="w-5 h-5 opacity-70" />Platform
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                    <Zap className="w-5 h-5 opacity-70" />Solutions
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                    <Shield className="w-5 h-5 opacity-70" />Open Source
                  </a>
                  <a href="#" className="flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors">
                    <Building className="w-5 h-5 opacity-70" />Enterprise
                  </a>
                </nav>
                <div className="mt-auto p-6 border-t border-primary-foreground/10 flex flex-col gap-3 bg-primary-foreground/5">
                  <a href="#" className="w-full text-center py-2.5 text-sm font-medium text-primary-foreground/90 hover:text-primary-foreground transition-colors">Sign in</a>
                  <a href="#" className="w-full text-center py-2.5 text-sm font-semibold rounded-md bg-primary-foreground text-primary hover:opacity-90 transition-colors shadow-md">Sign up</a>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}