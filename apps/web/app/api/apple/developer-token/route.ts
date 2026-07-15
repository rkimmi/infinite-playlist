import { createDeveloperToken } from "@/lib/apple/developer-token";

// TODO Auth: Gate route by authenticated session
export function GET() {
  try {
    const { token, expiresAt } = createDeveloperToken();
    return Response.json({ token, expiresAt });
  } catch (err) {
    console.error("developer-token for apple music creation failed", err);
    const message = err instanceof Error ? err.message : "apple music unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
