"use client";

import { BellRing, BellOff } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { setNotificationsAction } from "./notification-actions";

/** A switch for WhatsApp and email news about bills. Saves as soon as it's flipped. */
export function NotificationsSwitch({ on, channel }: { on: boolean; channel: string }) {
  const [isPending, startTransition] = useTransition();
  const [shown, setShown] = useOptimistic(on);

  const toggle = () =>
    startTransition(async () => {
      setShown(!shown);
      await setNotificationsAction(!shown);
    });

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700">
          {shown ? <BellRing className="size-5" aria-hidden /> : <BellOff className="size-5" aria-hidden />}
        </span>
        <div className="text-sm">
          <p id="notify-label" className="font-semibold text-slate-900">
            News about bills
          </p>
          <p className="text-slate-600">
            By {channel}: when a bill you supported is fully funded, or a student sends a
            thank-you note. Sign-in codes are always sent.
          </p>
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={shown}
        aria-labelledby="notify-label"
        disabled={isPending}
        onClick={toggle}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${
          shown ? "bg-brand-700" : "bg-slate-300"
        }`}
      >
        <span
          className={`inline-block size-5 rounded-full bg-white shadow transition-transform ${
            shown ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}
