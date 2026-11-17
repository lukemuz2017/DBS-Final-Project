import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Next 16 "proxy" (formerly middleware). Clerk reads the session on every request;
// only the signed-in app (/app/...) requires it. The public demo (/dashboard/...)
// and the proposal at "/" stay open.
const isSignedInApp = createRouteMatcher(["/app(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Signed out: send people to our sign-in page (on Vercel, protect() otherwise
  // answers 404 because the server side doesn't know where sign-in lives).
  if (isSignedInApp(req)) await auth.protect({ unauthenticatedUrl: new URL("/sign-in", req.url).toString() });
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params.
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes.
    "/(api|trpc)(.*)",
  ],
};
