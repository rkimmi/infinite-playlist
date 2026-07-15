"use client";

import { useEffect, useRef, useState } from "react";

type MusicKitInstance = any;
declare global {
  interface Window {
    MusicKit?: any;
  }
}

const MUSICKIT_SRC = "https://js-cdn.music.apple.com/musickit/v3/musickit.js";

interface Song {
  id: string;
  attributes: { name: string; artistName: string; albumName?: string };
}

export default function AppleSpikePage() {
  const music = useRef<MusicKitInstance | null>(null);
  const [ready, setReady] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [term, setTerm] = useState("daft punk");
  const [results, setResults] = useState<Song[]>([]);
  const [playlistId, setPlaylistId] = useState<string | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const say = (msg: string) =>
    setLog((prev) => [`${new Date().toLocaleTimeString()}  ${msg}`, ...prev]);

  // Load MusicKit JS, then configure it with a token from our route.
  useEffect(() => {
    async function configure() {
      try {
        const res = await fetch("/api/apple/developer-token");
        const { token, error } = await res.json();
        if (error) throw new Error(error);
        await window.MusicKit!.configure({
          developerToken: token,
          app: { name: "Infinite Playlist", build: "0.0.0" },
        });
        music.current = window.MusicKit!.getInstance();
        setReady(true);
        setAuthorized(Boolean(music.current.isAuthorized));
        say(`configured · storefront=${music.current.storefrontId ?? "?"}`);
      } catch (err) {
        say(`configure failed: ${(err as Error).message}`);
      }
    }

    if (window.MusicKit) {
      configure();
      return;
    }
    document.addEventListener("musickitloaded", configure, { once: true });
    if (!document.querySelector(`script[src="${MUSICKIT_SRC}"]`)) {
      const s = document.createElement("script");
      s.src = MUSICKIT_SRC;
      s.async = true;
      document.head.appendChild(s);
    }
    return () => document.removeEventListener("musickitloaded", configure);
  }, []);

  // Loads up apple music login portal
  async function authorize() {
    try {
      // Stores token in local storage
      // TODO: surface token, encrypt and store
      await music.current.authorize();
      setAuthorized(true);
      say(
        `authorized · user token ${music.current.musicUserToken ? "obtained" : "missing"}`,
      );
    } catch (err) {
      say(`authorize failed: ${(err as Error).message}`);
    }
  }

  async function search() {
    try {
      const storefront = music.current.storefrontId || "us";
      const { data } = await music.current.api.music(
        `/v1/catalog/${storefront}/search`,
        { term, types: ["songs"], limit: 10 },
      );
      const songs: Song[] = data?.results?.songs?.data ?? [];
      setResults(songs);
      say(`search "${term}" → ${songs.length} songs`);
    } catch (err) {
      say(`search failed: ${(err as Error).message}`);
    }
  }

  async function play(song: Song) {
    try {
      await music.current.setQueue({ song: song.id, startPlaying: true });
      say(`▶ ${song.attributes.artistName} — ${song.attributes.name}`);
    } catch (err) {
      say(
        `play failed (subscription required for full tracks): ${(err as Error).message}`,
      );
    }
  }

  async function createPlaylist() {
    try {
      const seed = results[0];
      const body = {
        attributes: {
          name: `Infinite Playlist spike ${new Date().toLocaleDateString()}`,
          description: "Created from Apple Music spike.",
        },
        relationships: seed
          ? { tracks: { data: [{ id: seed.id, type: "songs" }] } }
          : undefined,
      };
      const { data } = await music.current.api.music(
        "/v1/me/library/playlists",
        {},
        { fetchOptions: { method: "POST", body: JSON.stringify(body) } },
      );
      const id = data?.data?.[0]?.id;
      setPlaylistId(id ?? null);
      say(
        `created playlist ${id ?? "(id?)"}${seed ? ` with seed "${seed.attributes.name}"` : ""}`,
      );
    } catch (err) {
      say(`create failed: ${(err as Error).message}`);
    }
  }

  async function addTrack(song: Song) {
    if (!playlistId) return say("create a playlist first");
    try {
      await music.current.api.music(
        `/v1/me/library/playlists/${playlistId}/tracks`,
        {},
        {
          fetchOptions: {
            method: "POST",
            body: JSON.stringify({ data: [{ id: song.id, type: "songs" }] }),
          },
        },
      );
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
        <button onClick={authorize} disabled={!ready}>
          1 · Authorize
        </button>
        <input
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="search songs"
          style={{ padding: "4px 8px" }}
        />
        <button onClick={search} disabled={!ready}>
          2 · Search
        </button>
        <button onClick={createPlaylist} disabled={!authorized}>
          4 · Create playlist
        </button>
      </div>
      <p style={{ color: "#666", fontSize: 13 }}>
        ready: {String(ready)} · authorized: {String(authorized)} · playlist:{" "}
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
