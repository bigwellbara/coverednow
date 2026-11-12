"use client";

import { Smartphone } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: string }> };

/**
 * An "Install the app" button, shown only when the browser offers to install
 * CoveredNow (Chrome and Edge on Android and desktop). Elsewhere it stays hidden.
 */
export function InstallApp() {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => setPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!prompt) return null;
  return (
    <button
      type="button"
      onClick={async () => {
        await prompt.prompt();
        await prompt.userChoice;
        setPrompt(null);
      }}
      className="btn-champagne min-h-9 px-4 text-[13px]"
    >
      <Smartphone className="size-4" aria-hidden />
      Install the app
    </button>
  );
}
