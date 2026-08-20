/**
 * Creates an Apple Music developer token (ES256 JWT) that identifies infinite-playlist to Apple.
 * Note: NOT a apple music user token, identifies our app only.
 */
import { createPrivateKey, sign } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { config as loadDotenv } from "dotenv";

// TODO: Handle longer lived token
const TTL_SECONDS = 60 * 60; // Expiry after 1 hr

interface Config {
  teamId: string;
  keyId: string;
  privateKeyPem: string;
}

let cached: Config | null = null;

/** Walk from cwd to find `secrets/musickit` */
function findSecretsDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, "secrets", "musickit");
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("Could not find secrets/musickit walking up from cwd");
}

function loadConfig(): Config {
  if (cached) return cached;
  const dir = findSecretsDir();

  loadDotenv({ path: join(dir, ".env") });

  const teamId = process.env.TEAM_ID ?? process.env.APPLE_TEAM_ID;
  const keyId = process.env.KEY_ID ?? process.env.APPLE_KEY_ID;
  const keyPath = join(dir, "musickit.p8");

  if (!teamId || !keyId) {
    throw new Error("Missing TEAM_ID / KEY_ID in secrets/musickit/.env");
  }
  if (!existsSync(keyPath)) {
    throw new Error(`MusicKit private key not found at ${keyPath}`);
  }

  cached = { teamId, keyId, privateKeyPem: readFileSync(keyPath, "utf8") };
  return cached;
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

/** Returns a freshly signed developer token and its expiry */
export function createDeveloperToken(): { token: string; expiresAt: number } {
  const { teamId, keyId, privateKeyPem } = loadConfig();

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + TTL_SECONDS;
  const header = { alg: "ES256", kid: keyId, typ: "JWT" };
  const payload = { iss: teamId, iat, exp };

  const signingInput = `${b64url(JSON.stringify(header))}.${b64url(JSON.stringify(payload))}`;
  const signature = sign("sha256", Buffer.from(signingInput), {
    key: createPrivateKey(privateKeyPem),
    dsaEncoding: "ieee-p1363",
  });

  return {
    token: `${signingInput}.${b64url(signature)}`,
    expiresAt: exp * 1000,
  };
}
