"use client";

import { ArrowRightLeft } from "lucide-react";
import { useId, useState } from "react";
import {
  convert,
  CURRENCIES,
  formatCurrency,
  type CurrencyCode,
  type UsdRates,
} from "@/lib/currencies";
import { usePreferredCurrency } from "./use-preferred-currency";

/** Today's rates between the dollar, ZiG and the currencies donors live with. */
export function CurrencyConverter({ rates }: { rates: UsdRates }) {
  const id = useId();
  const [preferred, setPreferred] = usePreferredCurrency();
  const [amount, setAmount] = useState("50");
  const [from, setFrom] = useState<CurrencyCode>("USD");

  const available = (Object.keys(CURRENCIES) as CurrencyCode[]).filter((code) => rates.rates[code]);
  const value = Number(amount.replace(/,/g, ""));
  const valid = Number.isFinite(value) && value >= 0;
  const usd = valid ? convert(value, from, "USD", rates.rates) : null;
  const updated = new Date(rates.updatedAt).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "Africa/Harare",
  });

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div>
          <label htmlFor={`${id}-amount`} className="field-label">
            Amount
          </label>
          <input
            id={`${id}-amount`}
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            aria-invalid={!valid}
            className="field-input text-lg font-semibold"
          />
        </div>
        <ArrowRightLeft className="mx-auto mb-3 hidden size-5 text-gold-600 sm:block" aria-hidden />
        <div>
          <label htmlFor={`${id}-from`} className="field-label">
            In
          </label>
          <select
            id={`${id}-from`}
            value={from}
            onChange={(event) => setFrom(event.target.value as CurrencyCode)}
            className="field-input"
          >
            {available.map((code) => (
              <option key={code} value={code}>
                {code}, {CURRENCIES[code]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {usd !== null && from !== "USD" && (
        <p className="rounded-xl bg-brand-50 px-4 py-3 text-brand-900" aria-live="polite">
          is about <strong className="text-xl">{formatCurrency(usd, "USD")}</strong>, the
          currency school fees are billed in.
        </p>
      )}

      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" aria-label="Converted amounts">
        {available
          .filter((code) => code !== from)
          .map((code) => {
            const converted = valid ? convert(value, from, code, rates.rates) : null;
            const isPreferred = code === preferred;
            return (
              <li key={code}>
                <button
                  type="button"
                  onClick={() => setPreferred(code)}
                  aria-pressed={isPreferred}
                  title={`Show amounts across the site in ${CURRENCIES[code]}`}
                  className={`w-full rounded-xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0 ${
                    isPreferred
                      ? "border-gold-400 bg-gold-50 ring-1 ring-gold-300"
                      : "border-slate-200 bg-white hover:border-brand-200"
                  }`}
                >
                  <span className="block text-xs font-semibold text-slate-500">{code}</span>
                  <span className="block truncate text-lg font-semibold text-slate-900 tabular-nums">
                    {converted === null ? "-" : formatCurrency(converted, code)}
                  </span>
                  <span className="block truncate text-xs text-slate-500">{CURRENCIES[code]}</span>
                </button>
              </li>
            );
          })}
      </ul>

      <p className="text-xs text-slate-500">
        Tap a currency to see amounts across the site in it. Indicative rates for{" "}
        {updated}.{" "}
        <a
          href="https://www.exchangerate-api.com"
          target="_blank"
          rel="noreferrer"
          className="underline hover:text-slate-700"
        >
          Rates by Exchange Rate API
        </a>
        . Your bank or mobile wallet sets the rate you actually pay.
      </p>
    </div>
  );
}
