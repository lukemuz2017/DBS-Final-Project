import Link from "next/link";
import { DEMO_PROFILES } from "@/lib/demo";

// Local landing page. On Vercel, vercel.json serves the class proposal at "/"
// instead, and the app lives under /dashboard.
export default function Home() {
  return (
    <main className="hero-glow flex flex-1 items-center">
      <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
        <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-accent">Runway · Demo</p>
        <h1 className="mt-2 font-display text-5xl font-bold leading-[1.05] tracking-tight">See the next 12 weeks before they happen.</h1>
        <p className="mt-4 text-lg">A cash forecast for people whose income is lumpy. Pick a demo person to explore:</p>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {DEMO_PROFILES.map((p) => (
            <li key={p.slug}>
              <Link href={`/dashboard/${p.slug}`} className="card block p-4 transition-transform hover:-translate-y-0.5">
                <span className="block font-bold">{p.name}</span>
                <span className="block text-sm text-muted">{p.role}</span>
                <span className="block text-sm text-muted">{p.city}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
