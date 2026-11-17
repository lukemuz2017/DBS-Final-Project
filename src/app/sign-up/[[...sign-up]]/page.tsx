import { SignUp } from "@clerk/nextjs";
import { Suspense } from "react";
import { AuthShell, AuthCardPlaceholder } from "@/components/AuthShell";

export const metadata = { title: "Create your account · Runway" };

export default function SignUpPage() {
  return (
    <AuthShell title="See the next 12 weeks before they happen.">
      {/* Clerk reads the URL, so it streams in after the page shell (Next 16). */}
      <Suspense fallback={<AuthCardPlaceholder />}>
        <SignUp />
      </Suspense>
    </AuthShell>
  );
}
