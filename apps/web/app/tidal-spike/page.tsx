"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

const API_URL = "https://openapi.tidal.com/v2/";

interface Song {
  id: string;
  isrc: string;
  attributes: { name: string; artistName?: string; albumName?: string };
}

type TidalTrack = {
  id: string;
  attributes: { title: string; isrc: string };
  relationships: {
    artists?: { data: { id: string } };
    albums?: { data: { id: string } };
  };
};

export default function TidalSpikePage() {
  const [term, setTerm] = useState("daft punk");
  const [tidalAccountId, setTidalAccountId] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [results, setResults] = useState<Song[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const search = async () => {
    try {
      const token = await getTidalToken();
      if (!token) return;
      // First call, search
      const params = new URLSearchParams({
        "filter[query]": term,
        explicitFilter: "INCLUDE",
        includeMedia: "songs",
      });
      const response = await fetch(`${API_URL}searchResults?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const { data: searchResults } = await response.json();

      if (!searchResults[0]) return;

      // Second call, get song resources ids
      const resourceId = searchResults[0].id;
      console.log(resourceId);

      const trackLookupRes = await fetch(
        `${API_URL}searchResults/${resourceId}/relationships/tracks`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      const { data: tracks } = await trackLookupRes.json();
      const trackIds = tracks.map((track) => track.id);

      // Third call, get song as resources
      const trackInfoParams = new URLSearchParams({
        "filter[id]": trackIds,
        include: ["albums", "artists"],
      });

      const tracksInfoRes = await fetch(`${API_URL}tracks?${trackInfoParams}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const { data: tracksInfo } = await tracksInfoRes.json();

      if (!tracksInfo) return;

      // Song title, id and isrc set only, album and artist info fetched below
      const songs = mapResultsToSong(tracksInfo);
      setResults(songs);

      const tracksToArtistsIds = Object.fromEntries(
        tracksInfo.map((track) => [
          track.id,
          track.relationships.artists.data.map((a) => a.id),
        ]),
      );

      const tracksToAlbumIds = Object.fromEntries(
        tracksInfo.map((track) => [
          track.id,
          track.relationships.albums.data.map((a) => a.id),
        ]),
      );

      const artistIds = dedupeIds(
        [...Object.values(tracksToArtistsIds)].flat(),
      );

      const albumIds = dedupeIds([...Object.values(tracksToAlbumIds)].flat());

      const getArtistsTask = new Promise(() => getArtists(artistIds));
      const getAlbumsTask = new Promise(() => getAlbums(albumIds));

      await Promise.all([getArtistsTask, getAlbumsTask]).then(
        ([artists, albums]) => {
          // TODO update songs with artist, album
          console.log(artists);
          console.log(albums);
        },
      );
    } catch (err) {
      console.error(err);
    }
  };

  const dedupeIds = (ids: string[]): string[] => {
    const unique = new Set(ids);
    return Array.from(unique);
  };

  // TODO return album id -> name mapping
  const getAlbums = async (albumIds: string[]): void => {
    if (!albumIds) {
      console.warn("no album resources to fetch");
      return;
    }

    const token = await getTidalToken();

    const params = new URLSearchParams({
      "filter[id]": albumIds,
    });

    const albumsRes = await fetch(`${API_URL}albums?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const { data: albums } = await albumsRes.json();
    console.log(albums);
  };

  // TODO return artist id -> name mapping
  const getArtists = async (artistIds: string[]): void => {
    console.log(artistIds);
    if (!artistIds) {
      console.error("no ids");
    }

    const token = await getTidalToken();

    const params = new URLSearchParams({
      "filter[id]": artistIds,
    });

    const artistsRes = await fetch(`${API_URL}artists?${params}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const { data: artists } = await artistsRes.json();
    console.log(artists);
    // 	TODO: format output -> Record<artist id, name>
  };

  const mapResultsToSong = (tracks: TidalTrack[]): Song[] => {
    return tracks.map((track: TidalTrack) => {
      const {
        relationships: {
          artists: { data: artistsData },
          albums: { data: albumData },
        },
      } = track;

      return {
        id: track.id,
        isrc: track.attributes.isrc,
        attributes: {
          name: track.attributes.title,
          artistName: artistsData?.[0]?.name ?? "",
          albumName: albumData?.[0]?.name ?? "",
        },
      };
    });
  };

  const getTidalToken = async () => {
    const res = await authClient.getAccessToken({
      accountId: tidalAccountId,
      providerId: "tidal",
    });
    return res.data.accessToken;
  };

  const createPlaylist = async () => {
    const token = await getTidalToken();

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

    if (id) setPlaylistId(id);
    say(`▶ playlist created — ${id}: ${name}`);
  };

  const addTrack = async (song: Song) => {
    const token = await getTidalToken();

    if (!playlistId) return say("create a playlist first");
    try {
      await fetch(`${API_URL}playlists/${playlistId}/relationships/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          data: [
            {
              id: song.id,
              meta: {
                addedAt: new Date(),
              },
              type: "tracks",
            },
          ],
          //meta: {
          //positionBefore: "0",
          //},
        }),
      });

      say(`＋ added "${song.attributes.name}" to playlist`);
    } catch (err) {
      say(`add track failed: ${(err as Error).message}`);
    }
  };

  async function play(song: Song) {
    try {
      console.log(song);
      say(`▶ ${song.attributes.artistName} — ${song.attributes.name}`);
    } catch (err) {
      say(
        `play failed (subscription required for full tracks): ${(err as Error).message}`,
      );
    }
  }

  const say = (msg: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);

  useEffect(() => {
    async function configure() {
      console.log("configuring - getting tidal account id");
      try {
        const { data: accounts, error } = await authClient.listAccounts();

        if (error) {
          throw new Error(error.message);
        }

        const account = accounts?.find(
          (account) => account.providerId === "tidal",
        );

        setTidalAccountId(account.accountId);
      } catch (err) {}
    }
    if (!tidalAccountId) configure();
  });

  return (
    <main>
      <h1>Tidal music spike</h1>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "1rem 0" }}
      >
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="search songs"
          style={{ padding: "4px 8px" }}
        />
        <button onClick={search} disabled={!tidalAccountId}>
          2 · Search
        </button>
        <button onClick={createPlaylist} disabled={!tidalAccountId}>
          4 · Create playlist
        </button>
        <p style={{ color: "#666", fontSize: 13 }}>
          authorized: {tidalAccountId} · playlist: {playlistId ?? "none"}
        </p>
      </div>
      <ol>
        {results.map((song) => (
          <li key={song.id} style={{ margin: "6px 0" }}>
            {song.attributes.artistName} — {song.attributes.name}{" "}
            <button onClick={() => play(song)}>3 · ▶ play</button>{" "}
            <button onClick={() => addTrack(song)} disabled={!playlistId}>
              5 · ＋ add
            </button>
          </li>
        ))}
      </ol>

      <h3>Log</h3>
      <pre
        style={{
          background: "#f5f5f4",
          padding: 12,
          borderRadius: 6,
          fontSize: 12,
          whiteSpace: "pre-wrap",
        }}
      >
        {log.join("\n")}
      </pre>
    </main>
  );
}
