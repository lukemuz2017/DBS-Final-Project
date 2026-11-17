import { notFound } from "next/navigation";
import { Suspense } from "react";
import { DemoSetup } from "@/components/demoViews";
import { DEMO_PROFILES, getDemoProfile } from "@/lib/demo";

export const metadata = { title: "Runway · Account Details" };

export function generateStaticParams() {
  return DEMO_PROFILES.map((p) => ({ persona: p.slug }));
}

export default function SetupPage({ params }: PageProps<"/dashboard/[persona]/setup">) {
  return (
    <Suspense fallback={<p className="p-8 text-sm text-muted">Loading…</p>}>
      <Content params={params} />
    </Suspense>
  );
}

async function Content({ params }: { params: PageProps<"/dashboard/[persona]/setup">["params"] }) {
  const { persona } = await params;
  const p = getDemoProfile(persona);
  if (!p) notFound();
  return <DemoSetup base={p} />;
}
