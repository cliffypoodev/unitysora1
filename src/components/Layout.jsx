import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { LogIn, LogOut, UserRound, Wand2 } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { getActiveNavId, getPageTitle, NAV_ITEMS } from "@/components/shell/nav";
import { usePromptBus } from "@/lib/PromptBus";
import PromptStudio from "@/components/prompt/PromptStudio";

const LOGO =
  "https://media.base44.com/images/public/6a036e3dc4cd55282c5c04ac/3cb3a56cc_ChatGPT_Image_May_12__2026__02_08_14_PM.png";

function initialsOf(user) {
  const source = user?.full_name || user?.email || "";
  const parts = String(source).replace(/@.*/, "").split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "U";
  return (parts[0][0] + (parts[1]?.[0] || "")).toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

function AccountPanel({ compact = false, onNavigate }) {
  const { user, isAuthenticated, isLoadingAuth, loginWithGoogle, logout } = useAuth();

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        disabled={isLoadingAuth}
        onClick={() => {
          onNavigate?.();
          loginWithGoogle();
        }}
        className="w-full flex items-center justify-center gap-2 h-11 rounded-lg bg-primary text-primary-foreground text-sm font-semibold transition-opacity active:opacity-80 disabled:opacity-50"
      >
        <LogIn className="w-4 h-4" />
        Sign in with Google
      </button>
    );
  }

  return (
    <div className={compact ? "space-y-3" : "space-y-2"}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-full bg-surface-2 border border-border grid place-items-center text-xs font-semibold text-foreground/80 shrink-0">
          {initialsOf(user)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{user?.full_name || "Signed in"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          onNavigate?.();
          logout(true);
        }}
        className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop rail                                                        */
/* ------------------------------------------------------------------ */

function Sidebar({ activeId, onOpenStudio }) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-40 w-[248px] flex-col border-r border-border surface">
      <Link to="/" className="flex items-center gap-2.5 h-16 px-5 shrink-0">
        <img src={LOGO} alt="" className="h-7 w-7 rounded-md object-cover no-drag" />
        <span className="font-semibold tracking-tight">UnitySora</span>
      </Link>

      <div className="px-3 pb-2">
        <button
          type="button"
          onClick={onOpenStudio}
          className="flex h-10 w-full items-center gap-2.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-sm font-medium text-foreground transition-colors hover:bg-primary/15"
        >
          <Wand2 className="h-[18px] w-[18px] text-primary" />
          Prompt Studio
        </button>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const active = activeId === item.id;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className={[
                "group flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/60",
              ].join(" ")}
            >
              <item.icon
                className={["w-[18px] h-[18px]", active ? "text-primary" : ""].join(" ")}
                strokeWidth={active ? 2.2 : 1.8}
              />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border">
        <AccountPanel />
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile chrome                                                       */
/* ------------------------------------------------------------------ */

function TopBar({ title, onOpenAccount }) {
  const { user, isAuthenticated } = useAuth();

  return (
    <header className="lg:hidden sticky top-0 z-40 glass border-b border-border pt-safe">
      <div className="h-topbar px-4 flex items-center gap-3">
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <img src={LOGO} alt="" className="h-6 w-6 rounded object-cover no-drag" />
        </Link>
        <h1 className="text-[15px] font-semibold tracking-tight truncate">{title}</h1>
        <button
          type="button"
          onClick={onOpenAccount}
          aria-label="Account"
          className="ml-auto w-9 h-9 shrink-0 rounded-full border border-border grid place-items-center text-[11px] font-semibold text-foreground/80 surface-2 active:scale-95 transition-transform"
        >
          {isAuthenticated ? initialsOf(user) : <UserRound className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
}

function TabBar({ activeId }) {
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border pb-safe">
      <div className="h-tabbar grid grid-cols-4">
        {NAV_ITEMS.map((item) => {
          const active = activeId === item.id;
          return (
            <NavLink
              key={item.id}
              to={item.to}
              className="flex flex-col items-center justify-center gap-1 select-none active:opacity-60 transition-opacity"
            >
              <item.icon
                className={[
                  "w-[22px] h-[22px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                ].join(" ")}
                strokeWidth={active ? 2.3 : 1.8}
              />
              <span
                className={[
                  "text-[10px] leading-none font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

function AccountSheet({ open, onClose }) {
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[60]" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/60 animate-fade-in" onClick={onClose} />
      <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-border bg-popover p-4 pb-safe animate-sheet-up">
        <div className="mx-auto mb-4 h-1 w-9 rounded-full bg-border" />
        <div className="pb-4">
          <AccountPanel compact onNavigate={onClose} />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function Layout() {
  const location = useLocation();
  const [accountOpen, setAccountOpen] = useState(false);
  const activeId = getActiveNavId(location.pathname);
  const title = getPageTitle(location.pathname);

  // Close the sheet and reset scroll on navigation.
  useEffect(() => {
    setAccountOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Sidebar activeId={activeId} />
      <TopBar title={title} onOpenAccount={() => setAccountOpen(true)} />

      <main className="lg:pl-[248px] pb-tabsafe lg:pb-0">
        <Outlet />
      </main>

      <TabBar activeId={activeId} />
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} />
    </div>
  );
}
