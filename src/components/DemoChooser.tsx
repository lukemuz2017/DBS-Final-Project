"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DEMO_PROFILES } from "@/lib/demo";
import { STYLES } from "@/lib/engine/rules";
import type { Profile, SavingsStyle } from "@/lib/types";
import { Segmented } from "./edit/fields";

// Pick a demo by describing yourself (how you earn, how hard you save) instead of
// picking a person. The demo then opens on the matching profile with that savings style.

const EARN: { value: "freelance" | "steady"; label: string }[] = [
  { value: "freelance", label: "Freelance or gig work" },
  { value: "steady", label: "A steady paycheck" },
];
const STYLE_OPTIONS = (Object.keys(STYLES) as SavingsStyle[]).map((k) => ({ value: k, label: STYLES[k].label }));

/** `basePath`: where demos live, e.g. "/dashboard" or "/app/preview". */
export function DemoChooser({ basePath }: { basePath: string }) {
  const hrefFor = (slug: string, style: SavingsStyle) => `${basePath}/${slug}?style=${style}`;
  const [earn, setEarn] = useState<"freelance" | "steady">("freelance");
  const [style, setStyle] = useState<SavingsStyle>("balanced");
  const persona = DEMO_PROFILES.find((p) => p.profileType === earn) ?? DEMO_PROFILES[0];
  return (
    <div className="card p-6 sm:p-8">
      <div className="space-y-5">
        <div>
          <div className="text-sm font-bold">How do you earn?</div>
          <div className="mt-2"><Segmented label="How do you earn?" value={earn} onChange={setEarn} options={EARN} /></div>
        </div>
        <div>
          <div className="text-sm font-bold">How hard do you want to save?</div>
          <div className="mt-2"><Segmented label="How hard do you want to save?" value={style} onChange={setStyle} options={STYLE_OPTIONS} /></div>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-5">
        <p className="text-sm text-muted">
          You&apos;ll see <strong className="text-ink">{persona.name.split(" ")[0]}</strong>, {persona.role.toLowerCase()} in {persona.city}.
        </p>
        <Link href={hrefFor(persona.slug, style)} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-strong">
          Show me the demo
        </Link>
      </div>
    </div>
  );
}

const isStyle = (s: string | null): s is SavingsStyle => s === "safe" || s === "balanced" || s === "push";

/**
 * The savings style picked in the chooser (?style=...), applied to a demo profile.
 * Read inside <Suspense> (it uses the URL).
 */
export function useChosenStyle(base: Profile): { profile: Profile; style?: SavingsStyle; query: string } {
  const raw = useSearchParams().get("style");
  const style = isStyle(raw) ? raw : undefined;
  const profile = useMemo(() => (style ? { ...base, rules: { ...base.rules, savingsStyle: style } } : base), [base, style]);
  return { profile, style, query: style ? `?style=${style}` : "" };
}
