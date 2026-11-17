import Link from "next/link";
import type { ReactNode } from "react";

// The frame around Clerk's sign-in and sign-up cards: Runway's hero glow, the logo,
// and one line about what you get. The card itself is themed in clerkAppearance.ts.

export function AuthShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="hero-glow flex flex-1 items-center">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1fr_auto]">
        <div>
          <Link href="/dashboard" className="inline-flex items-center gap-2">
            <span aria-hidden="true" className="size-7 rounded-full bg-[radial-gradient(circle_at_35%_35%,var(--sun),var(--accent)_75%)]" />
            <span className="font-display text-2xl font-bold">Runway</span>
          </Link>
          <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-5xl">{title}</h1>
          <p className="mt-4 max-w-md text-lg text-muted">A 12-week cash forecast for freelance and gig income: what&apos;s coming, what&apos;s tight, and what each payday should do.</p>
          <p className="mt-6 text-sm text-muted">
            Just looking? <Link href="/dashboard" className="font-bold text-accent-strong underline decoration-accent/40 underline-offset-4">Try the demo</Link> without an account.
          </p>
        </div>
        <div className="justify-self-center md:justify-self-end">{children}</div>
      </div>
    </main>
  );
}

/** Same size and color as Clerk's card, shown for the moment before it loads. */
export function AuthCardPlaceholder() {
  return <div aria-hidden="true" className="h-[420px] w-[400px] max-w-full rounded-2xl bg-[#fffaf2] ring-1 ring-line" />;
}
