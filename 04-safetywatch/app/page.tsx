"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertOctagon, CalendarClock, ChevronRight, CircleCheck, Factory, HeartPulse, PackageSearch, Pill, RefreshCw, Search, ShieldAlert, Stethoscope, Utensils, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Category = "food" | "drug" | "device";
type Recall = {
  id: string; category: Category; classification: string; status: string; recallingFirm: string;
  product: string; reason: string; reportDate: string; recallDate: string; state: string;
  distribution: string; quantity: string; voluntary: string;
};
type ApiData = { recalls: Recall[]; totals: Record<Category, number>; fetchedAt: string };

const PALETTE = { food: "#22c55e", drug: "#8b5cf6", device: "#06b6d4" };
const CLASS_COLORS: Record<string, string> = { "Class I": "#ef4444", "Class II": "#f59e0b", "Class III": "#3b82f6", "Not Yet Classified": "#64748b" };

const fallback: ApiData = {
  fetchedAt: new Date().toISOString(), totals: { food: 8211, drug: 16804, device: 24931 },
  recalls: [
    ["food","Class I","Ongoing","North Coast Foods","Prepared chicken salad products","Potential contamination with Listeria monocytogenes","20260830","CA","Nationwide"],
    ["drug","Class II","Ongoing","Apex Therapeutics","Metoprolol tablets, 50 mg","Dissolution results outside specification","20260829","NJ","Nationwide"],
    ["device","Class I","Ongoing","MedCore Systems","Infusion pump administration set","Risk of unintended flow interruption","20260828","MA","US and Canada"],
    ["food","Class II","Ongoing","Harvest Valley","Organic mixed vegetables","Undeclared milk allergen","20260824","TX","12 states"],
    ["device","Class II","Completed","Northstar Medical","Patient monitoring cable","Intermittent signal loss may occur","20260822","MN","Nationwide"],
    ["drug","Class III","Completed","Blue River Pharma","Sterile water for injection","Labeling carton mismatch","20260819","IL","Nationwide"],
  ].map((r, i) => ({ id:`demo-${i}`, category:r[0] as Category, classification:r[1], status:r[2], recallingFirm:r[3], product:r[4], reason:r[5], reportDate:r[6], recallDate:r[6], state:r[7], distribution:r[8], quantity:"See recall notice", voluntary:"Firm Initiated" }))
};

const parseDate = (date: string) => date?.length === 8 ? new Date(`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}T00:00:00Z`) : new Date(date);
const formatDate = (date: string) => { const d = parseDate(date); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month:"short", day:"numeric", year:"numeric", timeZone:"UTC" }); };
const shortDate = (date: string) => { const d = parseDate(date); return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { month:"short", day:"numeric", timeZone:"UTC" }); };
const clean = (text: string, limit = 140) => !text ? "Not specified" : text.length > limit ? `${text.slice(0, limit).trim()}…` : text;

function CategoryIcon({ category, size = 18 }: { category: Category; size?: number }) {
  return category === "food" ? <Utensils size={size}/> : category === "drug" ? <Pill size={size}/> : <Stethoscope size={size}/>;
}

function Tip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><strong>{label}</strong>{payload.map((p:any)=><div key={p.dataKey}><i style={{background:p.color}}/>{p.name}<b>{p.value.toLocaleString()}</b></div>)}</div>;
}

