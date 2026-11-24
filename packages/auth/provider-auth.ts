import { and, eq } from "drizzle-orm";
import { toMusicProvider, type MusicProvider } from "@infinite-playlist/shared-types";

import { db } from "@infinite-playlist/db";

import { providerAuthorisation } from "./provider-auth-schema";

/**
 * Authorises the music provider for a login account, if its login grants
 * music access (Spotify, Tidal). Does nothing if already authorised.
 */
export async function authoriseFromLoginAccount(loginAccount: {
  id: string;
  userId: string;
  providerId: string;
}) {
  const provider = toMusicProvider(loginAccount.providerId);
  if (!provider) return;

  await db
    .insert(providerAuthorisation)
    .values({
      userId: loginAccount.userId,
      provider,
      tokenSource: "login_account",
      accountId: loginAccount.id,
    })
    .onConflictDoNothing();
}

/** Music providers the user has authorised. Anything missing needs authorising. */
export async function listAuthorisedProviders(
  userId: string,
): Promise<MusicProvider[]> {
  const rows = await db
    .select({ provider: providerAuthorisation.provider })
    .from(providerAuthorisation)
    .where(eq(providerAuthorisation.userId, userId));
  return rows.map((r) => r.provider);
}

/**
 * Removes authorisation to a music provider.
 */
export async function removeProviderAuthorisation(
  userId: string,
  provider: MusicProvider,
) {
  await db
    .delete(providerAuthorisation)
    .where(
      and(
        eq(providerAuthorisation.userId, userId),
        eq(providerAuthorisation.provider, provider),
      ),
    );
}
