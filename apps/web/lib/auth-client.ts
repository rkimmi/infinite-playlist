import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins"
import type { auth } from "@infinite-playlist/auth"

export const authClient = createAuthClient({
  plugins: [
    inferAdditionalFields<typeof auth>()
  ]
});
export type Session = typeof authClient.$Infer.Session
export type User = typeof authClient.$Infer.Session.user
