import { ChevronRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { stagger } from "@/lib/motion";

/** A card in a list that opens a detail page. Rows fade in one after another. */
export function ListRow(props: {
  href: string;
  index: number;
  icon?: ReactNode;
  title: ReactNode;
  meta?: ReactNode;
  status?: ReactNode;
}) {
  return (
    <li className="fade-up" style={stagger(props.index)}>
      <Link
        href={props.href}
        className="group card flex items-center gap-4 transition duration-200 hover:border-brand-300 hover:shadow-md"
      >
        {props.icon && (
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 transition-colors group-hover:bg-brand-700 group-hover:text-white">
            {props.icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">{props.title}</span>
          {props.meta && <span className="block text-sm text-slate-500">{props.meta}</span>}
          {props.status && <span className="mt-1.5 block">{props.status}</span>}
        </span>
        <ChevronRight
          className="size-5 shrink-0 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-brand-700"
          aria-hidden
        />
      </Link>
    </li>
  );
}
