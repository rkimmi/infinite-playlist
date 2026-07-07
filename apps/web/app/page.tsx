import type { MusicProvider } from "@infinite-playlist/shared-types";

// Demonstrates the shared-types wiring working inside a Server Component.
const providers: MusicProvider[] = ["spotify", "apple", "tidal"];

export default function Home() {
  return (
    <main>
      <h1>Infinite Playlist</h1>
      {/* <p>Supported providers: {providers.join(", ")}</p> */}
    </main>
  );
}
