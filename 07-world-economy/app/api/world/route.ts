const INDICATORS = {
  gdp: "NY.GDP.MKTP.CD",
  gdpPerCapita: "NY.GDP.PCAP.CD",
  growth: "NY.GDP.MKTP.KD.ZG",
  inflation: "FP.CPI.TOTL.ZG",
  unemployment: "SL.UEM.TOTL.ZS",
  population: "SP.POP.TOTL",
  trade: "NE.TRD.GNFS.ZS",
} as const;

type Point = { year: number; value: number };
type Country = { code: string; iso2: string; name: string; region: string; income: string; capital: string; metrics: Record<string, Point[]> };

export const revalidate = 21600;

async function getJson(url: string) {
  const response = await fetch(url, { headers: { Accept: "application/json" }, next: { revalidate: 21600 } });
  if (!response.ok) throw new Error(`World Bank request failed: ${response.status}`);
  return response.json();
}

export async function GET() {
  try {
    const base = "https://api.worldbank.org/v2";
    const metaPayload = await getJson(`${base}/country?format=json&per_page=400`);
    const rows = Array.isArray(metaPayload?.[1]) ? metaPayload[1] : [];
    const countries = new Map<string, Country>();
    for (const row of rows) {
      if (!row?.id || !row?.region || row.region.value === "Aggregates") continue;
      countries.set(row.id, { code: row.id, iso2: row.iso2Code, name: row.name, region: row.region.value, income: row.incomeLevel?.value ?? "—", capital: row.capitalCity || "—", metrics: {} });
    }
    await Promise.all(Object.entries(INDICATORS).map(async ([key, indicator]) => {
      const payload = await getJson(`${base}/country/all/indicator/${indicator}?date=2018:2025&format=json&per_page=20000`);
      const data = Array.isArray(payload?.[1]) ? payload[1] : [];
      for (const item of data) {
        const country = countries.get(item.countryiso3code);
        if (!country || item.value === null || !Number.isFinite(Number(item.value))) continue;
        country.metrics[key] ??= [];
        country.metrics[key].push({ year: Number(item.date), value: Number(item.value) });
      }
    }));
    const output = [...countries.values()].map((country) => ({ ...country, metrics: Object.fromEntries(Object.entries(country.metrics).map(([key, points]) => [key, points.sort((a, b) => a.year - b.year)])) })).filter((country) => country.metrics.gdp?.length && country.metrics.population?.length).sort((a, b) => a.name.localeCompare(b.name));
    return Response.json({ source: "World Bank Open Data", updatedAt: new Date().toISOString(), countries: output });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Unable to load World Bank data" }, { status: 502 });
  }
}
