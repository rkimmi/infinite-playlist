import { relations, sql } from "drizzle-orm";
import { pgTable, text, timestamp, unique, check } from "drizzle-orm/pg-core";
import type { MusicProvider } from "@infinite-playlist/shared-types";

import { account, user } from "./auth-schema";

export type TokenSource = "login_account" | "stored";

/**
 * Which music providers a user has authorised the app to act on.
 * No row for a provider means it isn't authorised, so prompt the user.
 *
 * - `login_account`: the login is the authorisation (Spotify, Tidal). Tokens
 *   live on the linked `account` row, where better-auth refreshes them.
 * - `stored`: authorised separately from login (Apple Music). The encrypted
 *   token lives in `stored_token`.
 */
export const providerAuthorisation = pgTable(
  "provider_authorisation",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    provider: text("provider").$type<MusicProvider>().notNull(),
    tokenSource: text("token_source").$type<TokenSource>().notNull(),
    accountId: text("account_id")
      .unique()
      .references(() => account.id, { onDelete: "cascade" }),
    storedToken: text("stored_token"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    unique("provider_authorisation_user_provider_unique").on(
      table.userId,
      table.provider,
    ),
    check(
      "provider_authorisation_provider_check",
      sql`${table.provider} in ('spotify', 'tidal', 'apple_music')`,
    ),
    check(
      "provider_authorisation_token_source_check",
      sql`(${table.tokenSource} = 'login_account' and ${table.accountId} is not null and ${table.storedToken} is null)
        or (${table.tokenSource} = 'stored' and ${table.storedToken} is not null and ${table.accountId} is null)`,
    ),
  ],
);

export const providerAuthorisationRelations = relations(
  providerAuthorisation,
  ({ one }) => ({
    user: one(user, {
      fields: [providerAuthorisation.userId],
      references: [user.id],
    }),
    account: one(account, {
      fields: [providerAuthorisation.accountId],
      references: [account.id],
    }),
  }),
);
