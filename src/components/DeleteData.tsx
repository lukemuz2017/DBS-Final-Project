"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Signed-in users: delete everything saved for this account (profile, plan, money rules).
// The sign-in itself (Clerk) stays, so they can set up again.
export function DeleteData({ onDelete }: { onDelete: () => Promise<void> }) {
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  return (
    <section className="mt-5 rounded-2xl border border-warn/30 bg-warn-soft/40 p-4">
      <h3 className="text-sm font-bold">Delete my data</h3>
      <p className="mt-1 text-sm text-muted">Removes your accounts, income, bills, goals and money rules from Runway. This can&apos;t be undone.</p>
      {confirm ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold">Delete everything for good?</span>
          <button
            type="button"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await onDelete();
                router.replace("/app");
              } catch (e) {
                setError(e instanceof Error ? e.message : "Couldn't delete.");
                setBusy(false);
              }
            }}
            className="rounded-lg bg-warn px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
          >
            {busy ? "Deleting…" : "Yes, delete"}
          </button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded-lg px-3 py-1.5 text-xs font-bold text-muted hover:text-ink">Cancel</button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)} className="mt-3 rounded-lg px-3 py-1.5 text-xs font-bold text-warn ring-1 ring-warn/40 hover:bg-warn-soft">Delete my data…</button>
      )}
      {error && <p className="mt-2 text-sm font-bold text-warn" role="alert">{error}</p>}
    </section>
  );
}
