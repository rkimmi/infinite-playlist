import type { MusicProvider } from "@infinite-playlist/shared-types";

export interface Playlist {
  id: string;
  name: string;
  // TODO relate to playlist hosts via association table
  providerIds: Partial<Record<MusicProvider, string>>;
  tracks: PlaylistTrack[];
  description: string;
}

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
  providerIds: Partial<Record<MusicProvider, string>>;
}
