import { Playlist, PlaylistTrack, Provider } from "../../types/playlist.types";
import { IAudioProvider, TrackSearchResult, CreatePlaylistRequest } from "./audio-provider.interface";

import { authClient } from "@/lib/auth-client";

const API_URL = "https://api.spotify.com/v1";

// TODO contract testing
type SpotifyTrack = {
  id: string;
  name: string;
  external_ids: { isrc: string };
  artists?: { name: string }[];
  album?: { name: string };
};

export class Spotify implements IAudioProvider {
  accountId: string | null = null;
  private ready: Promise<void>;
  constructor() {
    this.ready = this.getAccount();
  }

  playback(trackId: string): Promise<void> {
    throw new Error("Spotify playback not implemented.");
  }

  async dispose(): Promise<void> {
    if (!window.MusicKit) return;
    await window.MusicKit?.unauthorize();
    return;
  }

  async searchTracks(query: string | null = null, isrc: string | null = null): Promise<TrackSearchResult[]> {
    if (!query && !isrc) {
      throw new Error("Need query or isrc for spotify lookup")
    }
    try {
      const token = await this.getToken();
      // TODO handle unauthorised
      if (!token) return [];
      const q = isrc ? `isrc:${isrc}` : query!;
      const response = await fetch(`${API_URL}/search?q=${encodeURIComponent(q)}&type=track`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) {
        console.error(await response.json().catch(() => response.statusText));
        return [];
      }
      const { tracks } = await response.json();
      if (!tracks) return [];
      // TODO handle fetch + append remaining results
      const hasMoreResults = tracks.items?.length < tracks.total;
      const nextUrl = hasMoreResults ? tracks.next : null;
      const songs = this.mapResults(tracks.items);
      console.log("next page results?: " + nextUrl);
      return songs;
    } catch (err) {
      console.error(err);
      return [];
    }
  }

  async createPlaylist(playlistReq: CreatePlaylistRequest): Promise<string | null> {
    const token = await this.getToken();

    // TODO contract testing, type response SpotifyPlaylistResponse
    const playlist = await fetch(`${API_URL}/me/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      // TODO type requests
      body: JSON.stringify({
        name: `Infinite Playlist spike ${new Date().toLocaleDateString()}`,
      }),
    });

    const { id: spotifyPlaylistId } = await playlist.json().catch((err) => {
      console.error(err);
      return null;
    });

    if (playlistReq.trackIds.length) await this.addTracks(spotifyPlaylistId, playlistReq.trackIds);

    return spotifyPlaylistId;
  }

  async updatePlaylist(id: string, playlist: Playlist): Promise<string> {
    // TODO handle removed tracks, update order
    console.error("update playlist not yet implemented");
    return "test";
  }

  async matchTracks(tracks: PlaylistTrack[]): Promise<{ tracks: PlaylistTrack[], missingTracks: PlaylistTrack[] }> {
    const matched: PlaylistTrack[] = [];
    const missingTracks: PlaylistTrack[] = [];

    for (const t of tracks) {
      // searchTracks catches its own errors and returns [] on failure
      const spotifyTracks = await this.searchTracks(null, t.track.isrc);
      if (!spotifyTracks.length) {
        missingTracks.push(t);
        continue;
      }

      if (spotifyTracks.length > 1) {
        // TODO fix: Match on album name
        console.warn(`multiple tracks matched isrc: ${t.track.isrc} for Spotify lookup, selecting first result`);
      }

      matched.push({
        ...t,
        track: {
          ...t.track,
          providerIds: {
            ...t.track.providerIds,
            Spotify: spotifyTracks[0].id,
          },
        },
      });
    }

    return { tracks: matched, missingTracks };
  }

  public async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    const token = await this.getToken()
    const spotifyUris = trackIds.map(id => `spotify:track:${id}`);
    console.log(spotifyUris)

    const res = await fetch(`${API_URL}/playlists/${playlistId}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [...spotifyUris],
          // TODO handle insert position
          position: 0
        }),
    });

    if (!res.ok) {
      console.error(await res.json().catch(() => res.statusText))
      throw new Error("Spotify: Failed to add tracks to playlist");
    }

    return ;
  }

  private async getAccount() {
    try {
      const { data: accounts } = await authClient.listAccounts();

      const account = accounts?.find((account: any) => account.providerId === "spotify");
      this.accountId = account.accountId;
    } catch (e: any) {
      console.log(e);
    }
  }

  private getToken = async (): Promise<string> => {
    await this.ready;
    const res = await authClient.getAccessToken({
      accountId: this.accountId,
      providerId: "spotify",
    });
    return res.data.accessToken;
  };

  private mapResults(tracks: SpotifyTrack[]): TrackSearchResult[] {
    console.log(tracks)
    return tracks.map((track) => ({
      id: track.id,
      isrc: track.external_ids.isrc,
      provider: Provider.Spotify,
      attributes: {
        name: track.name,
        artistName: track?.artists?.[0]?.name ?? "",
        albumName: track?.album?.name,
      },
    }));
  }
}
