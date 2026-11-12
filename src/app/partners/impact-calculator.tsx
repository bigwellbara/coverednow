"use client";

import { useId, useState } from "react";
import { formatMoney } from "@/modules/billing/domain/money";

/**
 * Lets a donor see what covering a number of students would cost, using the
 * average still needed per open bill. It's an estimate, and says so.
 */
export function ImpactCalculator({
  averageCents,
  openBills,
}: {
  averageCents: number;
  openBills: number;
}) {
  const id = useId();
  const [students, setStudents] = useState(Math.min(10, openBills));
  const share = Math.round((students / openBills) * 100);

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor={id} className="field-label text-base">
          How many students would you like to keep in school?
        </label>
        <input
          id={id}
          type="range"
          min={1}
          max={openBills}
          value={students}
          onChange={(event) => setStudents(Number(event.target.value))}
          className="w-full cursor-pointer accent-brand-700"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>1</span>
          <span>{openBills} (every open bill)</span>
        </div>
      </div>

      <p className="rounded-2xl bg-gradient-to-br from-brand-700 to-brand-950 p-5 text-white" aria-live="polite">
        <span className="block text-sm text-brand-100">About</span>
        <span className="block text-4xl font-semibold tracking-tight text-gold-400 tabular-nums">
          {formatMoney(students * averageCents).replace(/\.00$/, "")}
        </span>
        <span className="mt-1 block text-brand-50">
          keeps {students === 1 ? "1 student" : `${students} students`} in class this term,
          {" "}{share}% of everyone waiting right now.
        </span>
      </p>
      <p className="text-xs text-slate-500">
        Based on the average still needed per open bill. Each bill&apos;s exact amount is
        confirmed by its school.
      </p>
    </div>
  );
}
