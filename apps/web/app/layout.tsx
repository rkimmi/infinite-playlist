import type { Metadata } from "next";
import type React from "react";
import { auth } from "@infinite-playlist/auth";
import { Nav } from "@/components";

import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Infinite Playlist",
  description: "WIP",
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  const user = session?.user;

  return (
    <html lang="en">
      <body>
        <div style={{ width: "100%", height: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {user ? <h1> Hello {user.name}</h1> : ""}
            <Nav hasSession={!!session} />
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", height: "100%" }}>
            {children}{" "}
          </div>
        </div>
      </body>
    </html>
  );
}
