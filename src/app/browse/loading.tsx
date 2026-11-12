import { BillCardSkeleton, HeroSkeleton, Skeleton } from "@/components/skeleton";

export default function BrowseLoading() {
  return (
    <main role="status" aria-label="Loading bills">
      <HeroSkeleton overlap />
      <div className="mx-auto max-w-6xl space-y-6 px-4">
        <div aria-hidden className="card relative -mt-14 grid gap-3 p-5 shadow-xl sm:grid-cols-2 lg:grid-cols-5">
          {[0, 1, 2, 3, 4].map((field) => (
            <Skeleton key={field} className="h-11 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((card) => (
            <BillCardSkeleton key={card} />
          ))}
        </div>
      </div>
      <span className="sr-only">Loading bills…</span>
    </main>
  );
}
