"use client";

// A signed-in user's profile and plan, loaded from and saved to Supabase (RLS keeps
// every query to their own rows). Edits apply on screen at once and save shortly after.
// Logs never include money or descriptions: only ids and error codes.

import { useAuth } from "@clerk/nextjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSupabase } from "../supabase/client";
import type { Profile } from "../types";
import { planDataOf, PLAN_SCHEMA_VERSION, profileColumns, todayIn, toProfile, validatePlanData, type ProfileRow } from "./planData";
import type { ProfileStore } from "./types";

export type UserProfileState =
  | { status: "loading" }
  | { status: "error"; message: string; retry: () => void }
  | { status: "new"; create: (p: Profile, timezone: string) => Promise<void> }
  | { status: "ready"; store: ProfileStore; saveError: string | null };

const SAVE_DELAY_MS = 600;

export function useUserProfile(): UserProfileState {
  const { isLoaded, userId } = useAuth();
  const supabase = useSupabase();
  const [phase, setPhase] = useState<"loading" | "error" | "new" | "ready">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const timezone = useRef("America/Chicago");
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isLoaded || !userId) return;
    let cancelled = false;
    (async () => {
      const prof = await supabase.from("profiles").select("*").maybeSingle<ProfileRow>();
      if (cancelled) return;
      if (prof.error) {
        console.error("[runway] load profile failed", prof.error.code);
        setErrorMessage("We couldn't load your account. Check your connection and try again.");
        setPhase("error");
        return;
      }
      if (!prof.data || !prof.data.onboarded_at) {
        setPhase("new");
        return;
      }
      const plan = await supabase.from("plans").select("data").maybeSingle<{ data: unknown }>();
      if (cancelled) return;
      try {
        if (plan.error) throw new Error(plan.error.code);
        timezone.current = prof.data.timezone;
        setProfile(toProfile(prof.data, validatePlanData(plan.data?.data), todayIn(prof.data.timezone)));
        setPhase("ready");
      } catch (e) {
        console.error("[runway] load plan failed", e instanceof Error ? e.message.slice(0, 60) : "unknown");
        setErrorMessage("Your saved plan couldn't be read. Nothing was changed; try again or contact us.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, userId, supabase, attempt]);

  const save = useCallback(
    async (p: Profile) => {
      if (!userId) return;
      const a = await supabase.from("profiles").update(profileColumns(p)).eq("user_id", userId);
      const b = await supabase.from("plans").upsert({ user_id: userId, data: planDataOf(p), schema_version: PLAN_SCHEMA_VERSION });
      const err = a.error ?? b.error;
      if (err) console.error("[runway] save failed", err.code);
      setSaveError(err ? "Your last change didn't save. It will retry with your next change." : null);
    },
    [supabase, userId],
  );

  const update = useCallback(
    (fn: (p: Profile) => Profile) => {
      setProfile((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        if (pending.current) clearTimeout(pending.current);
        pending.current = setTimeout(() => void save(next), SAVE_DELAY_MS);
        return next;
      });
    },
    [save],
  );

  const create = useCallback(
    async (p: Profile, tz: string) => {
      if (!userId) return;
      const a = await supabase.from("profiles").upsert({ user_id: userId, ...profileColumns(p), timezone: tz, onboarded_at: new Date().toISOString() });
      const b = a.error ? a : await supabase.from("plans").upsert({ user_id: userId, data: planDataOf(p), schema_version: PLAN_SCHEMA_VERSION });
      if (a.error || b.error) {
        console.error("[runway] create failed", (a.error ?? b.error)!.code);
        throw new Error("We couldn't save your setup. Check your connection and try again.");
      }
      timezone.current = tz;
      setProfile({ ...p, today: todayIn(tz) });
      setPhase("ready");
    },
    [supabase, userId],
  );

  const deleteAll = useCallback(async () => {
    if (!userId) return;
    // Deleting the profile also deletes the plan (on delete cascade).
    const { error } = await supabase.from("profiles").delete().eq("user_id", userId);
    if (error) {
      console.error("[runway] delete failed", error.code);
      throw new Error("We couldn't delete your data. Try again.");
    }
    setProfile(null);
    setPhase("new");
  }, [supabase, userId]);

  useEffect(() => () => {
    if (pending.current) clearTimeout(pending.current);
  }, []);

  if (phase === "error") return { status: "error", message: errorMessage, retry: () => { setPhase("loading"); setAttempt((n) => n + 1); } };
  if (phase === "new") return { status: "new", create };
  if (phase === "ready" && profile) return { status: "ready", store: { profile, update, edited: false, mode: "user", deleteAll }, saveError };
  return { status: "loading" };
}
