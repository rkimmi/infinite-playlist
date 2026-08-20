import ActivityHeatMap from "./heatmap";
import Nav from "./nav";

export default async function Home({ params, searchParams }) {
  return (
    <main style={{ display: "flex", position: "relative", height: "100vh" }}>
      <div style={{ width: "100%", height: "100%" }}>
        <Nav searchParams={await searchParams} />
        <div style={{ display: "flex", flexWrap: "wrap" }}>
          <ActivityHeatMap />
        </div>
      </div>
    </main>
  );
}
