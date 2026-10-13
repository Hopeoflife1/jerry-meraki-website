import { useEffect, useRef } from "react";

type Handler = (e: KeyboardEvent) => void;

const isTypingTarget = (target: EventTarget | null) => {
  const el = target as HTMLElement | null;
  if (!el || !el.tagName) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

/**
 * Desktop keyboard shortcuts. Keys are lowercase `KeyboardEvent.key` values, optionally prefixed
 * with "mod+" (Cmd/Ctrl). Plain-key shortcuts are ignored while typing, while a dialog is open,
 * and on touch-only devices (design system §4).
 */
export function useHotkeys(map: Record<string, Handler>, enabled = true) {
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    if (!enabled) return;
    const touchOnly = window.matchMedia("(pointer: coarse)").matches && !window.matchMedia("(any-pointer: fine)").matches;
    if (touchOnly) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.isComposing) return;
      const mod = e.metaKey || e.ctrlKey;
      const handler = ref.current[(mod ? "mod+" : "") + e.key.toLowerCase()];
      if (!handler) return;
      if (!mod && (isTypingTarget(e.target) || document.querySelector('[role="dialog"]'))) return;
      e.preventDefault();
      handler(e);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}