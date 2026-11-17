"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

// Supabase client for Client Components, signed in as the current Clerk user.
// Supabase trusts Clerk's session token (Third-Party Auth), so row-level security
// limits every query to this user's rows. Uses the publishable key only.
export function useSupabase() {
  const { session } = useSession();
  return useMemo(
    () =>
      createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
        accessToken: async () => (await session?.getToken()) ?? null,
      }),
    [session],
  );
}
