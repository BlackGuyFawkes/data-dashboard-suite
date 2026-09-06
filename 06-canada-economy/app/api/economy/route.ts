const VECTORS={employment:2062810,participation:2062814,unemployment:2062815,cpi:41690973,gdp:65201210};
const BOC=["V39079","FXUSDCAD","BD.CDN.2YR.DQ.YLD","BD.CDN.5YR.DQ.YLD","BD.CDN.10YR.DQ.YLD","BD.CDN.LONG.DQ.YLD"];
type Point={date:string;label:string;value:number};
const label=(date:string)=>new Date(`${date.slice(0,10)}T00:00:00Z`).toLocaleDateString("en-CA",{month:"short",year:"2-digit",timeZone:"UTC"});
function statPoints(item:any):Point[]{return (item?.object?.vectorDataPoint||[]).map((p:any)=>({date:String(p.refPer).slice(0,10),label:label(String(p.refPer)),value:Number(p.value)})).filter((p:Point)=>Number.isFinite(p.value)).sort((a:Point,b:Point)=>a.date.localeCompare(b.date))}
function bocPoints(observations:any[],code:string):Point[]{return observations.map((o:any)=>({date:o.d,label:label(o.d),value:Number(o[code]?.v)})).filter((p:Point)=>Number.isFinite(p.value)).sort((a,b)=>a.date.localeCompare(b.date))}
export async function GET(){
  try{
    const [statResponse,bocResponse]=await Promise.all([
      fetch("https://www150.statcan.gc.ca/t1/wds/rest/getDataFromVectorsAndLatestNPeriods",{method:"POST",headers:{"Content-Type":"application/json",Accept:"application/json","User-Agent":"Canada Economy public dashboard"},body:JSON.stringify(Object.values(VECTORS).map(vectorId=>({vectorId,latestN:72}))),cf:{cacheTtl:21600,cacheEverything:true}} as RequestInit),
      fetch(`https://www.bankofcanada.ca/valet/observations/${BOC.join(",")}/json?recent=800`,{headers:{Accept:"application/json","User-Agent":"Canada Economy public dashboard"},cf:{cacheTtl:10800,cacheEverything:true}} as RequestInit)
    ]);
    if(!statResponse.ok||!bocResponse.ok)throw new Error(`Public data status ${statResponse.status}/${bocResponse.status}`);
    const statPayload:any[]=await statResponse.json(),bocPayload:any=await bocResponse.json();
    const statByVector=new Map(statPayload.map(item=>[Number(item?.object?.vectorId),statPoints(item)]));
    const statcan=Object.fromEntries(Object.entries(VECTORS).map(([key,id])=>[key,statByVector.get(id)||[]]));
    const observations=bocPayload.observations||[],boc=Object.fromEntries(BOC.map(code=>[code,bocPoints(observations,code)]));
    return Response.json({statcan,boc,fetchedAt:new Date().toISOString()},{headers:{"Cache-Control":"public, max-age=1800, s-maxage=10800"}});
  }catch(error){return Response.json({error:"Canadian economic data is temporarily unavailable",detail:error instanceof Error?error.message:"Unknown error"},{status:502,headers:{"Cache-Control":"no-store"}})}
}
