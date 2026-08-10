import { Link } from "react-router-dom";
import { AlertTriangle, ChevronDown, ImageIcon, Info, Loader2, Video } from "lucide-react";

/** Image / Video switch shared by both create pages. */
export function CreateTabs({ active }) {
  const tabs = [
    { id: "image", label: "Image", to: "/generate-image", icon: ImageIcon },
    { id: "video", label: "Video", to: "/generate", icon: Video },
  ];

  return (
    <div className="inline-flex p-0.5 rounded-lg bg-muted">
      {tabs.map((tab) => {
        const isActive = tab.id === active;
        return (
          <Link
            key={tab.id}
            to={tab.to}
            className={[
              "px-4 h-9 rounded-[7px] text-[13px] font-medium transition-colors flex items-center gap-1.5",
              isActive ? "bg-surface-2 text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Panel({ children, className = "" }) {
  return (
    <div className={`rounded-xl border border-border surface ${className}`}>{children}</div>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <div className={className}>
      <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

/**
 * Native <select> on purpose — iOS renders its own wheel picker, which is
 * faster one-handed than a custom popover and needs no scroll trapping.
 */
export function NativeSelect({ value, onChange, options, disabled = false }) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="w-full h-11 pl-3 pr-9 rounded-lg border border-border bg-surface-2 text-sm text-foreground appearance-none focus:outline-none focus:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {options.map((option) => (
          <option key={option.id} value={option.id} className="bg-popover">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
    </div>
  );
}

export function ReadOnlyField({ children }) {
  return (
    <div className="h-11 px-3 rounded-lg border border-border bg-muted/60 flex items-center text-sm text-muted-foreground tabular">
      {children}
    </div>
  );
}

/** Aspect ratio picker with a live proportional preview. */
export function RatioPicker({ value, options, onChange, disabled = false }) {
  return (
    <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-0.5">
      {options.map((option) => {
        const [w, h] = option.id.split(":").map(Number);
        const active = option.id === value;
        const boxW = w >= h ? 26 : 26 * (w / h);
        const boxH = h >= w ? 26 : 26 * (h / w);

        return (
          <button
            key={option.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(option.id)}
            className={[
              "shrink-0 w-[74px] h-[74px] rounded-lg border flex flex-col items-center justify-center gap-1.5 transition-colors disabled:opacity-40",
              active
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:text-foreground hover:bg-accent",
            ].join(" ")}
          >
            <span
              className={active ? "border-2 border-primary rounded-[3px]" : "border-2 border-current rounded-[3px] opacity-60"}
              style={{ width: boxW, height: boxH }}
            />
            <span className="text-[11px] font-medium tabular">{option.id}</span>
          </button>
        );
      })}
    </div>
  );
}

const TONES = {
  error: { icon: AlertTriangle, cls: "border-destructive/30 bg-destructive/10 text-destructive" },
  warning: { icon: AlertTriangle, cls: "border-warning/30 bg-warning/10 text-warning" },
  info: { icon: Info, cls: "border-info/30 bg-info/10 text-info" },
  loading: { icon: Loader2, cls: "border-border bg-muted text-muted-foreground" },
};

export function Notice({ tone = "info", children }) {
  const { icon: Icon, cls } = TONES[tone] || TONES.info;
  return (
    <div className={`flex items-start gap-2 rounded-lg border p-3 text-[13px] leading-relaxed ${cls}`}>
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone === "loading" ? "animate-spin" : ""}`} />
      <span>{children}</span>
    </div>
  );
}

/**
 * Primary action. Fixed above the tab bar on mobile so the prompt stays
 * reachable one-handed; inline in the control column on desktop.
 */
export function StickyAction({ children }) {
  return (
    <>
      <div className="lg:hidden h-2" />
      <div className="lg:hidden fixed inset-x-0 bottom-[calc(var(--tabbar-h)+env(safe-area-inset-bottom))] z-30 glass border-t border-border px-4 py-3">
        {children}
      </div>
      <div className="hidden lg:block">{children}</div>
    </>
  );
}

export function GenerateButton({ onClick, disabled, busy, busyLabel, label, icon: Icon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full h-12 rounded-xl bg-primary text-primary-foreground text-[15px] font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 disabled:active:scale-100 shadow-glow disabled:shadow-none"
    >
      {busy ? (
        <>
          <Loader2 className="w-[18px] h-[18px] animate-spin" />
          {busyLabel}
        </>
      ) : (
        <>
          {Icon && <Icon className="w-[18px] h-[18px]" />}
          {label}
        </>
      )}
    </button>
  );
}

/** Collapsible group for the settings nobody touches every run. */
export function Disclosure({ label, open, onToggle, children }) {
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full h-11 px-3.5 flex items-center justify-between text-[13px] font-medium text-foreground surface-2"
      >
        {label}
        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <div className="p-3.5 space-y-4 border-t border-border animate-fade-in">{children}</div>}
    </div>
  );
}
