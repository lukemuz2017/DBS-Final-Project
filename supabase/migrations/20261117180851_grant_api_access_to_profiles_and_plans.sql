-- New Supabase projects don't expose new tables to the Data API automatically, so the
-- app's requests were refused (42501, insufficient privilege). Grant table access to
-- signed-in users only; the RLS policies from the previous migration still limit each
-- user to their own rows. Signed-out visitors (anon) get no access.

grant select, insert, update, delete on table public.profiles to authenticated;
grant select, insert, update, delete on table public.plans to authenticated;

-- Server-only admin client (secret key). It bypasses RLS; used only for work no user
-- session can do.
grant select, insert, update, delete on table public.profiles to service_role;
grant select, insert, update, delete on table public.plans to service_role;
