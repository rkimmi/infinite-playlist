import { betterAuth } from "better-auth";
import { genericOAuth } from "better-auth/plugins";
import { dash } from "@better-auth/infra";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { importPKCS8, SignJWT } from "jose";

import { db } from "@infinite-playlist/db";

import * as schema from "./auth-schema.ts";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  socialProviders: {
    apple: async () => ({
      clientId: process.env.APPLE_CLIENT_ID as string,
      clientSecret: await generateAppleClientSecret(
        process.env.APPLE_CLIENT_ID as string,
        process.env.APPLE_TEAM_ID as string,
        process.env.APPLE_KEY_ID as string,
        process.env.APPLE_PRIVATE_KEY as string,
      ),
    }),
    spotify: {
      clientId: process.env.SPOTIFY_CLIENT_ID as string,
      clientSecret: process.env.SPOTIFY_CLIENT_SECRET as string,
      scope: ["playlist-modify-public"],
    },
  },
  trustedOrigins: ["https://appleid.apple.com", "https://dev.mixtaped.io:3000"],
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["apple", "spotify", "tidal"],
    },
  },
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    requireEmailVerification: true,
  },
  // TODO handle email verification
  emailVerification: {
    sendOnSignUp: true,
    sendVerificationEmail: async ({ user, url }) => {
      // TODO configure email service
      console.log("VERIFY URL:", url);
    },
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
    // TIDAL OAUTH CONFIG
    genericOAuth({
      config: [
        {
          providerId: "tidal",
          clientId: process.env.TIDAL_CLIENT_ID!,
          clientSecret: process.env.TIDAL_CLIENT_SECRET!,
          authorizationUrl: "https://login.tidal.com/authorize",
          tokenUrl: "https://auth.tidal.com/v1/oauth2/token",
          redirectURI: "https://dev.mixtaped.io:3000/api/auth/callback/tidal",
          scopes: [
            "user.read",
            "search.read",
            "entitlements.read",
            "playlists.read",
            "playlists.write",
          ],
          pkce: true,
          getUserInfo: async (tokens) => {
            const response = await fetch(
              "https://openapi.tidal.com/v2/users/me",
              {
                headers: {
                  Authorization: `Bearer ${tokens.accessToken}`,
                },
              },
            );

            const profile = await response.json();
            const attributes = profile.data.attributes;

            return {
              id: profile.data.id,
              name: attributes.username,
              email: attributes.email,
              emailVerified: attributes.emailVerified,
            };
          },
        },
      ],
    }),
  ],
});

async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKeyRaw: string,
) {
  const key = await importPKCS8(privateKeyRaw, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}
