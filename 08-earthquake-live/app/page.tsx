"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip as ChartTooltip, XAxis, YAxis, ZAxis } from "recharts";
import { Activity, AlertTriangle, ChevronRight, CircleDot, Clock3, Gauge, Layers3, LocateFixed, Radio, RefreshCw, Waves } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Quake = { id: string; mag: number; place: string; time: number; updated: number; felt: number | null; tsunami: number; alert: string | null; status: string; sig: number; depth: number; lon: number; lat: number; url: string };
type GeoFeature = { id: string; properties: { mag: number | null; place: string | null; time: number; updated: number; felt: number | null; tsunami: number; alert: string | null; status: string; sig: number; url: string }; geometry: { coordinates: [number, number, number] } };

const MAG_COLORS = ["#70e1c6", "#e6d273", "#ff9c55", "#ff5d57", "#d92f4c"];
const magColor = (mag: number) => mag >= 6 ? MAG_COLORS[4] : mag >= 5 ? MAG_COLORS[3] : mag >= 4 ? MAG_COLORS[2] : mag >= 2.5 ? MAG_COLORS[1] : MAG_COLORS[0];
const formatTime = (time: number) => new Date(time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const ago = (time: number) => { const mins = Math.max(0, Math.floor((Date.now() - time) / 60000)); return mins < 60 ? `${mins}m ago` : mins < 1440 ? `${Math.floor(mins / 60)}h ago` : `${Math.floor(mins / 1440)}d ago`; };

function fallbackData(): Quake[] {
  const places = ["Alaska Peninsula", "Fiji region", "Northern Chile", "Central Turkey", "Hokkaido, Japan", "South of Java", "California-Nevada border", "Kermadec Islands", "Papua New Guinea", "Puerto Rico", "South Sandwich Islands", "Vanuatu region"];
  const coords = [[-155,57],[178,-19],[-70,-23],[36,38],[143,42],[111,-9],[-118,36],[-177,-30],[148,-6],[-66,18],[-26,-57],[168,-16]];
  return Array.from({ length: 42 }, (_, i) => {
    const p = i % places.length; const mag = Number((1.1 + ((i * 17) % 49) / 10).toFixed(1));
    return { id:`demo-${i}`, mag, place:places[p], time:Date.now() - i * 31 * 60000, updated:Date.now(), felt:i % 4 ? null : i * 3, tsunami:mag >= 6 ? 1 : 0, alert:mag >= 6 ? "orange" : null, status:"reviewed", sig:Math.round(mag * mag * 18), depth:6 + ((i * 23) % 210), lon:coords[p][0] + ((i % 3) - 1) * 2.5, lat:coords[p][1] + ((i % 4) - 2), url:"" };
  });
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) { return <section className={`panel ${className}`}>{children}</section>; }
function Tooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Quake & { label?: string; count?: number }; name: string; value: number }> }) {
  if (!active || !payload?.length) return null; const item = payload[0].payload;
  return <div className="tip"><strong>{item.place ?? item.label ?? "Activity"}</strong>{item.mag != null && <span>M {item.mag.toFixed(1)} · {item.depth.toFixed(0)} km deep</span>}{item.count != null && <span>{item.count} events</span>}</div>;
}

