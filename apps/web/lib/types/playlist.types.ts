export interface Playlist {
  id: string;
  name: string;
  // TODO relate to playlist hosts via association table
  providerIds: Partial<Record<ProviderKey, string>>;
  tracks: PlaylistTrack[];
  description: string;
}

export enum Provider {
  Spotify = "spotify",
  Apple = "apple",
  Tidal = "tidal",
}

export type ProviderKey = keyof typeof Provider;

export interface PlaylistTrack {
  id: string;
  playlist_id: string;
  track: Track;
  position: number;
}

export interface Track {
  id: string;
  isrc: string;
  name: string;
  artistName: string;
  albumName: string;
  providerIds: Partial<Record<ProviderKey, string>>;
}
