// src/middleware.ts

// Re-export the default middleware function from next-auth
// This automatically handles session checking and redirects
export { default } from "next-auth/middleware";

// Configure which routes are protected by this middleware
export const config = {
  // Apply middleware only to these specific routes
  matcher: [
    // '/home',
    // '/settings',
    // '/room/:path*', // Matches /room/anything
  ],
}; 