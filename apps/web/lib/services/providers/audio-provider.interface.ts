import { Provider, Playlist, PlaylistTrack } from "../../types/playlist.types";

export type TrackSearchResult = {
  id: string;
  isrc: string;
  provider: Provider;
  attributes: { name: string; artistName?: string; albumName?: string };
}

export type CreatePlaylistRequest = {
  name: string;
  description: string;
  trackIds: string[];
}

export type UpdatePlaylistRequest = {
  name: string;
  id: string;
  trackUris: string[];
}

export interface IAudioProvider {
  searchTracks(query: string | null, isrc: string | null): Promise<TrackSearchResult[]>;
  createPlaylist(playlist: CreatePlaylistRequest): Promise<string | null>;
  matchTracks(tracks: PlaylistTrack[]): Promise<{ tracks: PlaylistTrack[], missingTracks: PlaylistTrack[] }>;
  updatePlaylist(id: string, playlist: Playlist): Promise<string | null>;
  addTracks(playlistId: string, trackIds: string[]): Promise<void>;
  playback(trackId: string): Promise<void>
  dispose(): Promise<void>;
}
