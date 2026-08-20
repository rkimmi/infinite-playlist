import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@infinite-playlist/db";
import { dash } from "@better-auth/infra";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  plugins: [
    dash({
      apiKey: process.env.BETTER_AUTH_API_KEY,
    }),
  ],
});
