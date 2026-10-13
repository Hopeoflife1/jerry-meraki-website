import { useEffect, useState } from "react";
import { Download, Share, X } from "lucide-react";
import { Button } from "./Button";
import styles from "./InstallPrompt.module.css";

// "Install the app" bar for phones.
// - Android/Chrome: uses the browser's install prompt (beforeinstallprompt) → one tap.
// - iPhone/Safari: no prompt exists, so it shows the 2-step "Share → Add to Home Screen" hint.
// Hidden when already installed (standalone), on desktop, or after the visitor closes it.

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "jm.install.dismissed";

const isStandalone = () =>
  window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
const wasDismissed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const InstallPrompt = () => {
  const [evt, setEvt] = useState<InstallEvent | null>(null);
  const [mode, setMode] = useState<"hidden" | "android" | "ios">("hidden");

  useEffect(() => {
    if (isStandalone() || wasDismissed()) return;
    if (!window.matchMedia("(max-width: 767px)").matches) return;
    if (isIos()) {
      setMode("ios");
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as InstallEvent);
      setMode("android");
    };
    const onInstalled = () => setMode("hidden");
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      // storage blocked: it just shows again next visit
    }
    setMode("hidden");
  };

  const install = async () => {
    if (!evt) return;
    await evt.prompt();
    const choice = await evt.userChoice;
    if (choice.outcome === "accepted") setMode("hidden");
    setEvt(null);
  };

  if (mode === "hidden") return null;

  return (
    <div className={styles.bar} role="region" aria-label="Install the Jerry Meraki app">
      <img src="/_cdn/static/e9b90944-c540-4136-b42c-24b15bf4b4f7-jm-icon-192.png" alt="" className={styles.icon} />
      <div className={styles.text}>
        <strong>Get the Jerry Meraki app</strong>
        {mode === "android" ? (
          <span>Free, quick to open, no app store needed.</span>
        ) : (
          <span>
            Tap <Share size={14} aria-label="Share" className={styles.inline} /> then <b>Add to Home Screen</b>.
          </span>
        )}
      </div>
      {mode === "android" && (
        <Button size="sm" className={styles.install} onClick={install}>
          <Download size={14} aria-hidden /> Install
        </Button>
      )}
      <button type="button" className={styles.close} onClick={dismiss} aria-label="Close">
        <X size={18} aria-hidden />
      </button>
    </div>
  );
};