import NextAuth from "next-auth";
import { OAuthUserConfig } from "next-auth/providers/oauth";
import TwitterProvider, { TwitterLegacyProfile, TwitterProfile } from "next-auth/providers/twitter";

export const authOptions = {
  // Configure one or more authentication providers
  providers: [
    TwitterProvider({
      // Note: Using v1.0a for Twitter OAuth. Update if using v2.
      // Ensure these environment variables are set!
      clientId: process.env.TWITTER_CLIENT_ID!,
      clientSecret: process.env.TWITTER_CLIENT_SECRET!,
      version: "2.0", // Use this line if you're using Twitter OAuth 2.0
      
    }),
    // ...add more providers here if needed
  ],
  // Use this callback to add the user id to the session
  callbacks: {
    session: ({ session, token }: { session: any, token: any }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
      },
    }),
  },

  secret: process.env.NEXTAUTH_SECRET,
  // Update the pages configuration
  pages: {
    signIn: '/signin', // Redirect users to /signin page
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 