import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** A friendly placeholder for a list with nothing in it yet. */
export function EmptyState(props: {
  icon: LucideIcon;
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  const Icon = props.icon;
  return (
    <div className="fade-up card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="metal-silver grid size-16 place-items-center rounded-2xl text-slate-800">
        <Icon className="size-7" strokeWidth={1.6} aria-hidden />
      </span>
      <h2 className="mt-2 text-lg font-semibold text-slate-900">{props.title}</h2>
      {props.children && <p className="max-w-md text-sm text-slate-600">{props.children}</p>}
      {props.action && <div className="mt-2">{props.action}</div>}
    </div>
  );
}
