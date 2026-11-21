import { Spotify } from "./spotify";
import { Tidal } from "./tidal";
import { AppleMusic } from "./apple-music";
import { ProviderKey } from "@/lib/types/playlist.types";
import { IAudioProvider } from "./audio-provider.interface";

export class AudioProviderFactory {
  static get(type: ProviderKey): IAudioProvider {
    switch (type) {
      case "Spotify":
        return new Spotify();
      case "Tidal":
        return new Tidal();
      case "Apple":
        return new AppleMusic();
      default:
        throw new Error("Unsupported provider");
    }
  }
}
