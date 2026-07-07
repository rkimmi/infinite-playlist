import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Infinite Playlist",
  description: "WIP",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
