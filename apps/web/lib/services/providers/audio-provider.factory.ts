import { Spotify } from "./spotify";
import { Tidal } from "./tidal";
import { AppleMusic } from "./apple-music";
import type { MusicProvider } from "@infinite-playlist/shared-types";
import { IAudioProvider } from "./audio-provider.interface";

export class AudioProviderFactory {
  static get(type: MusicProvider): IAudioProvider {
    switch (type) {
      case "spotify":
        return new Spotify();
      case "tidal":
        return new Tidal();
      case "apple_music":
        return new AppleMusic();
      default:
        throw new Error("Unsupported provider");
    }
  }
}
