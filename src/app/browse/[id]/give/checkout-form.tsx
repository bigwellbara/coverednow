"use client";

import { EyeOff, Lock, UserRound, VenetianMask } from "lucide-react";
import { useState, useTransition, type FormEvent } from "react";
import { formatMoney, parseAmountToCents } from "@/modules/billing/domain/money";
import {
  DEFAULT_TIP_PERCENT,
  MIN_DONATION_CENTS,
  TIP_PERCENTS,
  VISIBILITY_LABELS,
  checkAmount,
  quote,
  suggestedAmounts,
  type Visibility,
} from "@/modules/payments/domain/checkout";
import { startCheckoutAction } from "./actions";

const VISIBILITY_ICONS = {
  PUBLIC: UserRound,
  ALIAS: VenetianMask,
  ANONYMOUS: EyeOff,
} as const;

const centsToInput = (cents: number) =>
  cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2);

export function CheckoutForm(props: {
  billId: string;
  remainingCents: number;
  initialCents: number;
  feeBps: number;
  donorName: string;
  isSimulated: boolean;
}) {
  const { remainingCents, feeBps } = props;
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(centsToInput(props.initialCents));
  const [tipPercent, setTipPercent] = useState<number>(DEFAULT_TIP_PERCENT);
  const [visibility, setVisibility] = useState<Visibility>("PUBLIC");
  const [alias, setAlias] = useState("");
  const [error, setError] = useState<string | null>(null);

  const amountCents = parseAmountToCents(amount);
  const problem = amountCents === null ? "INVALID" : checkAmount(amountCents, remainingCents);
  const breakdown =
    amountCents !== null && problem === null
      ? quote(amountCents, tipPercent as (typeof TIP_PERCENTS)[number], feeBps)
      : null;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!breakdown) return;
    setError(null);
    startTransition(async () => {
      const result = await startCheckoutAction({
        billId: props.billId,
        amount,
        tipPercent,
        visibility,
        alias,
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      window.location.assign(result.redirectUrl);
    });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <fieldset className="space-y-3">
        <legend className="field-label text-base">Amount for the school</legend>
        <div className="flex flex-wrap gap-2">
          {suggestedAmounts(remainingCents).map((cents, index) => {
            const selected = amountCents === cents;
            return (
              <button
                key={cents}
                type="button"
                aria-pressed={selected}
                onClick={() => setAmount(centsToInput(cents))}
                className={`min-h-11 rounded-xl border px-4 font-semibold ${
                  selected
                    ? "border-brand-700 bg-brand-700 text-white"
                    : "border-slate-300 bg-white text-slate-800 hover:border-brand-700"
                }`}
              >
                {index === 0 ? `All of it (${formatMoney(cents)})` : formatMoney(cents)}
              </button>
            );
          })}
        </div>
        <div>
          <label htmlFor="amount" className="sr-only">
            Amount in US dollars
          </label>
          <div className="relative max-w-48">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">
              $
            </span>
            <input
              id="amount"
              inputMode="decimal"
              autoComplete="off"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              aria-invalid={problem !== null}
              aria-describedby="amount-help"
              className="field-input pl-7 text-lg font-semibold"
            />
          </div>
          <p id="amount-help" className="mt-1 text-sm text-slate-600">
            {problem === "MORE_THAN_NEEDED"
              ? `This bill only needs ${formatMoney(remainingCents)} more.`
              : problem === "TOO_SMALL"
                ? `The smallest gift is ${formatMoney(MIN_DONATION_CENTS)}.`
                : problem === "INVALID"
                  ? "Enter an amount such as 25 or 25.50."
                  : "Every cent of this goes to the school."}
          </p>
        </div>
      </fieldset>

      <div>
        <label htmlFor="tip" className="field-label text-base">
          Optional tip for CoveredNow
        </label>
        <select
          id="tip"
          value={tipPercent}
          onChange={(event) => setTipPercent(Number(event.target.value))}
          className="field-input max-w-48"
        >
          {TIP_PERCENTS.map((percent) => (
            <option key={percent} value={percent}>
              {percent === 0 ? "No tip" : `${percent}%`}
            </option>
          ))}
        </select>
        <p className="mt-1 text-sm text-slate-600">
          Tips keep the platform running, so the school always gets the full bill.
        </p>
      </div>

      <fieldset>
        <legend className="field-label text-base">How your gift is shown</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(VISIBILITY_LABELS) as Visibility[]).map((option) => {
            const Icon = VISIBILITY_ICONS[option];
            const selected = visibility === option;
            return (
              <label
                key={option}
                className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium ${
                  selected
                    ? "border-brand-700 bg-brand-50 text-brand-900"
                    : "border-slate-300 bg-white text-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={option}
                  checked={selected}
                  onChange={() => setVisibility(option)}
                  className="sr-only"
                />
                <Icon className="size-4 shrink-0" aria-hidden />
                {VISIBILITY_LABELS[option]}
              </label>
            );
          })}
        </div>
        {visibility === "PUBLIC" && (
          <p className="mt-2 text-sm text-slate-600">Shown as &ldquo;{props.donorName}&rdquo;.</p>
        )}
        {visibility === "ANONYMOUS" && (
          <p className="mt-2 text-sm text-slate-600">
            Shown as &ldquo;Anonymous&rdquo;. The school and student won&apos;t see your name.
          </p>
        )}
        {visibility === "ALIAS" && (
          <div className="mt-2">
            <label htmlFor="alias" className="field-label">
              Name to show
            </label>
            <input
              id="alias"
              required
              minLength={2}
              maxLength={40}
              value={alias}
              onChange={(event) => setAlias(event.target.value)}
              placeholder="Harare Alumni '09"
              className="field-input max-w-sm"
            />
          </div>
        )}
      </fieldset>

      <section aria-label="Summary" className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <dl className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <dt>To the school</dt>
            <dd className="font-medium">{breakdown ? formatMoney(breakdown.amountCents) : "-"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Tip for CoveredNow</dt>
            <dd>{breakdown ? formatMoney(breakdown.tipCents) : "-"}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt>Payment processing</dt>
            <dd>{breakdown ? formatMoney(breakdown.feeCents) : "-"}</dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-slate-200 pt-2 text-base font-bold">
            <dt>Total</dt>
            <dd className="text-brand-800">{breakdown ? formatMoney(breakdown.totalCents) : "-"}</dd>
          </div>
        </dl>
      </section>

      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={!breakdown || isPending}
        className="btn-primary w-full py-3 text-lg"
      >
        <Lock className="size-4" aria-hidden />
        {isPending
          ? "Starting secure payment..."
          : breakdown
            ? `Pay ${formatMoney(breakdown.totalCents)}`
            : "Pay"}
      </button>
      <p className="text-center text-sm text-slate-600">
        {props.isSimulated
          ? "Development mode: you'll see a test payment page, and no money moves."
          : "You'll pay on Paynow's secure page with EcoCash, OneMoney or a bank card."}
      </p>
    </form>
  );
}
