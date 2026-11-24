export const MUSIC_PROVIDERS = ["spotify", "tidal", "apple_music"] as const;
export type MusicProvider = (typeof MUSIC_PROVIDERS)[number];

export const AUTH_PROVIDERS = ["credential", "apple", "spotify", "tidal"] as const;
export type AuthProvider = (typeof AUTH_PROVIDERS)[number];

/**
 * Login providers whose login also grants music library access.
 */
export const AUTH_TO_MUSIC_PROVIDER: Partial<Record<AuthProvider, MusicProvider>> = {
  spotify: "spotify",
  tidal: "tidal",
};

export function toMusicProvider(authProvider: string | null | undefined): MusicProvider | null {
  return AUTH_TO_MUSIC_PROVIDER[authProvider as AuthProvider] ?? null;
}

export interface Track {
  id: string;
  provider: MusicProvider;
  title: string;
  artist: string;
  durationMs: number;
}
