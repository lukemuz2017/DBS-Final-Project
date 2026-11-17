import { Suspense } from "react";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata = { title: "Runway · Set up your forecast" };

export default function Start() {
  // Setup reads today's date, so it renders per visit rather than at build time.
  return (
    <Suspense fallback={<p className="p-10 text-muted">Loading…</p>}>
      <Onboarding />
    </Suspense>
  );
}
