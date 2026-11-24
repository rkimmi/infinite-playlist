import { and, eq } from "drizzle-orm";
import { symmetricDecrypt, symmetricEncrypt } from "better-auth/crypto";
import type { MusicProvider } from "@infinite-playlist/shared-types";

import { db } from "@infinite-playlist/db";

import { auth } from "./auth";
import { providerAuthorisation } from "./provider-auth-schema";

/**
 * Gets a usable access token for a user's music provider.
 * Returns null when the provider isn't authorised.
 */
export async function getMusicAccessToken(
  userId: string,
  provider: MusicProvider,
): Promise<string | null> {
  const [row] = await db
    .select()
    .from(providerAuthorisation)
    .where(
      and(
        eq(providerAuthorisation.userId, userId),
        eq(providerAuthorisation.provider, provider),
      ),
    )
    .limit(1);

  if (!row) return null;

  switch (row.tokenSource) {
    case "login_account": {
      // better-auth decrypts the account's token, refreshing and saving it if expired.
      const { accessToken } = await auth.api.getAccessToken({
        body: { accountId: row.accountId!, userId },
      });
      return accessToken ?? null;
    }
    case "stored": {
      const { secretConfig } = await auth.$context;
      return symmetricDecrypt({ key: secretConfig, data: row.storedToken! });
    }
  }
}

/**
 * Saves a token for a provider that's authorised separately from login
 * (Apple Music user token). Encrypted with better-auth's secret config, so
 * BETTER_AUTH_SECRETS rotation covers it too.
 */
export async function saveStoredToken(
  userId: string,
  provider: MusicProvider,
  token: string,
) {
  const { secretConfig } = await auth.$context;
  const storedToken = await symmetricEncrypt({ key: secretConfig, data: token });

  await db
    .insert(providerAuthorisation)
    .values({ userId, provider, tokenSource: "stored", storedToken })
    .onConflictDoUpdate({
      target: [providerAuthorisation.userId, providerAuthorisation.provider],
      set: {
        tokenSource: "stored",
        storedToken,
        accountId: null,
        updatedAt: new Date(),
      },
    });
}
