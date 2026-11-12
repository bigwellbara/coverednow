"use client";

import { useId } from "react";
import {
  convert,
  CURRENCIES,
  formatCurrency,
  type CurrencyCode,
  type UsdRates,
} from "@/lib/currencies";
import { usePreferredCurrency } from "./use-preferred-currency";

/**
 * "≈ £37.62", next to a dollar amount, in the visitor's own currency. Shows
 * nothing until the browser knows that currency, or if it is the dollar itself.
 * With `picker`, a small menu lets them change it.
 */
export function LocalAmount({
  cents,
  rates,
  picker = false,
  className = "",
}: {
  cents: number;
  rates: UsdRates | null;
  picker?: boolean;
  className?: string;
}) {
  const id = useId();
  const [currency, setCurrency] = usePreferredCurrency();
  if (!rates || !currency) return null;

  const available = (Object.keys(CURRENCIES) as CurrencyCode[]).filter((code) => rates.rates[code]);
  const value = convert(cents / 100, "USD", currency, rates.rates);
  const showValue = currency !== "USD" && value !== null;
  if (!showValue && !picker) return null;

  return (
    <span className={`inline-flex flex-wrap items-center gap-1.5 text-sm text-slate-600 ${className}`}>
      {showValue && (
        <span>
          ≈ <span className="font-semibold text-slate-800">{formatCurrency(value, currency)}</span>
        </span>
      )}
      {picker && (
        <>
          <label htmlFor={id} className="sr-only">
            Show amounts in
          </label>
          <select
            id={id}
            value={currency}
            onChange={(event) => setCurrency(event.target.value as CurrencyCode)}
            className="min-h-8 rounded-lg border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-medium text-slate-700 hover:border-slate-300"
          >
            {available.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </>
      )}
    </span>
  );
}
