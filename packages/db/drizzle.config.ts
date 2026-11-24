import dotenv from "dotenv";
import { defineConfig } from "drizzle-kit";

dotenv.config({
  path: ".env",
});

export default defineConfig({
  dialect: "postgresql",
  schema: [
    "../auth/auth-schema.ts",
    "../auth/provider-auth-schema.ts",
    "./src/schema.ts",
  ],
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
