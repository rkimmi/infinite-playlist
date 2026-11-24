"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { AudioProviderFactory, CreatePlaylistRequest, TrackSearchResult } from "@/lib/services/providers";

export default function AppleSpikePage() {
  const [term, setTerm] = useState("daft punk");
  const [appleAccountId, setAppleAccountId] = useState<string | null>(null);
  const [results, setResults] = useState<TrackSearchResult[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [apple] = useState(() => AudioProviderFactory.get("apple_music"));

  useEffect(() => {
    async function configure() {
      try {
        const { data: accounts, error } = await authClient.listAccounts();
        if (error) {
          throw new Error(error.message);
        }
        const account = accounts?.find(
          (account) => account.providerId === "apple",
        );
        setAppleAccountId(account.accountId);
      } catch (err) {}
    }
    if (!appleAccountId) configure();
  });

  const say = (msg: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);

  async function search() {
    try {
      const tracks = await apple.searchTracks(term, null);
      setResults(tracks);
      say(`search "${term}" → ${tracks.length} songs`);
    } catch (err) {
      say(`search failed: ${(err as Error).message}`);
    }
  }

  async function play(song: TrackSearchResult) {
    try {
      await apple.playback(song.id);
      say(`▶ ${song.attributes.artistName} — ${song.attributes.name}`);
    } catch (err) {
      console.error(err);
      say(
        `play failed (subscription required for full tracks): ${(err as Error).message}`,
      );
    }
  }

  async function createPlaylist() {
    try {
      const playlist: CreatePlaylistRequest = {
        name: "mixtaped spike " + Date.now(),
        trackIds: [],
        description: "Created from apple spike",
      };
      const id = await apple.createPlaylist(playlist)
      setPlaylistId(id ?? null);
      say(
        `created playlist ${id}`,
      );
    } catch (err) {
      say(`create failed: ${(err as Error).message}`);
    }
  }

  async function addTrack(song: TrackSearchResult) {
    if (!playlistId) return say("create a playlist first");
    try {
      await apple.addTracks(playlistId, [song.id])
      say(`＋ added "${song.attributes.name}" to playlist`);
    } catch (err) {
      say(`add track failed: ${(err as Error).message}`);
    }
  }

  return (
    <main
      style={{
        fontFamily: "system-ui",
        maxWidth: 720,
        margin: "2rem auto",
        padding: "0 1rem",
      }}
    >
      <h1>Apple Music spike</h1>
      <div
        style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "1rem 0" }}
      >
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="search songs"
          style={{ padding: "4px 8px" }}
        />
        <button onClick={search} disabled={!appleAccountId}>
          2 · Search
        </button>
        <button onClick={createPlaylist} disabled={!appleAccountId}>
          4 · Create playlist
        </button>
      </div>
      <p style={{ color: "#666", fontSize: 13 }}>
         authorized: {!appleAccountId ? 'false' : 'true'} · playlist:{" "}
        {playlistId ?? "none"}
      </p>

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
