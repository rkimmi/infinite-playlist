// Shared cross-cutting types for Infinite Playlist.

/** Supported music service providers. */
export type MusicProvider = "spotify" | "apple" | "tidal";

/** A track normalized across providers. */
export interface Track {
  id: string;
  provider: MusicProvider;
  title: string;
  artist: string;
  durationMs: number;
}
