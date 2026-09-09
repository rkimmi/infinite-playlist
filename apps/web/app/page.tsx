import { Nav } from "@/components";
import { auth } from "@infinite-playlist/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Main({ searchParams }) {
  const session = await auth.api
    .getSession({
      headers: await headers(),
    })
    .catch((err) => {
      console.log(err);
      redirect("/");
    });

  if (session) {
    redirect("/home");
  }

  return (
    <main style={{ display: "flex", position: "relative", height: "100vh" }}>
      <div style={{ width: "100%", height: "100%" }}>
        <Nav searchParams={await searchParams} hasSession={!!session} />
      </div>
    </main>
  );
}
