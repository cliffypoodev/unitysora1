import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowUp,
  Check,
  Copy,
  ImageIcon,
  Loader2,
  Sparkles,
  Video,
  Wand2,
  X,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { copyToClipboard } from "@/lib/mediaExport";
import { usePromptBus } from "@/lib/PromptBus";

const STARTERS = [
  "A lighthouse keeper during a storm",
  "Neon-lit alley after rain, 1980s",
  "Portrait of an old luthier in his workshop",
  "Abandoned carnival at dawn",
];

/** Strips any wrapper the model adds around the prompt itself. */
function cleanPrompt(text) {
  let value = String(text || "").trim();
  value = value.replace(/^(here(?:'|\u2019)?s|here is)[^:\n]*:\s*/i, "");
  value = value.replace(/^```[a-z]*\n?/i, "").replace(/```$/i, "");
  value = value.replace(/^["'\u201c\u2018]+/, "").replace(/["'\u201d\u2019]+$/, "");
  return value.trim();
}

function TargetToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-muted p-0.5">
      {[
        { id: "image", label: "Image", icon: ImageIcon },
        { id: "video", label: "Video", icon: Video },
      ].map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={[
            "flex h-8 items-center gap-1.5 rounded-[7px] px-3 text-[12px] font-medium transition-colors",
            value === option.id
              ? "bg-surface-2 text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
        >
          <option.icon className="h-3.5 w-3.5" />
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function PromptStudio() {
  const navigate = useNavigate();
  const { studioOpen, setStudioOpen, sendPrompt } = usePromptBus();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [target, setTarget] = useState("image");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copiedId, setCopiedId] = useState(null);

  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!studioOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") setStudioOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [studioOpen, setStudioOpen]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  if (!studioOpen) return null;

  const send = async (rawText) => {
    const text = String(rawText ?? input).trim();
    if (!text || busy) return;

    const history = [...messages, { role: "user", text, id: Date.now() }];
    setMessages(history);
    setInput("");
    setError("");
    setBusy(true);

    try {
      const response = await base44.functions.invoke("promptStudio", {
        target,
        messages: history.map(({ role, text: body }) => ({ role, text: body })),
      });
      const result = response?.data || response;

      if (!result?.success) {
        setError(result?.error || "Prompt Studio could not reach Gemini.");
      } else {
        setMessages((previous) => [
          ...previous,
          { role: "assistant", text: result.text, id: Date.now() + 1 },
        ]);
      }
    } catch (caught) {
      setError(caught?.message || "Prompt Studio could not reach Gemini.");
    } finally {
      setBusy(false);
    }
  };

  const use = (text) => {
    sendPrompt(cleanPrompt(text), target);
    setStudioOpen(false);
    navigate(target === "video" ? "/generate" : "/generate-image");
  };

  const copy = async (message) => {
    const done = await copyToClipboard(cleanPrompt(message.text));
    if (done) {
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1800);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex flex-col md:items-center md:justify-center md:p-6">
      <div
        className="absolute inset-0 bg-black/70 animate-fade-in"
        onClick={() => setStudioOpen(false)}
      />

      <div className="relative flex h-dvh w-full flex-col bg-background animate-sheet-up md:h-[82dvh] md:max-w-2xl md:rounded-2xl md:border md:border-border md:shadow-pop md:animate-scale-in">
        {/* Header */}
        <div className="flex shrink-0 items-center gap-3 border-b border-border px-4 pt-safe md:pt-0">
          <div className="flex h-14 w-full items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/15">
              <Wand2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold leading-tight">Prompt Studio</p>
              <p className="text-[11px] text-muted-foreground">Expands your idea, keeps your vision</p>
            </div>
            <button
              type="button"
              onClick={() => setStudioOpen(false)}
              aria-label="Close"
              className="ml-auto grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 touch-scroll overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="py-6">
              <p className="text-sm text-muted-foreground">
                Give me a rough idea and I will build it out — lighting, lens, composition,
                palette, mood. Your subject and tone stay exactly as you wrote them.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {STARTERS.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    onClick={() => send(starter)}
                    className="rounded-full border border-border px-3 py-2 text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-[14px] leading-relaxed text-primary-foreground">
                    {message.text}
                  </p>
                </div>
              ) : (
                <div key={message.id} className="rounded-2xl rounded-bl-md border border-border surface p-3.5">
                  <p className="whitespace-pre-wrap text-[14px] leading-relaxed">{message.text}</p>
                  <div className="mt-3 flex gap-2 border-t border-border pt-3">
                    <button
                      type="button"
                      onClick={() => use(message.text)}
                      className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary text-[13px] font-semibold text-primary-foreground transition-transform active:scale-95"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Use prompt
                    </button>
                    <button
                      type="button"
                      onClick={() => copy(message)}
                      className="flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-[13px] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      {copiedId === message.id ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedId === message.id ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              )
            )}

            {busy && (
              <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Expanding
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-[13px] leading-relaxed text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-border px-4 py-3 pb-safe">
          <div className="mb-2 flex items-center gap-2">
            <TargetToggle value={target} onChange={setTarget} />
            <span className="ml-auto text-[11px] text-muted-foreground">
              Sends to {target === "video" ? "video" : "image"} generator
            </span>
          </div>

          <div className="flex items-end gap-2 rounded-xl border border-border surface-2 p-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey && window.innerWidth >= 768) {
                  event.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Describe your idea, or paste a prompt to expand"
              className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-1.5 py-2 text-[15px] leading-relaxed placeholder:text-muted-foreground focus:outline-none"
            />
            <button
              type="button"
              onClick={() => send()}
              disabled={!input.trim() || busy}
              aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground transition-transform active:scale-95 disabled:opacity-40"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
