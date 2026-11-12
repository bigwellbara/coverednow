import { Landmark, ShieldCheck } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import heroUniforms from "@/assets/home/hero-uniforms.jpg";
import { delay } from "@/lib/motion";

/** Sign in and sign up: the form on one side, a photo on the other on wide screens. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="relative grid min-h-[calc(100vh-4rem)] lg:grid-cols-2">
      <div className="relative isolate flex items-center justify-center overflow-hidden px-4 py-10 sm:py-16">
        <div className="w-full max-w-md">{children}</div>
      </div>

      <div aria-hidden className="relative isolate hidden overflow-hidden bg-brand-950 lg:block">
        <div className="ken-burns absolute inset-0 -z-20">
          <Image
            src={heroUniforms}
            alt=""
            fill
            priority
            placeholder="blur"
            sizes="50vw"
            className="object-cover"
          />
        </div>
        <div className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-950/95 via-brand-950/40 to-brand-900/10" />

        <div className="absolute inset-x-10 bottom-12 space-y-6 text-white">
          <p className="fade-up max-w-md text-3xl leading-tight font-semibold" style={delay(200)}>
            Every term covered is a student who stays in class.
          </p>
          {/* Each badge fades in, then floats; one animation per element. */}
          <div className="flex flex-wrap gap-3">
            <span className="fade-up" style={delay(400)}>
              <span className="bob inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl">
                <span className="grid size-8 place-items-center rounded-full bg-brand-700 text-gold-300">
                  <ShieldCheck className="size-4" />
                </span>
                Bills confirmed by the school
              </span>
            </span>
            <span className="fade-up" style={delay(550)}>
              <span className="bob inline-flex items-center gap-2 rounded-2xl bg-white/95 px-4 py-3 text-sm font-semibold text-slate-900 shadow-xl [animation-delay:-2.5s]">
                <span className="grid size-8 place-items-center rounded-full metal-champagne">
                  <Landmark className="size-4" />
                </span>
                Paid straight to the school
              </span>
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
