import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PreviewDashboard } from "@/components/userApp";
import { DEMO_PROFILES, getDemoProfile } from "@/lib/demo";

export const metadata = { title: "Runway · Sample data" };

// Sample data inside the signed-in app. Known personas are prerendered; params are
// read inside <Suspense> (Next 16 cacheComponents).
export function generateStaticParams() {
  return DEMO_PROFILES.map((p) => ({ persona: p.slug }));
}

export default function Preview({ params }: PageProps<"/app/preview/[persona]">) {
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading sample data…</p>}>
      <PreviewContent params={params} />
    </Suspense>
  );
}

async function PreviewContent({ params }: { params: PageProps<"/app/preview/[persona]">["params"] }) {
  const { persona } = await params;
  const p = getDemoProfile(persona);
  if (!p) notFound();
  return <PreviewDashboard base={p} />;
}
