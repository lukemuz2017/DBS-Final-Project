import { SignIn } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell, AuthCardPlaceholder } from "@/components/AuthShell";

export const metadata = { title: "Sign in · Runway" };

export default function SignInPage() {
  return (
    <AuthShell title="Welcome back.">
      {/* Clerk reads the URL, so it streams in after the page shell (Next 16). */}
      <Suspense fallback={<AuthCardPlaceholder />}>
        <SignIn />
      </Suspense>
    </AuthShell>
  );
}
