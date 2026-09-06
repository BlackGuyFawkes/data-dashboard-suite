const INDUSTRIES = [
  ["mining","Mining & logging","CES1000000003","CES1000000001"],
  ["construction","Construction","CES2000000003","CES2000000001"],
  ["manufacturing","Manufacturing","CES3000000003","CES3000000001"],
  ["trade","Trade, transport & utilities","CES4000000003","CES4000000001"],
  ["information","Information","CES5000000003","CES5000000001"],
  ["finance","Financial activities","CES5500000003","CES5500000001"],
  ["professional","Professional & business","CES6000000003","CES6000000001"],
  ["education","Education & health","CES6500000003","CES6500000001"],
  ["leisure","Leisure & hospitality","CES7000000003","CES7000000001"],
  ["other","Other services","CES8000000003","CES8000000001"],
] as const;
const INDICATORS = {
  nonfarm:"CES0000000001", unemployment:"LNS14000000", participation:"LNS11300000",
  privateWage:"CES0500000003", weeklyHours:"CES0500000002",
};
type Point = { date:string; label:string; value:number; year:number; month:number };

function points(series:any): Point[] {
  return (series?.data || []).filter((p:any)=>/^M(0[1-9]|1[0-2])$/.test(p.period)).map((p:any)=>({
    date:`${p.year}-${p.period.slice(1)}`, label:`${p.periodName.slice(0,3)} ${p.year}`,
    value:Number(p.value), year:Number(p.year), month:Number(p.period.slice(1)),
  })).filter((p:Point)=>Number.isFinite(p.value)).sort((a:Point,b:Point)=>a.date.localeCompare(b.date));
}
function change(series:Point[]) { const current=series.at(-1)?.value, previous=series.at(-13)?.value; return current!=null&&previous!=null&&previous!==0?(current-previous)/previous*100:0; }

export async function GET() {
  const ids=[...Object.values(INDICATORS),...INDUSTRIES.flatMap(i=>[i[2],i[3]])];
  try {
    const response=await fetch("https://api.bls.gov/publicAPI/v1/timeseries/data/",{
      method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","User-Agent":"SalaryScope labor dashboard"},
      body:JSON.stringify({seriesid:ids}),cf:{cacheTtl:43200,cacheEverything:true},
    } as RequestInit);
    if(!response.ok)throw new Error(`BLS returned ${response.status}`);
    const payload:any=await response.json();
    if(payload.status!=="REQUEST_SUCCEEDED")throw new Error(payload.message?.join("; ")||"BLS request failed");
    const seriesMap=new Map((payload.Results?.series||[]).map((s:any)=>[s.seriesID,points(s)]));
    const indicators=Object.fromEntries(Object.entries(INDICATORS).map(([key,id])=>[key,seriesMap.get(id)||[]]));
    const industries=INDUSTRIES.map(([id,label,wageId,employmentId])=>{const wage=(seriesMap.get(wageId)||[]) as Point[],employment=(seriesMap.get(employmentId)||[]) as Point[];return{id,label,wage,employment,latestWage:wage.at(-1)?.value||0,latestEmployment:employment.at(-1)?.value||0,wageYoY:change(wage),employmentYoY:change(employment)}});
    const allPoints=Object.values(indicators).flat() as Point[];
    return Response.json({indicators,industries,fetchedAt:new Date().toISOString(),latestPeriod:allPoints.sort((a,b)=>a.date.localeCompare(b.date)).at(-1)?.label||"Latest"},{headers:{"Cache-Control":"public, max-age=3600, s-maxage=43200"}});
  } catch(error) { return Response.json({error:"Labor data temporarily unavailable",detail:error instanceof Error?error.message:"Unknown error"},{status:502,headers:{"Cache-Control":"no-store"}}); }
}
