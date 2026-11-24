import { Playlist, PlaylistTrack } from "../../types/playlist.types";
import { CreatePlaylistRequest, IAudioProvider, TrackSearchResult } from "./audio-provider.interface";
import { authClient } from "@/lib/auth-client";

const API_URL = "https://openapi.tidal.com/v2/";

type TidalTrack = {
  id: string;
  attributes: { title: string; isrc: string };
  relationships: {
    artists?: { data: { id: string, name: string }[] };
    albums?: { data: { id: string, name: string }[] };
  };
};

export class Tidal implements IAudioProvider {
  accountId: string | null = null;
  private ready: Promise<void>;
  constructor() {
    this.ready = this.getAccount();
  }
  playback(trackId: string): Promise<void> {
    throw new Error("Tidal playback not yet implemented.");
  }

  async searchTracks(query: string | null, isrc: string | null): Promise<TrackSearchResult[]> {
    if (!query && !isrc) {
      throw new Error("Need query or isrc for tidal lookup")
    }
    const token = await this.getToken();
    if (!token) return [];

    // ISRC lookup: single call, /tracks supports filter[isrc] directly
    if (isrc) {
      return this.getTracks("filter[isrc]", [isrc]);
    }

    // Free-text search, first call: get the search results resource
    const params = new URLSearchParams({
      "filter[query]": query!,
      explicitFilter: "INCLUDE",
      includeMedia: "songs",
    });

    const response = await fetch(`${API_URL}searchResults?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    // TODO handle transient errors + retries
    if (!response.ok) {
      // TODO custom error, no resource
      throw new Error("Tidal: Cannot find search results resource");
    }

    const { data: searchResults } = await response.json();

    if (!searchResults?.[0]) return [];

    // Second call, get song resources ids
    const resourceId = searchResults[0].id;

    const trackLookupRes = await fetch(
      `${API_URL}searchResults/${resourceId}/relationships/tracks`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!trackLookupRes.ok) {
      // TODO custom error, no resource
      throw new Error("Tidal: Cannot find search result tracks");
    }

    const { data: tracks } = await trackLookupRes.json();
    const trackIds: string[] = (tracks ?? []).map((track: { id: string }) => track.id);

    // Third call, get song as resources
    return this.getTracks("filter[id]", trackIds);
  }

  // Fetch track resources by id or isrc, then enrich with artist + album names
  private async getTracks(filter: "filter[id]" | "filter[isrc]", values: string[]): Promise<TrackSearchResult[]> {
    if (!values.length) return [];

    const token = await this.getToken();
    const params = this.arrayParams(filter, values);
    params.append("include", "albums");
    params.append("include", "artists");

    const tracksInfoRes = await fetch(`${API_URL}tracks?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!tracksInfoRes.ok) {
      throw new Error(`Tidal: Failed to get tracks by ${filter}`);
    }

    const { data: tracksInfo } = await tracksInfoRes.json();

    if (!tracksInfo?.length) return [];

    // Song title, id and isrc set only, album and artist info fetched below
    const enrichedTracks = await this.enrichSongMetadata(tracksInfo);
    return this.mapResults(enrichedTracks);
  }

