import Link from "next/link";

// The front door: sign in, create an account, or try the demo without one.
// (vercel.json was meant to serve the class proposal at "/", but the live site shows
// this page; the proposal stays at /proposal/v2.html.)
export default function Home() {
  return (
    <main className="hero-glow flex flex-1 items-center">
      <div className="mx-auto w-full max-w-2xl px-4 py-16 sm:px-6">
        <div className="flex items-center gap-2">
          <span aria-hidden="true" className="size-8 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
          <span className="font-display text-3xl font-bold">Runway</span>
        </div>
        <h1 className="mt-8 font-display text-5xl font-bold leading-[1.05] tracking-tight">See the next 12 weeks before they happen.</h1>
        <p className="mt-4 text-lg text-muted">A cash forecast for freelance and gig income: what&apos;s coming, what&apos;s tight, and what each payday should do.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/sign-up" className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white hover:bg-accent-strong">Create account</Link>
          <Link href="/sign-in" className="rounded-xl px-5 py-3 text-sm font-bold text-accent-strong ring-1 ring-accent/30 hover:bg-accent-soft">Sign in</Link>
          <Link href="/dashboard" className="px-2 py-3 text-sm font-bold text-muted underline decoration-line underline-offset-4 hover:text-ink">Try the demo</Link>
        </div>
      </div>
    </main>
  );
}
