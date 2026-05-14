import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BookOpen, ImageIcon, Images, Menu, Video, Wand2, X } from "lucide-react";

const NAV = [
  { label: "Generate Video", to: "/generate", icon: Video },
  { label: "Video Gallery", to: "/gallery", icon: Images },
  { label: "Generate Image", to: "/generate-image", icon: ImageIcon },
  { label: "Image Gallery", to: "/image-gallery", icon: Images },
  { label: "Docs", to: "/docs", icon: BookOpen },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 bg-foreground text-background border-b border-background/10 shadow-sm">
      <div className="max-w-[1280px] mx-auto px-4 h-14 flex items-center gap-4">
        <Link to="/" className="flex items-center gap-2 flex-shrink-0 mr-2">
          <img
            src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3cb3a56cc_ChatGPT_Image_May_12__2026__02_08_14_PM.png"
            alt="UnitySora"
            className="h-7 w-auto"
          />
          <span className="font-bold text-background text-base hidden sm:inline">UnitySora</span>
        </Link>

        <nav className="hidden lg:flex items-center gap-1">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors ${
                location.pathname === item.to
                  ? "bg-background/15 text-background"
                  : "text-background/70 hover:text-background hover:bg-background/10"
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden sm:flex items-center gap-2">
          <Link to="/gallery">
            <Button size="sm" variant="ghost" className="text-background hover:bg-background/10 gap-1.5 text-sm font-semibold">
              <Images className="w-3.5 h-3.5" /> Videos
            </Button>
          </Link>
          <Link to="/image-gallery">
            <Button size="sm" variant="ghost" className="text-background hover:bg-background/10 gap-1.5 text-sm font-semibold">
              <Images className="w-3.5 h-3.5" /> Images
            </Button>
          </Link>
          <Link to="/generate">
            <Button size="sm" variant="outline" className="border-background/20 text-background hover:bg-background/10 gap-1.5 text-sm font-semibold">
              <Video className="w-3.5 h-3.5" /> Video
            </Button>
          </Link>
          <Link to="/generate-image">
            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 text-sm font-semibold">
              <Wand2 className="w-3.5 h-3.5" /> Image
            </Button>
          </Link>
        </div>

        <div className="ml-auto sm:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-background hover:bg-background/10">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-foreground text-background border-l border-background/10 p-0">
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-4 border-b border-background/10">
                  <Link to="/" onClick={() => setOpen(false)} className="flex items-center gap-2">
                    <img src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/4589efdb8_github_com_icon_6c4ebda9.png" alt="UnitySora" className="h-6 w-auto" />
                    <span className="font-bold text-background">UnitySora</span>
                  </Link>
                  <Button variant="ghost" size="icon" className="text-background hover:bg-background/10" onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <nav className="flex flex-col p-4 gap-1">
                  {NAV.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                        location.pathname === item.to
                          ? "bg-background/15 text-background"
                          : "text-background/70 hover:text-background hover:bg-background/10"
                      }`}
                    >
                      <item.icon className="w-4 h-4" /> {item.label}
                    </Link>
                  ))}
                </nav>
                <div className="mt-auto p-4 border-t border-background/10 grid grid-cols-2 gap-2">
                  <Link to="/generate" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full border-background/20 text-background hover:bg-background/10 gap-2 font-semibold">
                      <Video className="w-4 h-4" /> Video
                    </Button>
                  </Link>
                  <Link to="/generate-image" onClick={() => setOpen(false)}>
                    <Button className="w-full bg-primary hover:bg-primary/90 gap-2 font-semibold">
                      <ImageIcon className="w-4 h-4" /> Image
                    </Button>
                  </Link>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}