import { createAdminClient } from "@/lib/supabase/server";

// Development-only check that the Supabase settings are present and work.
// Reports yes/no and status codes only; never returns key values.
export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
  const secretKey = process.env.SUPABASE_SECRET_KEY ?? "";

  const env = {
    urlSet: url.length > 0,
    urlLooksLikeProjectUrl: /^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(url),
    publishableKeySet: publishableKey.length > 0,
    publishableKeyKind: publishableKey.startsWith("sb_publishable_") ? "publishable" : publishableKey ? "legacy-or-other" : "missing",
    secretKeySet: secretKey.length > 0,
    secretKeyKind: secretKey.startsWith("sb_secret_") ? "secret" : secretKey ? "legacy-or-other" : "missing",
  };

  // Publishable key: the auth settings endpoint rejects requests without a valid key.
  let publishableKeyCheck: number | string = "skipped";
  if (env.urlSet && env.publishableKeySet) {
    try {
      const res = await fetch(`${url.replace(/\/$/, "")}/auth/v1/settings`, {
        headers: { apikey: publishableKey },
        cache: "no-store",
      });
      publishableKeyCheck = res.status;
    } catch {
      publishableKeyCheck = "unreachable";
    }
  }

  // Secret key: an admin call that only a valid secret key can make.
  let secretKeyCheck: string = "skipped";
  if (env.urlSet && env.secretKeySet) {
    const { error } = await createAdminClient().auth.admin.listUsers({ page: 1, perPage: 1 });
    secretKeyCheck = error ? `error: ${error.status ?? ""} ${error.name}` : "ok";
  }

  return Response.json({ env, publishableKeyCheck, secretKeyCheck });
}