export default function Home() {
  const [quakes, setQuakes] = useState<Quake[]>(fallbackData);
  const [range, setRange] = useState("day"); const [minMag, setMinMag] = useState("all"); const [selected, setSelected] = useState<string>("");
  const [status, setStatus] = useState<"loading"|"live"|"snapshot">("loading"); const [updated, setUpdated] = useState(Date.now()); const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (windowRange = range) => {
    setRefreshing(true);
    try {
      const response = await fetch(`/api/quakes?range=${windowRange}`, { cache: "no-store" }); if (!response.ok) throw new Error();
      const geo = await response.json();
      const rows: Quake[] = (geo.features as GeoFeature[]).map((f) => ({ id:f.id, mag:f.properties.mag ?? 0, place:f.properties.place ?? "Unknown location", time:f.properties.time, updated:f.properties.updated, felt:f.properties.felt, tsunami:f.properties.tsunami, alert:f.properties.alert, status:f.properties.status, sig:f.properties.sig, url:f.properties.url, lon:f.geometry.coordinates[0], lat:f.geometry.coordinates[1], depth:f.geometry.coordinates[2] }));
      setQuakes(rows); setStatus("live"); setUpdated(geo.metadata?.generated ?? Date.now()); if (!selected && rows[0]) setSelected(rows[0].id);
    } catch { setStatus("snapshot"); setUpdated(Date.now()); }
    finally { setRefreshing(false); }
  }, [range, selected]);

  useEffect(() => { load(range); const timer = window.setInterval(() => load(range), 60000); return () => window.clearInterval(timer); }, [range]);
  const filtered = useMemo(() => quakes.filter((q) => minMag === "all" || q.mag >= Number(minMag)), [quakes, minMag]);
  const active = quakes.find((q) => q.id === selected) ?? filtered[0] ?? quakes[0];
  const stats = useMemo(() => ({ count:filtered.length, strongest:Math.max(0,...filtered.map((q)=>q.mag)), depth:filtered.length ? filtered.reduce((s,q)=>s+q.depth,0)/filtered.length : 0, felt:filtered.reduce((s,q)=>s+(q.felt ?? 0),0) }), [filtered]);
  const hourly = useMemo(() => { const size = range === "week" ? 24*60*60*1000 : 60*60*1000; const bins = range === "hour" ? 12 : range === "week" ? 7 : 24; const now=Date.now(); return Array.from({length:bins},(_,i)=>{ const end=now-(bins-1-i)*size; const start=end-size; return { label:range === "week" ? new Date(end).toLocaleDateString([], {weekday:"short"}) : new Date(end).toLocaleTimeString([], {hour:"numeric"}), count:filtered.filter(q=>q.time>start&&q.time<=end).length }; }); }, [filtered, range]);
  const buckets = useMemo(() => [{name:"< 2.5",min:0,max:2.5,color:MAG_COLORS[0]},{name:"2.5–3.9",min:2.5,max:4,color:MAG_COLORS[1]},{name:"4.0–4.9",min:4,max:5,color:MAG_COLORS[2]},{name:"5.0–5.9",min:5,max:6,color:MAG_COLORS[3]},{name:"6.0+",min:6,max:20,color:MAG_COLORS[4]}].map(b=>({...b,value:filtered.filter(q=>q.mag>=b.min&&q.mag<b.max).length})),[filtered]);
  const depth = useMemo(() => filtered.map(q=>({...q,x:q.mag,y:q.depth,z:Math.max(30,q.mag*q.mag*8)})),[filtered]);
  const changeRange = (value:string) => { setRange(value); setStatus("loading"); };

  return <main className="shell">
    <header className="topbar"><div className="identity"><div className="logo"><Waves size={22}/></div><div><span>GLOBAL SEISMIC NETWORK</span><h1>Earthquake <b>Live</b></h1></div></div><div className="top-actions"><div className={`feed-state ${status}`}><Radio size={14}/><span>{status === "live" ? "LIVE FEED" : status === "loading" ? "SYNCING" : "DEMO SNAPSHOT"}</span></div><button className="refresh" onClick={()=>load()} aria-label="Refresh earthquakes"><RefreshCw size={17} className={refreshing?"spin":""}/></button></div></header>
    <div className="controls"><Tabs value={range} onValueChange={changeRange}><TabsList className="range-tabs"><TabsTrigger value="hour">Past hour</TabsTrigger><TabsTrigger value="day">Past 24 hours</TabsTrigger><TabsTrigger value="week">Past 7 days</TabsTrigger></TabsList></Tabs><div className="magnitude-filter"><span>MINIMUM MAGNITUDE</span><Select value={minMag} onValueChange={setMinMag}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent><SelectItem value="all">All events</SelectItem><SelectItem value="2.5">M 2.5+</SelectItem><SelectItem value="4">M 4.0+</SelectItem><SelectItem value="5">M 5.0+</SelectItem></SelectContent></Select></div></div>
    <section className="kpis">
      <Panel className="kpi"><div><span>DETECTED EVENTS</span><CircleDot size={18}/></div><strong>{stats.count.toLocaleString()}</strong><small>within selected window</small></Panel>
      <Panel className="kpi hot"><div><span>STRONGEST EVENT</span><Gauge size={18}/></div><strong>M {stats.strongest.toFixed(1)}</strong><small>{filtered.find(q=>q.mag===stats.strongest)?.place ?? "No events"}</small></Panel>
      <Panel className="kpi"><div><span>AVERAGE DEPTH</span><Layers3 size={18}/></div><strong>{stats.depth.toFixed(0)} <i>km</i></strong><small>below the surface</small></Panel>
      <Panel className="kpi"><div><span>FELT REPORTS</span><Activity size={18}/></div><strong>{stats.felt.toLocaleString()}</strong><small>community responses</small></Panel>
    </section>
    <section className="grid">
      <Panel className="field-panel"><div className="panel-head"><div><span>GLOBAL ACTIVITY FIELD</span><h2>Epicentre distribution</h2></div><div className="legend"><i/><span>Shallow</span><i/><span>Deep</span></div></div><div className="field-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:10,right:12,bottom:4,left:-12}}><CartesianGrid stroke="#292b30" strokeDasharray="2 5"/><XAxis type="number" dataKey="lon" domain={[-180,180]} ticks={[-180,-120,-60,0,60,120,180]} tickFormatter={(v)=>`${Math.abs(v)}°${v<0?"W":"E"}`} axisLine={false} tickLine={false} tick={{fill:"#67696f",fontSize:11}}/><YAxis type="number" dataKey="lat" domain={[-90,90]} ticks={[-60,-30,0,30,60]} tickFormatter={(v)=>`${Math.abs(v)}°${v<0?"S":"N"}`} axisLine={false} tickLine={false} tick={{fill:"#67696f",fontSize:11}}/><ZAxis type="number" dataKey="mag" range={[30,420]}/><ChartTooltip content={<Tooltip/>} cursor={{stroke:"#55575c",strokeDasharray:"3 3"}}/><Scatter data={filtered} onClick={(p)=>setSelected(p.id)}>{filtered.map(q=><Cell key={q.id} fill={magColor(q.mag)} fillOpacity={q.id===active?.id?1:.72} stroke={q.id===active?.id?"#fff":"transparent"} strokeWidth={2}/>)}</Scatter></ScatterChart></ResponsiveContainer><div className="pulse-ring" style={{left:`${((active?.lon??0)+180)/3.6}%`,top:`${(90-(active?.lat??0))/1.8}%`}}/></div></Panel>
      <Panel className="event-panel"><div className="event-top"><div className="event-mag" style={{borderColor:magColor(active?.mag??0),color:magColor(active?.mag??0)}}><span>MAG</span><strong>{active?.mag.toFixed(1)}</strong></div><div className="event-place"><span>LATEST FOCUS</span><h2>{active?.place}</h2><small><Clock3 size={13}/>{active?ago(active.time):"—"} · {active?.lat.toFixed(2)}°, {active?.lon.toFixed(2)}°</small></div></div><div className="event-metrics"><div><span>DEPTH</span><strong>{active?.depth.toFixed(1)} km</strong></div><div><span>SIGNIFICANCE</span><strong>{active?.sig}</strong></div><div><span>STATUS</span><strong>{active?.status}</strong></div></div><div className="waveform">{Array.from({length:56},(_,i)=><i key={i} style={{height:`${8+Math.abs(Math.sin(i*.67)*(active?.mag??1)*6)+(i%7===0?18:0)}px`}}/>)}</div><div className="event-flags"><span className={active?.tsunami?"warn":""}>{active?.tsunami?<AlertTriangle size={13}/>:<LocateFixed size={13}/>} {active?.tsunami?"Tsunami flag":"Location resolved"}</span><span>{formatTime(active?.time??Date.now())}</span></div></Panel>
      <Panel className="activity-panel"><div className="panel-head"><div><span>EVENT VELOCITY</span><h2>{range==="week"?"Daily":"Hourly"} activity</h2></div><span className="chart-total">{stats.count} total</span></div><div className="small-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={hourly}><CartesianGrid vertical={false} stroke="#292b30" strokeDasharray="2 5"/><XAxis dataKey="label" axisLine={false} tickLine={false} interval={range==="day"?3:0} tick={{fill:"#67696f",fontSize:10}}/><YAxis axisLine={false} tickLine={false} tick={{fill:"#67696f",fontSize:10}} width={25}/><ChartTooltip content={<Tooltip/>} cursor={{fill:"rgba(255,107,66,.06)"}}/><Bar dataKey="count" radius={[4,4,0,0]} fill="#ff7048"/></BarChart></ResponsiveContainer></div></Panel>
      <Panel className="magnitude-panel"><div className="panel-head"><div><span>MAGNITUDE MIX</span><h2>Energy distribution</h2></div></div><div className="donut"><ResponsiveContainer width="58%" height="100%"><PieChart><Pie data={buckets} dataKey="value" innerRadius={55} outerRadius={82} paddingAngle={3} stroke="none">{buckets.map(b=><Cell key={b.name} fill={b.color}/>)}</Pie><ChartTooltip/></PieChart></ResponsiveContainer><div className="donut-total"><strong>{stats.count}</strong><span>EVENTS</span></div><div className="bucket-list">{buckets.map(b=><div key={b.name}><i style={{background:b.color}}/><span>{b.name}</span><b>{b.value}</b></div>)}</div></div></Panel>
      <Panel className="depth-panel"><div className="panel-head"><div><span>DEPTH PROFILE</span><h2>Magnitude vs depth</h2></div><span className="chart-total">km</span></div><div className="small-chart"><ResponsiveContainer width="100%" height="100%"><ScatterChart margin={{top:8,right:12,bottom:3,left:2}}><CartesianGrid stroke="#292b30" strokeDasharray="2 5"/><XAxis type="number" dataKey="x" name="Magnitude" axisLine={false} tickLine={false} tick={{fill:"#67696f",fontSize:10}}/><YAxis type="number" dataKey="y" name="Depth" reversed axisLine={false} tickLine={false} tick={{fill:"#67696f",fontSize:10}} width={34}/><ZAxis dataKey="z" range={[24,140]}/><ChartTooltip content={<Tooltip/>}/><Scatter data={depth} fill="#64cbb4" fillOpacity={.62}/></ScatterChart></ResponsiveContainer></div></Panel>
      <Panel className="stream-panel"><div className="panel-head"><div><span>EVENT STREAM</span><h2>Recent earthquakes</h2></div><Radio size={16}/></div><div className="stream">{filtered.slice(0,8).map(q=><button key={q.id} className={q.id===active?.id?"active":""} onClick={()=>setSelected(q.id)}><b style={{color:magColor(q.mag)}}>M {q.mag.toFixed(1)}</b><span><strong>{q.place}</strong><small>{ago(q.time)} · {q.depth.toFixed(0)} km deep</small></span><ChevronRight size={15}/></button>)}</div></Panel>
    </section>
    <footer><span>Data available from U.S. Geological Survey · Earthquake Hazards Program</span><span>Feed generated {new Date(updated).toLocaleString([], {month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</span></footer>
  </main>;
}
