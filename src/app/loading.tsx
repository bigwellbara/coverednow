import { HeroSkeleton, Skeleton } from "@/components/skeleton";

/** Shown while any page's data loads; the header and footer stay in place. */
export default function Loading() {
  return (
    <main role="status" aria-label="Loading">
      <HeroSkeleton />
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        {[0, 1, 2].map((row) => (
          <div key={row} className="card flex items-center gap-4">
            <Skeleton className="size-11 rounded-xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
      <span className="sr-only">Loading…</span>
    </main>
  );
}
