import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { BookOpen, ImageIcon, Images, LogIn, LogOut, Menu, UserRound, Video, X } from "lucide-react";

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
  const { user, isAuthenticated, isLoadingAuth, loginWithGoogle, logout } = useAuth();
  const userLabel = user?.full_name || user?.email || "Signed in";

  const accountButton = isAuthenticated ? (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={() => logout(true)}
      className="text-background hover:bg-background/10 gap-1.5"
      title={userLabel}
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden xl:inline">Sign Out</span>
    </Button>
  ) : (
    <Button
      type="button"
      size="sm"
      onClick={loginWithGoogle}
      disabled={isLoadingAuth}
      className="bg-background text-foreground hover:bg-background/90 gap-1.5 font-semibold"
    >
      <LogIn className="w-4 h-4" />
      Google Sign In
    </Button>
  );

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
              className={[
                "flex items-center gap-1.5 px-2.5 py-2 rounded-md text-sm font-medium transition-colors",
                location.pathname === item.to
                  ? "bg-background/15 text-background"
                  : "text-background/70 hover:text-background hover:bg-background/10",
              ].join(" ")}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto hidden sm:flex items-center gap-2">
          {isAuthenticated && (
            <div className="hidden xl:flex items-center gap-1.5 text-xs text-background/70 max-w-44 truncate">
              <UserRound className="w-3.5 h-3.5 flex-shrink-0" />
              <span className="truncate">{userLabel}</span>
            </div>
          )}
          {accountButton}
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
                    <img
                      src="https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3cb3a56cc_ChatGPT_Image_May_12__2026__02_08_14_PM.png"
                      alt="UnitySora"
                      className="h-6 w-auto"
                    />
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
                      className={[
                        "flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                        location.pathname === item.to
                          ? "bg-background/15 text-background"
                          : "text-background/70 hover:text-background hover:bg-background/10",
                      ].join(" ")}
                    >
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </Link>
                  ))}
                </nav>

                <div className="mt-auto p-4 border-t border-background/10">
                  {isAuthenticated ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setOpen(false);
                        logout(true);
                      }}
                      className="w-full border-background/20 text-background hover:bg-background/10 gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      onClick={() => {
                        setOpen(false);
                        loginWithGoogle();
                      }}
                      disabled={isLoadingAuth}
                      className="w-full bg-background text-foreground hover:bg-background/90 gap-2 font-semibold"
                    >
                      <LogIn className="w-4 h-4" />
                      Continue with Google
                    </Button>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
