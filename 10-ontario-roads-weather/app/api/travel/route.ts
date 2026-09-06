export const revalidate = 300;

async function getJson(url:string){const r=await fetch(url,{headers:{Accept:"application/json"},next:{revalidate:300}});if(!r.ok)throw new Error(`${r.status}`);return r.json()}
const n=(v:unknown)=>{const x=Number(v);return Number.isFinite(x)?x:null};
const t=(v:unknown)=>{const x=n(v);if(!x)return Date.now();return x<1e12?x*1000:x};
const en=(v:any):any=>v&&typeof v==="object"&&"en" in v?v.en:v;

export async function GET(){
  const [eventResult,roadResult,weatherResult]=await Promise.allSettled([
    getJson("https://511on.ca/api/v2/get/event?format=json&lang=en"),
    getJson("https://511on.ca/api/v3/get/roadconditions?format=json&lang=en"),
    getJson("https://api.weather.gc.ca/collections/citypageweather-realtime/items?f=json&bbox=-95,41,-74,57&limit=100&lang=en"),
  ]);
  const rawEvents=eventResult.status==="fulfilled"?(Array.isArray(eventResult.value)?eventResult.value:eventResult.value?.events??[]):[];
  const rawRoads=roadResult.status==="fulfilled"?(Array.isArray(roadResult.value)?roadResult.value:roadResult.value?.roadconditions??[]):[];
  const features=weatherResult.status==="fulfilled"?(weatherResult.value?.features??[]):[];
  const incidents=rawEvents.map((x:any,i:number)=>({id:String(x.ID??x.Id??i),road:String(x.RoadwayName??x.Roadway??"Road"),type:String(x.EventType??x.Type??"Traffic event"),subtype:String(x.EventSubType??x.SubType??""),severity:String(x.Severity??"Unknown"),description:String(x.Description??x.LocationDescription??"Traffic event"),location:String(x.LocationDescription??x.Description??"Ontario"),direction:String(x.DirectionOfTravel??x.Direction??""),lanes:String(x.LanesAffected??""),region:String(x.Region??"Ontario"),lat:n(x.Latitude),lon:n(x.Longitude),updated:t(x.LastUpdated??x.Reported)}));
  const roads=rawRoads.map((x:any,i:number)=>({id:String(i),road:String(x.RoadwayName??"Road"),location:String(x.LocationDescription??"Ontario"),condition:Array.isArray(x.Condition)?x.Condition.join(", "):String(x.Condition??"Not reported"),visibility:String(x.Visibility??"Not reported"),drifting:String(x.Drifting??"No"),region:String(x.Region??"Ontario"),updated:t(x.LastUpdated)}));
  const weather=features.map((f:any)=>{const p=f.properties??{};const c=p.currentConditions??p.current_conditions??{};const coords=f.geometry?.coordinates??[null,null];return{id:String(f.id??p.id??""),city:String(en(p.location?.name)??en(p.name)??f.id??"Ontario"),temp:n(en(c.temperature?.value)??en(p.temperature?.value)),condition:String(en(c.condition)??en(c.textSummary)??"Current conditions"),humidity:n(en(c.relativeHumidity?.value)??en(p.relativeHumidity?.value)),wind:n(en(c.wind?.speed?.value)??en(p.wind?.speed?.value)),windDir:String(en(c.wind?.direction?.value)??en(p.wind?.direction?.value)??""),lat:n(coords[1]),lon:n(coords[0])};});
  const failures=[eventResult,roadResult,weatherResult].filter(x=>x.status==="rejected").length;
  if(failures===3)return Response.json({error:"Travel feeds unavailable"},{status:502});
  return Response.json({incidents,roads,weather,updatedAt:new Date().toISOString(),partial:failures>0},{headers:{"Cache-Control":"public, max-age=300"}});
}