export default function Home() {
  const [data, setData] = useState<ApiData>(fallback);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [classification, setClassification] = useState("all");
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Recall | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try { const response = await fetch("/api/recalls", { cache:"no-store" }); if (!response.ok) throw new Error(); setData(await response.json()); setLive(true); }
    catch { setData(fallback); setLive(false); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => data.recalls.filter((r) => {
    const text = `${r.product} ${r.recallingFirm} ${r.reason} ${r.state}`.toLowerCase();
    return (category === "all" || r.category === category) && (classification === "all" || r.classification === classification) && (status === "all" || r.status.toLowerCase() === status) && (!query || text.includes(query.toLowerCase()));
  }), [data, category, classification, status, query]);

  const summary = useMemo(() => {
    const classOne = data.recalls.filter(r => r.classification === "Class I").length;
    const ongoing = data.recalls.filter(r => r.status.toLowerCase().includes("ongoing")).length;
    const nationwide = data.recalls.filter(r => r.distribution.toLowerCase().includes("nationwide")).length;
    const newest = [...data.recalls].sort((a,b)=>b.reportDate.localeCompare(a.reportDate))[0]?.reportDate ?? "";
    return { classOne, ongoing, nationwide, newest };
  }, [data]);

  const weekly = useMemo(() => {
    const buckets = new Map<string,{week:string;food:number;drug:number;device:number;sort:number}>();
    data.recalls.forEach(r => { const d=parseDate(r.reportDate); if(Number.isNaN(d.getTime()))return; const day=d.getUTCDay(), monday=new Date(d); monday.setUTCDate(d.getUTCDate()-((day+6)%7)); const key=monday.toISOString().slice(0,10); const found=buckets.get(key)??{week:monday.toLocaleDateString("en-US",{month:"short",day:"numeric",timeZone:"UTC"}),food:0,drug:0,device:0,sort:monday.getTime()}; found[r.category]++; buckets.set(key,found); });
    return [...buckets.values()].sort((a,b)=>a.sort-b.sort).slice(-12);
  }, [data]);

  const classData = useMemo(() => ["Class I","Class II","Class III","Not Yet Classified"].map(name=>({name,value:data.recalls.filter(r=>r.classification===name).length,fill:CLASS_COLORS[name]})), [data]);
  const categoryData = useMemo(() => (["food","drug","device"] as Category[]).map(name=>({name:name[0].toUpperCase()+name.slice(1),value:data.recalls.filter(r=>r.category===name).length,fill:PALETTE[name]})), [data]);
  const states = useMemo(() => { const counts=new Map<string,number>(); data.recalls.forEach(r=>{if(r.state&&r.state.length<=3)counts.set(r.state,(counts.get(r.state)??0)+1)}); return [...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,6).map(([state,recalls])=>({state,recalls})); }, [data]);
  const totalHistory = data.totals.food + data.totals.drug + data.totals.device;
  const filtersActive = category!=="all"||classification!=="all"||status!=="all"||!!query;
  const reset = () => { setCategory("all"); setClassification("all"); setStatus("all"); setQuery(""); };

  return <main>
    <header className="site-header">
      <div className="brand"><div className="brand-icon"><HeartPulse size={23}/></div><div><b>SafetyWatch</b><span>FDA recall intelligence</span></div></div>
      <div className="header-right"><div className={`live-badge ${live?"":"demo"}`}><i/>{live?"Live openFDA feed":"Demo snapshot"}</div><button className="refresh" onClick={load} disabled={loading} aria-label="Refresh recall data"><RefreshCw size={18} className={loading?"spin":""}/></button></div>
    </header>

    <div className="workspace">
      <section className="headline-row"><div><p className="overline">PUBLIC SAFETY MONITOR</p><h1>Recall activity across <em>food, drugs & devices</em></h1></div><div className="updated"><CalendarClock size={17}/><span>DATA REFRESHED<br/><b>{new Date(data.fetchedAt).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</b></span></div></section>

      <section className="kpis">
        <Kpi tone="red" icon={<AlertOctagon/>} label="Highest risk" value={summary.classOne.toLocaleString()} detail="Class I in latest records"/>
        <Kpi tone="amber" icon={<ShieldAlert/>} label="Ongoing" value={summary.ongoing.toLocaleString()} detail="Active recall actions"/>
        <Kpi tone="blue" icon={<PackageSearch/>} label="Nationwide" value={summary.nationwide.toLocaleString()} detail="Broad distribution"/>
        <Kpi tone="green" icon={<CircleCheck/>} label="Historical records" value={Intl.NumberFormat("en",{notation:"compact",maximumFractionDigits:1}).format(totalHistory)} detail={`Latest report ${shortDate(summary.newest)}`}/>
      </section>

      <section className="filterbar">
        <div className="search-wrap"><Search size={18}/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search products, companies, reasons or states" aria-label="Search recalls"/></div>
        <FilterSelect label="Category" value={category} onChange={setCategory} options={[["all","All categories"],["food","Food"],["drug","Drugs"],["device","Devices"]]}/>
        <FilterSelect label="Risk class" value={classification} onChange={setClassification} options={[["all","All classes"],["Class I","Class I"],["Class II","Class II"],["Class III","Class III"],["Not Yet Classified","Not classified"]]}/>
        <FilterSelect label="Status" value={status} onChange={setStatus} options={[["all","All statuses"],["ongoing","Ongoing"],["completed","Completed"],["terminated","Terminated"]]}/>
        {filtersActive&&<button className="clear" onClick={reset}><X size={15}/> Clear</button>}
      </section>

      <section className="top-grid">
        <article className="card trend-card"><CardTitle title="Recall pulse" subtitle="Weekly reports in the latest data" extra={<div className="chart-key"><span><i className="food"/>Food</span><span><i className="drug"/>Drugs</span><span><i className="device"/>Devices</span></div>}/><div className="trend-chart"><ResponsiveContainer width="100%" height="100%"><AreaChart data={weekly} margin={{top:18,right:12,left:-15,bottom:0}}><defs><linearGradient id="foodFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PALETTE.food} stopOpacity={.35}/><stop offset="1" stopColor={PALETTE.food} stopOpacity={0}/></linearGradient><linearGradient id="drugFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PALETTE.drug} stopOpacity={.28}/><stop offset="1" stopColor={PALETTE.drug} stopOpacity={0}/></linearGradient><linearGradient id="deviceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={PALETTE.device} stopOpacity={.25}/><stop offset="1" stopColor={PALETTE.device} stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#dce4ec" vertical={false} strokeDasharray="4 5"/><XAxis dataKey="week" axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}}/><YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}}/><Tooltip content={<Tip/>}/><Area type="monotone" dataKey="food" name="Food" stackId="1" stroke={PALETTE.food} strokeWidth={2} fill="url(#foodFill)"/><Area type="monotone" dataKey="drug" name="Drugs" stackId="1" stroke={PALETTE.drug} strokeWidth={2} fill="url(#drugFill)"/><Area type="monotone" dataKey="device" name="Devices" stackId="1" stroke={PALETTE.device} strokeWidth={2} fill="url(#deviceFill)"/></AreaChart></ResponsiveContainer></div></article>
        <article className="card mix-card"><CardTitle title="Category mix" subtitle="Latest FDA enforcement records"/><div className="mix-body"><div className="donut"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="value" nameKey="name" innerRadius="68%" outerRadius="94%" paddingAngle={4} stroke="none">{categoryData.map(d=><Cell key={d.name} fill={d.fill}/>)}</Pie><Tooltip content={<Tip/>}/></PieChart></ResponsiveContainer><div className="donut-label"><b>{data.recalls.length}</b><span>RECORDS</span></div></div><div className="mix-list">{categoryData.map((d,i)=><button key={d.name} onClick={()=>setCategory(d.name.toLowerCase())}><i style={{background:d.fill}}/><span>{d.name}</span><b>{d.value}</b><small>{Math.round(d.value/Math.max(data.recalls.length,1)*100)}%</small></button>)}</div></div></article>
      </section>

      <section className="middle-grid">
        <article className="card"><CardTitle title="Hazard classification" subtitle="FDA public-health risk classes"/><div className="bar-chart"><ResponsiveContainer width="100%" height="100%"><BarChart data={classData} layout="vertical" margin={{top:10,right:25,left:8,bottom:0}}><CartesianGrid stroke="#dce4ec" horizontal={false} strokeDasharray="4 5"/><XAxis type="number" allowDecimals={false} axisLine={false} tickLine={false} tick={{fill:"#64748b",fontSize:12}}/><YAxis type="category" dataKey="name" width={108} axisLine={false} tickLine={false} tick={{fill:"#334155",fontSize:12,fontWeight:600}}/><Tooltip content={<Tip/>}/><Bar dataKey="value" name="Recalls" radius={[0,6,6,0]} barSize={17}>{classData.map(d=><Cell key={d.name} fill={d.fill}/>)}</Bar></BarChart></ResponsiveContainer></div></article>
        <article className="card"><CardTitle title="Leading states" subtitle="Recalling-firm locations in latest records"/><div className="state-list">{states.map((s,i)=><div className="state-row" key={s.state}><b>{String(i+1).padStart(2,"0")}</b><span>{s.state}</span><div><i style={{width:`${Math.max(12,s.recalls/(states[0]?.recalls||1)*100)}%`}}/></div><strong>{s.recalls}</strong></div>)}</div></article>
      </section>

      <section className="card recall-card"><CardTitle title="Latest recall reports" subtitle={`${filtered.length} matching records`} extra={<span className="source-pill">OFFICIAL FDA DATA</span>}/><div className="recall-list">{filtered.slice(0,12).map(r=><button className="recall-row" key={r.id} onClick={()=>setSelected(r)}><span className={`category-icon ${r.category}`}><CategoryIcon category={r.category}/></span><span className="recall-product"><b>{clean(r.product,100)}</b><small>{r.recallingFirm}</small></span><span className="recall-reason">{clean(r.reason,110)}</span><span className={`class-badge c-${r.classification.replaceAll(" ","").toLowerCase()}`}>{r.classification}</span><span className="report-date">{formatDate(r.reportDate)}</span><ChevronRight size={18}/></button>)}{filtered.length===0&&<div className="empty"><PackageSearch size={34}/><b>No matching recalls</b><span>Try clearing one or more filters.</span></div>}</div></section>
      <footer><span>Source: U.S. Food & Drug Administration · openFDA Recall Enterprise System</span><span>Updated weekly by FDA</span></footer>
    </div>

    {selected&&<div className="drawer-backdrop" onClick={()=>setSelected(null)}><aside className="detail-drawer" onClick={e=>e.stopPropagation()}><button className="drawer-close" onClick={()=>setSelected(null)} aria-label="Close details"><X/></button><div className={`detail-category ${selected.category}`}><CategoryIcon category={selected.category}/>{selected.category.toUpperCase()} RECALL</div><h2>{selected.product}</h2><div className="detail-tags"><span className={`class-badge c-${selected.classification.replaceAll(" ","").toLowerCase()}`}>{selected.classification}</span><span className="status-tag">{selected.status}</span></div><Detail label="Recalling firm" value={selected.recallingFirm}/><Detail label="Reason for recall" value={selected.reason}/><div className="detail-grid"><Detail label="Report date" value={formatDate(selected.reportDate)}/><Detail label="Initiated" value={formatDate(selected.recallDate)}/><Detail label="Firm state" value={selected.state||"—"}/><Detail label="Action" value={selected.voluntary||"—"}/></div><Detail label="Distribution" value={selected.distribution}/><Detail label="Quantity" value={selected.quantity}/><div className="drawer-note"><ShieldAlert size={18}/><span>Verify product identifiers and instructions with the official FDA recall notice or the recalling firm.</span></div></aside></div>}
  </main>;
}

function Kpi({tone,icon,label,value,detail}:{tone:string;icon:React.ReactNode;label:string;value:string;detail:string}) { return <article className={`kpi ${tone}`}><div className="kpi-symbol">{icon}</div><div><span>{label}</span><b>{value}</b><small>{detail}</small></div></article>; }
function CardTitle({title,subtitle,extra}:{title:string;subtitle:string;extra?:React.ReactNode}) { return <div className="card-title"><div><h2>{title}</h2><p>{subtitle}</p></div>{extra}</div>; }
function FilterSelect({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:string[][]}) { return <Select value={value} onValueChange={onChange}><SelectTrigger className="filter-select" aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(([v,l])=><SelectItem key={v} value={v}>{l}</SelectItem>)}</SelectContent></Select>; }
function Detail({label,value}:{label:string;value:string}) { return <div className="detail-item"><span>{label}</span><p>{value||"Not specified"}</p></div>; }
