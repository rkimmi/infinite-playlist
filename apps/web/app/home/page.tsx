import ActivityHeatMap from "./heatmap";
import { Nav } from "@/components";

import { auth } from "@infinite-playlist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home({ searchParams }) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/");
  }

  const user = session.user;

  return (
    <main style={{ display: "flex", position: "relative", height: "100vh" }}>
      Home
    </main>
  );
}
