const ALLOWED_CIKS = new Set(["0000320193","0000789019","0001045810","0001018724","0001652044","0001318605","0001326801","0000019617"]);
type FactUnit = { fy?: number; fp?: string; form?: string; filed?: string; val?: number };
function annualSeries(facts: any, keys: string[]) { for (const key of keys) { const units = facts?.[key]?.units?.USD as FactUnit[]|undefined; if (!units?.length) continue; const byYear = new Map<number,FactUnit>(); units.filter((i)=>i.form==="10-K"&&i.fp==="FY"&&i.fy&&typeof i.val==="number").forEach((i)=>{const c=byYear.get(i.fy!);if(!c||(i.filed??"")>(c.filed??""))byYear.set(i.fy!,i)}); if(byYear.size)return byYear; } return new Map<number,FactUnit>(); }
export async function GET(request: Request) {
  const cik = new URL(request.url).searchParams.get("cik") ?? "0000320193";
  if (!ALLOWED_CIKS.has(cik)) return Response.json({error:"Unsupported company"},{status:400});
  const headers={"User-Agent":"FilingPulse dashboard maduakoakachi@gmail.com","Accept-Encoding":"gzip, deflate",Accept:"application/json"};
  try {
    const [sRes,fRes]=await Promise.all([fetch(`https://data.sec.gov/submissions/CIK${cik}.json`,{headers,cf:{cacheTtl:900,cacheEverything:true}} as RequestInit),fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${cik}.json`,{headers,cf:{cacheTtl:3600,cacheEverything:true}} as RequestInit)]);
    if(!sRes.ok||!fRes.ok)throw new Error(`SEC returned ${sRes.status}/${fRes.status}`);
    const submissions:any=await sRes.json(), companyFacts:any=await fRes.json(), recent=submissions.filings?.recent??{}, count=Math.min(recent.form?.length??0,180);
    const filings=Array.from({length:count},(_,index)=>{const accessionNumber=recent.accessionNumber[index],accessionPath=String(accessionNumber).replaceAll("-",""),primaryDocument=recent.primaryDocument[index];return{form:recent.form[index],filingDate:recent.filingDate[index],reportDate:recent.reportDate[index],accessionNumber,primaryDocument,description:recent.primaryDocDescription?.[index]||recent.items?.[index]||"SEC filing",url:`https://www.sec.gov/Archives/edgar/data/${Number(cik)}/${accessionPath}/${primaryDocument}`}});
    const usGaap=companyFacts.facts?.["us-gaap"]??{},revenue=annualSeries(usGaap,["RevenueFromContractWithCustomerExcludingAssessedTax","Revenues","SalesRevenueNet"]),netIncome=annualSeries(usGaap,["NetIncomeLoss","ProfitLoss"]),assets=annualSeries(usGaap,["Assets"]);
    const years=[...new Set([...revenue.keys(),...netIncome.keys(),...assets.keys()])].sort((a,b)=>a-b).slice(-6),financials=years.map((year)=>({year,revenue:revenue.get(year)?.val,netIncome:netIncome.get(year)?.val,assets:assets.get(year)?.val}));
    return Response.json({company:{name:submissions.name,ticker:submissions.tickers?.[0]??"",cik,sicDescription:submissions.sicDescription,state:submissions.stateOfIncorporation},filings,financials,fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=300, s-maxage=900"}});
  } catch(error) { return Response.json({error:"SEC data temporarily unavailable",detail:error instanceof Error?error.message:"Unknown error"},{status:502}); }
}