  async createPlaylist(playlist: CreatePlaylistRequest): Promise<string> {
    const token = await this.getToken();

    const response = await fetch(`${API_URL}playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        // TODO use mixtaped internal uuid for idempotency
        // Reused for safe-retry for mutation requests
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({
        data: {
          attributes: {
            name: `Infinite Playlist spike ${new Date().toLocaleDateString()}`,
            description: "Test created from mixtaped",
          },
          type: "playlists",
        },
      }),
    });

    const {
      data: {
        id,
        attributes: { name },
      },
    } = await response.json().catch((err) => console.error(err));

    return id;
  }

  async updatePlaylist(id: string, playlist: Playlist): Promise<string> {
    // TODO hande, add, remove and reorder tracks
    console.log("update playlist not yet implemented");
    return "test";
  }

  async matchTracks(tracks: PlaylistTrack[]): Promise<{ tracks: PlaylistTrack[], missingTracks: PlaylistTrack[] }> {
    const matched: PlaylistTrack[] = [];
    const missingTracks: PlaylistTrack[] = [];

    for (const t of tracks) {
      let tidalTracks: TrackSearchResult[] = [];
      try {
        tidalTracks = await this.searchTracks(null, t.track.isrc);
      } catch (err) {
        console.error(`Tidal lookup failed for isrc: ${t.track.isrc}`, err);
      }

      if (!tidalTracks.length) {
        missingTracks.push(t);
        continue;
      }

      if (tidalTracks.length > 1) {
        // TODO fix: Match on album name
        console.warn(`multiple tracks matched isrc: ${t.track.isrc} for tidalTracks lookup, selecting first result`);
      }

      matched.push({
        ...t,
        track: {
          ...t.track,
          providerIds: {
            ...t.track.providerIds,
            tidal: tidalTracks[0].id,
          },
        },
      });
    }

    return { tracks: matched, missingTracks };
  }

  async addTracks(playlistId: string, trackIds: string[]): Promise<void> {
    const token = await this.getToken();
    const trackData = trackIds.map((id) => ({
      id: id,
      meta: {
        addedAt: new Date(),
      },
      type: "tracks",
    }));

    const res = await fetch(`${API_URL}playlists/${playlistId}/relationships/items`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: trackData,
        // meta: {
        // positionBefore: "0",
        // },
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to add tracks to tidal playlist");
    }

    return;
  }

  private async enrichSongMetadata(tracksInfo: TidalTrack[]): Promise<TidalTrack[]> {
    const artistIds = this.getRelationshipIds(tracksInfo, "artists");
    const albumIds = this.getRelationshipIds(tracksInfo, "albums");

    let enrichedTracks = tracksInfo;

    try {
      const getArtistsTask = this.getArtists(artistIds);
      const getAlbumsTask = this.getAlbums(albumIds);

      const [artists, albums] = await Promise.all([getArtistsTask, getAlbumsTask]);
      enrichedTracks = tracksInfo.map((track) => ({
        ...track,
        relationships: this.enrichRelationships(
          track.relationships,
          artists,
          albums,
        ),
      }));

    } catch (error) {
      console.error("Error fetching artist or album info for tidal tracks");
      throw error;
    }

    return enrichedTracks;
  }

  private getRelationshipIds(
    tracks: TidalTrack[],
    relationship: "albums" | "artists",
  ): string[] {
    return this.dedupeIds(
      tracks.flatMap(
        (track) =>
          track.relationships?.[relationship]?.data.map((item) => item.id) ?? [],
      ),
    );
  }

  private enrichRelationships(
    relationships: TidalTrack["relationships"],
    artists: Record<string, string>,
    albums: Record<string, string>,
  ): TidalTrack["relationships"] {
    return {
      ...relationships,
      albums: {
        ...relationships?.albums,
        data: (relationships?.albums?.data ?? []).map((album) => ({
          ...album,
          name: albums[album.id],
        })),
      },
      artists: {
        ...relationships?.artists,
        data: (relationships?.artists?.data ?? []).map((artist) => ({
          ...artist,
          name: artists[artist.id],
        })),
      },
    };
  }

  private mapResults(tracks: TidalTrack[]): TrackSearchResult[] {
    return tracks.map((track: TidalTrack) => {
      const {
        relationships: {
          artists,
          albums,
        },
      } = track;

      console.log('artists data');
      console.log(artists?.data);
      const artistsData = artists?.data;
      const albumData = albums?.data;

      return {
        id: track.id,
        isrc: track.attributes.isrc,
        provider: "tidal",
        attributes: {
          name: track.attributes.title,
          // TODO clean up first pick
          artistName: artistsData?.[0]?.name ?? "",
          albumName: albumData?.[0]?.name ?? "",
        },
      };
    });
  };

  // TODO return album id -> name mapping
  private async getAlbums (albumIds: string[]): Promise<Record<string, string>> {
    if (!albumIds.length) {
      console.warn("no album resources to fetch");
      return {};
    }

    const token = await this.getToken();

    const params = this.arrayParams("filter[id]", albumIds);

    const albumsRes = await fetch(`${API_URL}albums?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!albumsRes.ok) {
      throw new Error("Failed to get albums for tidal lookup by albumIds")
    }

    const { data: albums } = await albumsRes.json();
    // TODO use SDK + type results
    return Object.fromEntries(
      albums.map((album) => [
        album.id,
        album.attributes?.title,
      ]),
    );
  };

  private async getArtists(artistIds: string[]): Promise<Record<string, string>> {
    if (!artistIds.length) {
      console.warn("no artist resources to fetch");
      return {};
    }

    const token = await this.getToken();

    const params = this.arrayParams("filter[id]", artistIds);

    const artistsRes = await fetch(`${API_URL}artists?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!artistsRes.ok) {
      throw new Error("Failed to get artists for tidal lookup by albumIds")
    }

    const { data: artists } = await artistsRes.json();
    console.log(artists);
    // TODO use SDK + type results
    return Object.fromEntries(
      artists.map((artist) => [
        artist.id,
        artist.attributes?.name,
      ]),
    );
  };

  private getToken = async () => {
    await this.ready;
    const res = await authClient.getAccessToken({
      accountId: this.accountId,
      providerId: "tidal",
    });
    return res.data.accessToken;
  };

  private async getAccount() {
    try {
      const { data: accounts } = await authClient.listAccounts();

      const account = accounts?.find((account: any) => account.providerId === "tidal");
      this.accountId = account.accountId;
    } catch (e: any) {
      console.log(e);
    }
  }

  // TIDAL's spec doesn't declare style/explode for array filters, so per the
  // OpenAPI default (form, explode=true) send repeated keys: filter[id]=a&filter[id]=b
  // NOTE: max 20 values per filter
  private arrayParams(key: string, values: string[]): URLSearchParams {
    const params = new URLSearchParams();
    values.forEach((v) => params.append(key, v));
    return params;
  }

  private dedupeIds(ids: string[]): string[] {
    const unique = new Set(ids);
    return Array.from(unique);
  };
}
