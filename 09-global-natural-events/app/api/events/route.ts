export const revalidate = 300;

export async function GET() {
  try {
    const response = await fetch("https://eonet.gsfc.nasa.gov/api/v3/events?status=all&days=90&limit=500", {
      headers: { Accept: "application/json" },
      next: { revalidate: 300 },
    });
    if (!response.ok) throw new Error(`EONET returned ${response.status}`);
    const data = await response.json();
    return Response.json(data, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "EONET unavailable" }, { status: 502 });
  }
}
