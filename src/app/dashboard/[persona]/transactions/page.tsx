import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ActivityView } from "@/components/ActivityView";
import { DEMO_PROFILES, getDemoProfile } from "@/lib/demo";

export const metadata = { title: "Runway · Transactions" };

export function generateStaticParams() {
  return DEMO_PROFILES.map((p) => ({ persona: p.slug }));
}

export default function TransactionsPage({ params }: PageProps<"/dashboard/[persona]/transactions">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/dashboard/[persona]/transactions">["params"] }) {
  const { persona } = await params;
  const p = getDemoProfile(persona);
  if (!p) notFound();
  return <ActivityView base={p} profiles={DEMO_PROFILES} mode="transactions" />;
}
