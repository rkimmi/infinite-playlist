"use client";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AudioProviderFactory, CreatePlaylistRequest, TrackSearchResult } from "@/lib/services/providers";

const API_URL = "https://api.spotify.com/v1/";

export default function SpotifySpikePage() {
  const [term, setTerm] = useState("daft punk");
  const [spotifyAccountId, setSpotifyAccountId] = useState<string | null>(null);

  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [spotify] = useState(() => AudioProviderFactory.get("spotify"));

  const search = async () => {
    try {
      const tracks = await spotify.searchTracks(term, null);
      setResults(tracks);
    } catch (err) {
      console.error(err);
    }
  };

  // TODO internal playlist creation
  const createPlaylist = async () => {
    const playlist: CreatePlaylistRequest = {
      name: "mixtaped spike " + Date.now(),
      trackIds: [],
      description: "Created from spotify spike",
    };
    const id = await spotify.createPlaylist(playlist);
    say("playlist created: " + id);
    if (id) setPlaylistId(id);
  };

  const addTrack = async (song: TrackSearchResult) => {
    if (!playlistId) return say("create a playlist first");
    try {
      await spotify.addTracks(playlistId, [song.id])

      say(`＋ added "${song.attributes.name}" to playlist`);
    } catch (err) {
      say(`add track failed: ${(err as Error).message}`);
    }
  };

  async function play(song: TrackSearchResult) {
    try {
      await spotify.playback(song.id);
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
          (account: any) => account.providerId === "spotify",
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
          authorized: { spotifyAccountId ? 'true' : 'false' } · playlist: {playlistId ?? "none"}
        </p>
      </div>
      <ol>
        {results.map((song) => (
          <li key={song.id} style={{ margin: "6px 0" }}>
            {song.attributes.artistName} — {song.attributes.name}{" "}{song.id}
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
