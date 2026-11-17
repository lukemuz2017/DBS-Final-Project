import Link from "next/link";
import { DemoChooser } from "@/components/DemoChooser";

export const metadata = { title: "Runway · Try the demo" };

// The public demo starts here: describe yourself, then explore a matching forecast.
export default function DemoStart() {
  return (
    <main className="hero-glow flex-1">
      <div className="mx-auto w-full max-w-2xl px-4 py-14 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
            <span className="font-display text-2xl font-bold">Runway</span>
          </span>
          <span className="flex items-center gap-2">
            <Link href="/sign-in" className="rounded-lg px-3 py-1.5 text-sm font-bold text-accent-strong ring-1 ring-accent/30 hover:bg-accent-soft">Sign in</Link>
            <Link href="/sign-up" className="rounded-lg bg-accent px-3 py-1.5 text-sm font-bold text-white hover:bg-accent-strong">Create account</Link>
          </span>
        </div>
        <h1 className="mt-10 font-display text-4xl font-bold tracking-tight sm:text-5xl">Try Runway with sample data</h1>
        <p className="mt-2 text-muted">Pick what sounds like you. No account needed; changes stay in this browser.</p>
        <div className="mt-6">
          <DemoChooser basePath="/dashboard" />
        </div>
      </div>
    </main>
  );
}
