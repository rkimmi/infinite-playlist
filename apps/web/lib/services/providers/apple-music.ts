import { Playlist, PlaylistTrack, Provider } from "../../types/playlist.types";
import { IAudioProvider, TrackSearchResult, CreatePlaylistRequest } from "./audio-provider.interface";

type MusicKitInstance = any;
declare global {
  interface Window {
    MusicKit?: any;
  }
}

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

type AppleTrack = {
  id: string;
  attributes: { name: string; artistName: string; isrc: string, albumName?: string };
}

export class AppleMusic implements IAudioProvider {
  private music: MusicKitInstance | null = null;
  private ready: Promise<void>;

  constructor() {
    this.ready = this.initMusicKit();
    // Avoid an unhandled rejection; methods awaiting `ready` still see the error
    this.ready.catch((err) => console.error(err));
  }

  async dispose(): Promise<void> {
    if (!window.MusicKit) return;
    await window.MusicKit?.unauthorize();
  }

  async playback(trackId: string): Promise<void> {
    await this.ready;
    return await this.music.setQueue({ song: trackId, startPlaying: true });
  }

  // Load MusicKit JS, then configure it with a token from our route.
  private async initMusicKit() {
    console.log('initing');
    const res = await fetch("/api/apple/developer-token");
    if (!res.ok) {
      throw new Error("Failed to fetch apple developer token")
    };

    const { token, error } = await res.json();
    if (error) throw new Error(error);

    const musicKitScript = document.querySelector(`script[src="${MUSICKIT_SRC}"]`);
    if (!musicKitScript) {
       await new Promise<void>((resolve, reject) => {
         const s = document.createElement("script");
         s.src = MUSICKIT_SRC;
         s.async = true;
         s.onload = () => resolve();
         s.onerror = () => reject(new Error("Failed to load MusicKit script"));
         document.head.appendChild(s);
       });
    // Expect window.musicKit to exist once script has loaded
     } else if (!window.MusicKit) {
         await new Promise<void>((resolve, reject) => {
           musicKitScript.addEventListener("load", () => resolve());
           musicKitScript.addEventListener("error", () => reject(new Error("Existing MusicKit script failed")));

           // Reject if load takes more than 10 seconds
           setTimeout(() => reject(new Error("MusicKit load timed out")), 10000);
         });
     }

    await window.MusicKit!.configure({
      developerToken: token,
      app: { name: "Infinite Playlist", build: "0.0.0" },
    });

    this.music = window.MusicKit!.getInstance();
  }

  async searchTracks(query: string | null = null, isrc: string | null = null): Promise<TrackSearchResult[]> {
    if (!query && !isrc) {
      throw new Error("Need query or isrc for apple music lookup");
    }
    await this.ready;
    const storefront = this.music.storefrontId || "us";

    if (isrc) {
      // ISRC lookup goes through the songs endpoint, not search
      const { data } = await this.music.api.music(
        `/v1/catalog/${storefront}/songs`,
        { "filter[isrc]": isrc },
      );
      return this.mapSearchResults(data?.data ?? []);
    }

    const { data } = await this.music.api.music(
      `/v1/catalog/${storefront}/search`,
      { term: query, types: ["songs"], limit: 10 },
    );
    return this.mapSearchResults(data?.results?.songs?.data ?? []);
  }

 async createPlaylist(playlist: CreatePlaylistRequest): Promise<string> {
    await this.ready;
    const tracks = playlist.trackIds.map(id => ({ id, type: "songs" }))
    const body = {
      attributes: {
        name: playlist.name,
        description: playlist.description,
      },
      relationships: tracks
    };
    const { data } = await this.music.api.music(
      "/v1/me/library/playlists",
      {},
      { fetchOptions: { method: "POST", body: JSON.stringify(body) } },
    );
   // TODO type
   const id = data?.data?.[0]?.id;
   return id;
  }

  updatePlaylist(id: string, playlist: Playlist): Promise<string> {
    console.log("create playlist not yet implemented");
    return Promise.resolve("test");
  }

  async matchTracks(tracks: PlaylistTrack[]): Promise<{ tracks: PlaylistTrack[], missingTracks: PlaylistTrack[] }> {
    const matched: PlaylistTrack[] = [];
    const missingTracks: PlaylistTrack[] = [];

    for (const t of tracks) {
      let appleTracks: TrackSearchResult[] = [];
      try {
        appleTracks = await this.searchTracks(null, t.track.isrc);
      } catch (err) {
        console.error(`Apple Music lookup failed for isrc: ${t.track.isrc}`, err);
      }

      if (!appleTracks.length) {
        missingTracks.push(t);
        continue;
      }

      if (appleTracks.length > 1) {
        // TODO fix: Match on album name
        console.warn(`multiple tracks matched isrc: ${t.track.isrc} for Apple Music lookup, selecting first result`);
      }

      matched.push({
        ...t,
        track: {
          ...t.track,
          providerIds: {
            ...t.track.providerIds,
            Apple: appleTracks[0].id,
          },
        },
      });
    }

    return { tracks: matched, missingTracks };
  }

 async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
   await this.ready;
   const tracks = trackIds.map(id => ({ id, type: "songs" }))
   return await this.music.api.music(
      `/v1/me/library/playlists/${playlistId}/tracks`,
      {},
      {
        fetchOptions: {
          method: "POST",
          body: JSON.stringify({ data: tracks }),
        },
      },
    );
  }

  private mapSearchResults(tracks: AppleTrack[]): TrackSearchResult[] {
    return tracks.map((track) => ({
      id: track.id,
      // TODO check this
      isrc: track.attributes.isrc,
      provider: Provider.Apple,
      attributes: {
        name: track.attributes.name,
        artistName: track?.attributes.artistName ?? "",
        albumName: track?.attributes.albumName,
      },
    }));
  }
}
