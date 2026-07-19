import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/share/(.*)",
  "/public(.*)",
  "/api/health",
]);

export default clerkMiddleware(async (auth, req) => {
  try {
    if (!isPublicRoute(req)) {
      await auth.protect();
    }
  } catch (error) {
    console.error("Clerk Middleware Error:", error);
    throw error;
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
