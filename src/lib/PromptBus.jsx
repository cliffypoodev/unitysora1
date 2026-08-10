import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

/**
 * Carries a prompt from Prompt Studio into whichever create page is mounted.
 * A URL query param cannot do this: the create pages read `?prompt=` once on
 * mount, so injecting into an already-open page would silently do nothing.
 */
const PromptBusContext = createContext(null);

export function PromptBusProvider({ children }) {
  const [pending, setPending] = useState(null);
  const [studioOpen, setStudioOpen] = useState(false);
  const seq = useRef(0);

  const sendPrompt = useCallback((text, target = "image") => {
    seq.current += 1;
    setPending({ text: String(text || ""), target, id: seq.current });
  }, []);

  /** Create pages call this on mount and whenever `pending` changes. */
  const consumePrompt = useCallback((target) => {
    if (!pending || pending.target !== target) return null;
    setPending(null);
    return pending.text;
  }, [pending]);

  const value = useMemo(
    () => ({ pending, sendPrompt, consumePrompt, studioOpen, setStudioOpen }),
    [pending, sendPrompt, consumePrompt, studioOpen]
  );

  return <PromptBusContext.Provider value={value}>{children}</PromptBusContext.Provider>;
}

export function usePromptBus() {
  const context = useContext(PromptBusContext);
  if (!context) {
    throw new Error("usePromptBus must be used inside PromptBusProvider");
  }
  return context;
}
