export type MusicProvider = "spotify" | "apple" | "tidal";

export interface Track {
  id: string;
  provider: MusicProvider;
  title: string;
  artist: string;
  durationMs: number;
}
