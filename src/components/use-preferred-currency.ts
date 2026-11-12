"use client";

import { useCallback, useSyncExternalStore } from "react";
import { CURRENCIES, currencyForLocale, type CurrencyCode } from "@/lib/currencies";

const KEY = "coverednow.currency";
const EVENT = "coverednow:currency";

/** The choice made on this page, for browsers that block storage. */
let chosen: CurrencyCode | null = null;

function read(): CurrencyCode {
  try {
    const saved = window.localStorage.getItem(KEY);
    if (saved && saved in CURRENCIES) return saved as CurrencyCode;
  } catch {
    // Storage can be blocked, as in some private windows.
  }
  return chosen ?? currencyForLocale(navigator.language);
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * The currency this visitor likes to see amounts in, shared by every converter
 * and hint on the page. Null while rendering on the server, where it isn't known.
 */
export function usePreferredCurrency() {
  const currency = useSyncExternalStore(subscribe, read, () => null);
  const setCurrency = useCallback((code: CurrencyCode) => {
    chosen = code;
    try {
      window.localStorage.setItem(KEY, code);
    } catch {
      // Not remembered for next time, but this page still uses it.
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);
  return [currency, setCurrency] as const;
}
