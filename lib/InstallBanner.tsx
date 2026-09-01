import {useEffect, useState} from "react";

const DISMISS_KEY = "tagping-install-dismissed";

// The `beforeinstallprompt` event isn't in TypeScript's default DOM lib
// yet, so it's typed loosely here rather than pulled in from a third-party
// lib.d.ts just for this one field.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => void;
  userChoice: Promise<{outcome: "accepted" | "dismissed"}>;
}

// A small, dismissible bar offering to install TagPing as an app.
// Android/desktop Chrome fire `beforeinstallprompt` and we can trigger the
// native install flow directly. iOS Safari never fires that event, so we
// show a short "Add to Home Screen" hint instead.
export default function InstallBanner() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [iosHint, setIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(localStorage.getItem(DISMISS_KEY) === "1"); } catch (e) {}

    const standalone = window.matchMedia?.("(display-mode: standalone)")?.matches || (window.navigator as Navigator & {standalone?: boolean}).standalone;
    if (standalone) return;

    function onPrompt(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);

    const isIos = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    const isSafari = /safari/i.test(window.navigator.userAgent) && !/crios|fxios/i.test(window.navigator.userAgent);
    if (isIos && isSafari) setIosHint(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  function dismiss() {
    setDismissed(true);
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch (e) {}
  }

  async function install() {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
  }

  if (dismissed || (!deferred && !iosHint)) return null;

  return <div className="installBar">
    <span>{deferred ? "Install TagPing on this device for quick access." : "Add TagPing to your Home Screen: tap Share, then \"Add to Home Screen.\""}</span>
    <div className="installBarActions">
      {deferred && <button onClick={install}>Install</button>}
      <button className="secondary" onClick={dismiss}>Not now</button>
    </div>
  </div>;
}
