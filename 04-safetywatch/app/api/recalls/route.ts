const CATEGORIES = ["food", "drug", "device"] as const;
type Category = typeof CATEGORIES[number];
type FdaRecord = Record<string, string | undefined>;

function normalize(record: FdaRecord, category: Category, index: number) {
  return {
    id: `${category}-${record.event_id || record.recall_number || index}`,
    category,
    classification: record.classification || "Not Yet Classified",
    status: record.status || "Unknown",
    recallingFirm: record.recalling_firm || "Unknown firm",
    product: record.product_description || "Product description unavailable",
    reason: record.reason_for_recall || "Reason not specified",
    reportDate: record.report_date || "",
    recallDate: record.recall_initiation_date || "",
    state: record.state || "",
    distribution: record.distribution_pattern || "Not specified",
    quantity: record.product_quantity || "Not specified",
    voluntary: record.voluntary_mandated || "Not specified",
  };
}

export async function GET() {
  try {
    const responses = await Promise.all(CATEGORIES.map(category => fetch(
      `https://api.fda.gov/${category}/enforcement.json?limit=100&sort=report_date:desc`,
      { headers: { Accept: "application/json", "User-Agent": "SafetyWatch public recall dashboard" }, cf: { cacheTtl: 21600, cacheEverything: true } } as RequestInit
    )));
    if (responses.some(response => !response.ok)) throw new Error(`openFDA status ${responses.map(r=>r.status).join("/")}`);
    const payloads: any[] = await Promise.all(responses.map(response => response.json()));
    const recalls = payloads.flatMap((payload, categoryIndex) => (payload.results || []).map((record: FdaRecord, index: number) => normalize(record, CATEGORIES[categoryIndex], index))).sort((a,b)=>b.reportDate.localeCompare(a.reportDate));
    const totals = Object.fromEntries(CATEGORIES.map((category,index)=>[category,payloads[index]?.meta?.results?.total || 0]));
    return Response.json({ recalls, totals, fetchedAt:new Date().toISOString() }, { headers:{"Cache-Control":"public, max-age=1800, s-maxage=21600"} });
  } catch (error) {
    return Response.json({ error:"Recall data is temporarily unavailable", detail:error instanceof Error?error.message:"Unknown error" }, { status:502, headers:{"Cache-Control":"no-store"} });
  }
}
