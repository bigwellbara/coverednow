/** A grey placeholder block with a light sweeping across it. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`shimmer rounded-lg bg-slate-200/80 ${className}`} />;
}

/** A placeholder for the dark hero band while a page loads. */
export function HeroSkeleton({ overlap = false }: { overlap?: boolean }) {
  return (
    <div
      aria-hidden
      className="bg-gradient-to-br from-brand-800 via-brand-900 to-brand-950"
    >
      <div className={`mx-auto max-w-6xl space-y-4 px-4 pt-14 ${overlap ? "pb-24" : "pb-14"}`}>
        <div className="shimmer h-4 w-32 rounded-lg bg-white/10" />
        <div className="shimmer h-10 w-72 max-w-full rounded-lg bg-white/15" />
        <div className="shimmer h-5 w-[28rem] max-w-full rounded-lg bg-white/10" />
      </div>
    </div>
  );
}

/** A placeholder shaped like a bill card. */
export function BillCardSkeleton() {
  return (
    <div aria-hidden className="card space-y-4">
      <div className="flex justify-between gap-3">
        <Skeleton className="h-5 w-32 rounded-full" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-2.5 w-full rounded-full" />
      <Skeleton className="h-3 w-1/2" />
      <div className="flex justify-between border-t border-slate-100 pt-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-16 rounded-xl" />
      </div>
    </div>
  );
}
