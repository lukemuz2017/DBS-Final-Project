import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoDashboard } from "@/components/demoViews";
import { DEMO_PROFILES, getDemoProfile } from "@/lib/demo";

export const metadata = { title: "Runway · Dashboard" };

// The demo personas, so every dashboard is prerendered at build time.
export function generateStaticParams() {
  return DEMO_PROFILES.map((p) => ({ persona: p.slug }));
}

// Params are read inside <Suspense> so switching personas can show the shell
// instantly (Next 16 partial prefetching). All of them are prerendered anyway.
export default function Dashboard({ params }: PageProps<"/dashboard/[persona]">) {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardContent params={params} />
    </Suspense>
  );
}

function DashboardLoading() {
  return (
    <div className="hero-glow flex-1 border-b border-line">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="h-4 w-48 animate-pulse rounded bg-band" />
        <div className="mt-4 h-12 w-80 max-w-full animate-pulse rounded bg-band" />
        <p className="mt-4 text-sm text-muted">Loading forecast…</p>
      </div>
    </div>
  );
}

async function DashboardContent({ params }: { params: PageProps<"/dashboard/[persona]">["params"] }) {
  const { persona } = await params;
  const p = getDemoProfile(persona);
  if (!p) notFound();
  // The view is a client component: demo edits are kept in the browser and the
  // forecast engine (pure TypeScript) reruns there on every change.
  return <DemoDashboard base={p} profiles={DEMO_PROFILES} />;
}
