import { MapPin, School } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHero } from "@/components/page-hero";
import { delay, stagger } from "@/lib/motion";
import { cityPosition } from "@/lib/zimbabwe-cities";
import { getBillService } from "@/modules/billing";
import { formatMoney } from "@/modules/billing/domain/money";
import { DEFAULT_FEED_FILTER, remainingCents } from "@/modules/billing/domain/public-bill";
import { MapLoader } from "./map-loader";
import type { MapPlace } from "./school-map";

export const metadata: Metadata = {
  title: "Map of schools - CoveredNow",
  description: "Find verified schools and students waiting for help, town by town across Zimbabwe.",
};
export const dynamic = "force-dynamic";

export default async function MapPage() {
  const service = getBillService();
  const [schools, open] = await Promise.all([
    service.listVerifiedSchools(),
    service.listOpen(DEFAULT_FEED_FILTER),
  ]);

  const byCity = new Map<string, { city: string; schools: MapPlace["schools"]; openBills: number; needCents: number }>();
  for (const school of schools) {
    const key = school.city.trim().toLowerCase();
    const bills = open.filter((bill) => bill.schoolId === school.id);
    const entry = byCity.get(key) ?? { city: school.city.trim(), schools: [], openBills: 0, needCents: 0 };
    entry.schools.push({ id: school.id, name: school.name, openBills: bills.length });
    entry.openBills += bills.length;
    entry.needCents += bills.reduce((sum, bill) => sum + remainingCents(bill), 0);
    byCity.set(key, entry);
  }
  const all = [...byCity.values()].sort((a, b) => b.openBills - a.openBills);
  const places: MapPlace[] = all.flatMap((entry) => {
    const position = cityPosition(entry.city);
    return position
      ? [{ ...entry, position, needLabel: formatMoney(entry.needCents).replace(/\.00$/, "") }]
      : [];
  });

  return (
    <main>
      <PageHero
        eyebrow="Across Zimbabwe"
        title="Find a school near your heart"
        subtitle="Every circle is a town with verified schools. Gold circles have students waiting right now; tap one to see who."
        overlap
      />
      <div className="mx-auto max-w-6xl space-y-8 px-4">
        <section
          className="fade-up card relative isolate -mt-14 overflow-hidden p-0 shadow-xl shadow-brand-950/10"
          style={delay(300)}
          aria-label="Map of schools"
        >
          <MapLoader places={places} />
        </section>

        <section aria-labelledby="towns-heading" className="space-y-4">
          <h2 id="towns-heading" className="text-2xl font-semibold text-slate-900">
            Town by town
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {all.map((place, index) => (
              <li key={place.city} className="fade-up card space-y-2" style={stagger(index, 50, 400)}>
                <p className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                    <MapPin className="size-4 text-gold-600" aria-hidden />
                    {place.city}
                  </span>
                  <span className={`chip ${place.openBills > 0 ? "bg-gold-100 text-gold-900" : "bg-brand-50 text-brand-800"}`}>
                    {place.openBills > 0 ? `${place.openBills} waiting` : "All funded"}
                  </span>
                </p>
                <ul className="space-y-1 text-sm">
                  {place.schools.map((school) => (
                    <li key={school.id}>
                      <Link
                        href={`/browse?school=${school.id}`}
                        className="inline-flex min-h-8 items-center gap-1.5 text-brand-800 hover:underline"
                      >
                        <School className="size-3.5 shrink-0" aria-hidden />
                        {school.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
