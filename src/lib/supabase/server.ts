import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClientBase } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Acts as the signed-in user (reads their session cookie), so RLS still applies.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            // Called from a Server Component, which can't set cookies.
            // Session refresh will happen in proxy.ts once auth is added.
          }
        },
      },
    },
  );
}

// Admin client: uses the secret key and BYPASSES row-level security.
// Server-only. Use it only for work no user session can do (the forecast engine
// writing forecast runs, reading connection_secrets). Never pass its results
// to the browser without filtering by user_id first.
export function createAdminClient() {
  return createAdminClientBase(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
