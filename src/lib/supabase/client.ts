import { createBrowserClient } from "@supabase/ssr";

// Supabase client for Client Components. Uses the publishable key, so every
// query is limited by row-level security to the signed-in user's rows.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
