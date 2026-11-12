import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

/** The title block for an admin page, with an optional link back to its list. */
export function AdminHeader(props: {
  title: ReactNode;
  icon: ReactNode;
  back?: { href: string; label: string };
  meta?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="space-y-2">
      {props.back && (
        <Link
          href={props.back.href}
          className="group inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-800"
        >
          <ArrowLeft
            className="size-4 transition-transform group-hover:-translate-x-0.5"
            aria-hidden
          />
          {props.back.label}
        </Link>
      )}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl metal-graphite text-white shadow-md">
            {props.icon}
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold text-slate-900">{props.title}</h1>
            {props.meta && <div className="text-sm text-slate-600">{props.meta}</div>}
          </div>
        </div>
        {props.actions && <div className="flex flex-wrap gap-2">{props.actions}</div>}
      </div>
    </header>
  );
}
