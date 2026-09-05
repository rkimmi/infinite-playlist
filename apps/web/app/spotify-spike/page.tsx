"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

const API_URL = "https://api.spotify.com/v1/";

interface Song {
  id: string;
  attributes: { name: string; artistName: string; albumName?: string };
}

type SpotifyTrack = {
  id: string;
  name: string;
  artists?: { name: string }[];
  album?: { name: string };
};

export default function SpotifySpikePage() {
  const [term, setTerm] = useState("daft punk");
  const [spotifyAccountId, setSpotifyAccountId] = useState<string | null>(null);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [results, setResults] = useState<Song[]>([]);
  const [log, setLog] = useState<string[]>([]);

  const search = async () => {
    try {
      const token = await getSpotifyToken();
      console.log(await getSpotifyToken());
      if (!token) return;
      const response = await fetch(`${API_URL}search?q=${term}&type=track`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      const { tracks } = await response.json();
      console.log(tracks);
      if (!tracks) return;
      // TODO handle fetch + append remaining results
      const hasMoreResults = tracks.items?.count < tracks.total;
      const nextUrl = hasMoreResults ? tracks.next : null;
      const songs = mapResultsToSong(tracks.items);
      console.log("next page results?: " + nextUrl);
      setResults(songs);
    } catch (err) {
      console.error(err);
    }
    console.log("search");
  };

  const mapResultsToSong = (tracks: SpotifyTrack[]): Song[] => {
    return tracks.map((track) => ({
      id: track.id,
      attributes: {
        name: track.name,
        artistName: track?.artists?.[0]?.name ?? "",
        albumName: track?.album?.name,
      },
    }));
  };

  const getSpotifyToken = async () => {
    const res = await authClient.getAccessToken({
      accountId: spotifyAccountId,
      providerId: "spotify",
    });
    return res.data.accessToken;
  };

  const createPlaylist = async () => {
    const token = await getSpotifyToken();

    const response = await fetch(`${API_URL}me/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Infinite Playlist spike ${new Date().toLocaleDateString()}`,
      }),
    });

    const { id, externalUrl } = await response
      .json()
      .catch((err) => console.error(err));
    if (id) setPlaylistId(id);
  };

  const addTrack = async (song: Song) => {
    const token = await getSpotifyToken();

    if (!playlistId) return say("create a playlist first");
    try {
      await fetch(`${API_URL}playlists/${playlistId}/items`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: [`spotify:track:${song.id}`],
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
      console.log("configuring - getting spotify account id");
      try {
        const { data: accounts, error } = await authClient.listAccounts();

        if (error) {
          throw new Error(error.message);
        }

        const account = accounts?.find(
          (account) => account.providerId === "spotify",
        );

        setSpotifyAccountId(account.accountId);
      } catch (err) {}
    }
    if (!spotifyAccountId) configure();
  });

  return (
    <main>
      <h1>Spotify music spike</h1>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "1rem 0" }}
      >
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="search songs"
          style={{ padding: "4px 8px" }}
        />
        <button onClick={search} disabled={!spotifyAccountId}>
          2 · Search
        </button>
        <button onClick={createPlaylist} disabled={!spotifyAccountId}>
          4 · Create playlist
        </button>
        <p style={{ color: "#666", fontSize: 13 }}>
          authorized: {spotifyAccountId} · playlist: {playlistId ?? "none"}
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
