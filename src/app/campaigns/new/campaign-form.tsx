"use client";

import { LoaderCircle, Rocket } from "lucide-react";
import { CAMPAIGN_ICONS } from "@/components/campaign-card";
import { FormFeedback } from "@/components/form-feedback";
import { useFormAction } from "@/components/use-form-action";
import { CAMPAIGN_KINDS, type CampaignKind } from "@/modules/engagement/domain/campaign";
import { createCampaignAction } from "../actions";

export function CampaignForm({ defaultKind, minDate }: { defaultKind: CampaignKind; minDate: string }) {
  const { state, isPending, formRef, onSubmit } = useFormAction(createCampaignAction);

  return (
    <form ref={formRef} onSubmit={onSubmit} className="space-y-5">
      <fieldset>
        <legend className="field-label">What kind of campaign?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {(Object.keys(CAMPAIGN_KINDS) as CampaignKind[]).map((kind) => {
            const Icon = CAMPAIGN_ICONS[kind];
            return (
              <label
                key={kind}
                className="flex cursor-pointer flex-col gap-2 rounded-xl border border-slate-300 bg-white p-3 text-sm transition hover:border-brand-300 has-checked:border-brand-700 has-checked:bg-brand-50 has-focus-visible:ring-2 has-focus-visible:ring-brand-700/40"
              >
                <input type="radio" name="kind" value={kind} defaultChecked={kind === defaultKind} className="sr-only" />
                <Icon className="size-5 text-brand-700" aria-hidden />
                <span className="font-semibold text-slate-900">{CAMPAIGN_KINDS[kind].label}</span>
                <span className="text-slate-600">{CAMPAIGN_KINDS[kind].description}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div>
        <label htmlFor="title" className="field-label">
          Campaign name
        </label>
        <input
          id="title"
          name="title"
          required
          minLength={5}
          maxLength={80}
          placeholder="Harare Alumni 2009 back our old school"
          className="field-input"
        />
      </div>
      <div>
        <label htmlFor="story" className="field-label">
          Why you&apos;re raising money
        </label>
        <textarea
          id="story"
          name="story"
          required
          minLength={20}
          maxLength={1500}
          rows={5}
          placeholder="Tell people who you are, what this means to you, and why it matters now."
          className="field-input"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="goal" className="field-label">
            Goal in US dollars
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-500">$</span>
            <input id="goal" name="goal" required inputMode="decimal" placeholder="1000" className="field-input pl-7" />
          </div>
        </div>
        <div>
          <label htmlFor="endsOn" className="field-label">
            End date <span className="font-normal text-slate-500">(optional)</span>
          </label>
          <input id="endsOn" name="endsOn" type="date" min={minDate} className="field-input" />
        </div>
      </div>

      <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
        Gifts made through your campaign go to school-confirmed bills, paid straight to
        each school. You never handle the money. Matching pledges are added once our team
        has checked them with the company or person making them.
      </p>

      <FormFeedback state={state} />

      <button type="submit" disabled={isPending} className="btn-primary w-full py-3 sm:w-auto sm:px-8">
        {isPending ? (
          <LoaderCircle className="size-4 motion-safe:animate-spin" aria-hidden />
        ) : (
          <Rocket className="size-4" aria-hidden />
        )}
        Launch campaign
      </button>
    </form>
  );
}
