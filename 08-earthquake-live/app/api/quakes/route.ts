const FEEDS: Record<string, string> = {
  hour: "all_hour.geojson",
  day: "all_day.geojson",
  week: "all_week.geojson",
};

export const revalidate = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const range = url.searchParams.get("range") ?? "day";
  const feed = FEEDS[range] ?? FEEDS.day;
  try {
    const response = await fetch(`https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/${feed}`, {
      headers: { Accept: "application/geo+json, application/json" },
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error(`USGS feed returned ${response.status}`);
    const data = await response.json();
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Feed unavailable" }, { status: 502 });
  }
}
