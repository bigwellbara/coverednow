import { GraduationCap } from "lucide-react";
import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-xl px-6 py-[15vh]">
      <GraduationCap className="size-10 text-emerald-700" aria-hidden />
      <h1 className="mt-3 text-3xl font-bold">CoveredNow</h1>
      <p className="mt-2 text-lg text-slate-600">
        Fees covered. Paid straight to the school.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/sign-up" className="btn-primary">
          Get started
        </Link>
        <Link href="/sign-in" className="btn-secondary">
          Sign in
        </Link>
      </div>
    </main>
  );
}
