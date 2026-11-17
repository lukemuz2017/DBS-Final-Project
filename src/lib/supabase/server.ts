import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Supabase client for Server Components, Server Actions and Route Handlers, signed
// in as the current Clerk user (Supabase trusts Clerk's session token), so RLS
// still applies. Call auth()-dependent code inside <Suspense> (cacheComponents).
export function createClient() {
  return createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    accessToken: async () => (await auth()).getToken(),
  });
}

// Admin client: uses the secret key and BYPASSES row-level security.
// Server-only. Use it only for work no user session can do (the forecast engine
// writing forecast runs, reading connection_secrets). Never pass its results
// to the browser without filtering by user_id first.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
