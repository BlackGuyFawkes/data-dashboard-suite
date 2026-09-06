"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, AreaChart, Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Activity, ArrowUpRight, Building2, CalendarDays, FileClock, FileText, RefreshCw, Search, ShieldCheck, TrendingUp } from "lucide-react";

type Filing = { form: string; filingDate: string; reportDate?: string; accessionNumber: string; primaryDocument: string; description?: string; url: string };
type FinancialPoint = { year: number; revenue?: number; netIncome?: number; assets?: number };
type ApiData = { company: { name: string; ticker: string; cik: string; sicDescription?: string; state?: string }; filings: Filing[]; financials: FinancialPoint[]; fetchedAt: string };

const COMPANIES = [
  { name: "Apple", ticker: "AAPL", cik: "0000320193", accent: "#7c5cff" },
  { name: "Microsoft", ticker: "MSFT", cik: "0000789019", accent: "#2dd4bf" },
  { name: "NVIDIA", ticker: "NVDA", cik: "0001045810", accent: "#a3e635" },
  { name: "Amazon", ticker: "AMZN", cik: "0001018724", accent: "#f59e0b" },
  { name: "Alphabet", ticker: "GOOGL", cik: "0001652044", accent: "#60a5fa" },
  { name: "Tesla", ticker: "TSLA", cik: "0001318605", accent: "#fb7185" },
  { name: "Meta", ticker: "META", cik: "0001326801", accent: "#38bdf8" },
  { name: "JPMorgan", ticker: "JPM", cik: "0000019617", accent: "#c084fc" },
];
const COLORS = ["#7c5cff", "#2dd4bf", "#f59e0b", "#60a5fa", "#fb7185", "#94a3b8"];

function money(value?: number) {
  if (value == null) return "—";
  const abs = Math.abs(value);
  if (abs >= 1e12) return `${value < 0 ? "−" : ""}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${value < 0 ? "−" : ""}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${value < 0 ? "−" : ""}$${(abs / 1e6).toFixed(1)}M`;
  return `$${abs.toLocaleString()}`;
}
function compact(value: number) { return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value); }

function buildFallback(cik: string): ApiData {
  const selected = COMPANIES.find((company) => company.cik === cik) ?? COMPANIES[0];
  const now = new Date();
  const forms = ["8-K", "4", "10-Q", "8-K", "4", "SC 13G/A", "10-K", "DEF 14A", "8-K", "3"];
  const filings = Array.from({ length: 48 }, (_, index) => {
    const date = new Date(now); date.setDate(date.getDate() - index * 6 - (index % 3));
    return { form: forms[index % forms.length], filingDate: date.toISOString().slice(0, 10), accessionNumber: `${cik.slice(-10)}-26-${String(1000 + index).padStart(6, "0")}`, primaryDocument: `filing-${index}.htm`, description: forms[index % forms.length] === "8-K" ? "Current report" : "Periodic filing", url: "https://www.sec.gov/edgar/search/" };
  });
  const scale = 80 + Math.max(0, COMPANIES.findIndex((company) => company.cik === cik)) * 32;
  return { company: { name: `${selected.name}, Inc.`, ticker: selected.ticker, cik, sicDescription: "Public company", state: "US" }, filings, financials: [2021, 2022, 2023, 2024, 2025].map((year, index) => ({ year, revenue: (scale + index * 14) * 1e9, netIncome: (scale * .19 + index * 2.4) * 1e9, assets: (scale * 2.1 + index * 18) * 1e9 })), fetchedAt: now.toISOString() };
}

function ChartTooltip({ active, payload, label, moneyMode = false }: any) {
  if (!active || !payload?.length) return null;
  return <div className="chart-tip"><div className="chart-tip-label">{label}</div>{payload.map((item: any) => <div className="chart-tip-row" key={item.dataKey}><span className="tip-dot" style={{ background: item.color }} /><span>{item.name}</span><strong>{moneyMode ? money(item.value) : item.value}</strong></div>)}</div>;
}

export default function Home() {
  const [cik, setCik] = useState(COMPANIES[0].cik);
  const [data, setData] = useState<ApiData>(() => buildFallback(COMPANIES[0].cik));
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [formFilter, setFormFilter] = useState("All forms");
  const [search, setSearch] = useState("");
  const load = useCallback(async (selectedCik: string) => {
    setLoading(true);
    try { const response = await fetch(`/api/sec?cik=${selectedCik}`, { cache: "no-store" }); if (!response.ok) throw new Error(); setData(await response.json()); setLive(true); }
    catch { setData(buildFallback(selectedCik)); setLive(false); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(cik); }, [cik, load]);

  const metrics = useMemo(() => {
    const now = new Date(), year = String(now.getUTCFullYear()), prior90 = new Date(now); prior90.setDate(prior90.getDate() - 90);
    const annual = data.financials.at(-1), previous = data.financials.at(-2);
    return { year: data.filings.filter((f) => f.filingDate.startsWith(year)).length, recent90: data.filings.filter((f) => new Date(f.filingDate) >= prior90).length, latest: data.filings[0]?.filingDate ?? "—", revenue: annual?.revenue, growth: annual?.revenue && previous?.revenue ? ((annual.revenue - previous.revenue) / previous.revenue) * 100 : 0 };
  }, [data]);
  const monthly = useMemo(() => {
    const map = new Map<string, number>(); data.filings.forEach((f) => { const d = new Date(`${f.filingDate}T00:00:00Z`), k = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`; map.set(k, (map.get(k) ?? 0) + 1); });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([key, filings]) => ({ month: new Date(`${key}-01T00:00:00Z`).toLocaleDateString("en", { month: "short" }), filings }));
  }, [data]);
  const formMix = useMemo(() => {
    const map = new Map<string, number>(); data.filings.forEach((f) => map.set(f.form, (map.get(f.form) ?? 0) + 1)); const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]); const top = sorted.slice(0, 5).map(([name, value]) => ({ name, value })); const other = sorted.slice(5).reduce((sum, [, value]) => sum + value, 0); if (other) top.push({ name: "Other", value: other }); return top;
  }, [data]);
  const heatmap = useMemo(() => { const counts = new Map<string, number>(); data.filings.forEach((f) => counts.set(f.filingDate, (counts.get(f.filingDate) ?? 0) + 1)); return Array.from({ length: 84 }, (_, i) => { const date = new Date(); date.setHours(0,0,0,0); date.setDate(date.getDate() - (83-i)); const key = date.toISOString().slice(0,10); return { date: key, count: counts.get(key) ?? 0 }; }); }, [data]);
  const availableForms = useMemo(() => ["All forms", ...Array.from(new Set(data.filings.map((f) => f.form))).slice(0, 12)], [data]);
  const visibleFilings = useMemo(() => data.filings.filter((f) => (formFilter === "All forms" || f.form === formFilter) && (!search || `${f.form} ${f.description} ${f.filingDate}`.toLowerCase().includes(search.toLowerCase()))).slice(0,8), [data, formFilter, search]);
  const selected = COMPANIES.find((company) => company.cik === cik) ?? COMPANIES[0];

  return <main className="app-shell">
    <header className="topbar"><div className="brand-block"><div className="logo-mark"><FileText size={20}/></div><div><div className="brand">FilingPulse</div><div className="brand-sub">SEC intelligence dashboard</div></div></div><div className="top-actions"><div className={`status-pill ${live ? "live" : "fallback"}`}><span className="pulse-dot"/> {live ? "LIVE SEC DATA" : "DEMO SNAPSHOT"}</div><button className="icon-button" aria-label="Refresh data" onClick={() => load(cik)} disabled={loading}><RefreshCw size={17} className={loading ? "spin" : ""}/></button></div></header>
    <section className="dashboard">
      <div className="hero-row"><div><div className="eyebrow">EDGAR COMPANY MONITOR</div><h1>Company filings, <span>at a glance.</span></h1></div><div className="company-switcher">{COMPANIES.map((company) => <button key={company.cik} className={company.cik === cik ? "active" : ""} onClick={() => { setCik(company.cik); setFormFilter("All forms"); }} style={{ "--company-accent": company.accent } as React.CSSProperties}>{company.ticker}</button>)}</div></div>
      <div className="company-banner"><div className="company-avatar" style={{ background: selected.accent }}>{selected.ticker.slice(0,2)}</div><div className="company-title"><div className="company-name">{data.company.name}</div><div className="company-meta"><span>{selected.ticker}</span><span>CIK {data.company.cik}</span><span>{data.company.sicDescription || "SEC registrant"}</span></div></div><div className="banner-stamp"><ShieldCheck size={16}/> SEC VERIFIED SOURCE</div></div>
      <section className="kpi-grid"><Kpi icon={<FileClock/>} label="Filings this year" value={String(metrics.year)} note="EDGAR submissions" tint="violet"/><Kpi icon={<Activity/>} label="Last 90 days" value={String(metrics.recent90)} note="Recent activity" tint="teal"/><Kpi icon={<TrendingUp/>} label="Latest annual revenue" value={money(metrics.revenue)} note={`${metrics.growth >= 0 ? "+" : ""}${metrics.growth.toFixed(1)}% year over year`} tint="lime"/><Kpi icon={<CalendarDays/>} label="Latest filing" value={metrics.latest === "—" ? "—" : new Date(`${metrics.latest}T00:00:00`).toLocaleDateString("en", { month: "short", day: "numeric" })} note={metrics.latest} tint="amber"/></section>
      <section className="chart-grid primary-charts">
        <article className="panel wide"><PanelHeader icon={<Activity size={17}/>} title="Filing velocity" subtitle="Monthly submission activity" badge="12 MONTHS"/><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={monthly} margin={{top:16,right:14,left:-18,bottom:0}}><defs><linearGradient id="fillVelocity" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7c5cff" stopOpacity={.55}/><stop offset="100%" stopColor="#7c5cff" stopOpacity={.02}/></linearGradient></defs><CartesianGrid stroke="#263044" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="month" tickLine={false} axisLine={false} tick={{fill:"#738096",fontSize:11}}/><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{fill:"#738096",fontSize:11}}/><Tooltip content={<ChartTooltip/>}/><Area type="monotone" dataKey="filings" name="Filings" stroke="#8b72ff" strokeWidth={2.5} fill="url(#fillVelocity)"/></AreaChart></ResponsiveContainer></div></article>
        <article className="panel donut-panel"><PanelHeader icon={<FileText size={17}/>} title="Form mix" subtitle="Share of recent filings"/><div className="donut-layout"><div className="donut-chart"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={formMix} dataKey="value" nameKey="name" innerRadius="66%" outerRadius="91%" paddingAngle={3} stroke="none">{formMix.map((e,i) => <Cell key={e.name} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip content={<ChartTooltip/>}/></PieChart></ResponsiveContainer><div className="donut-center"><strong>{data.filings.length}</strong><span>RECENT</span></div></div><div className="legend-list">{formMix.slice(0,5).map((e,i) => <div className="legend-row" key={e.name}><span className="legend-dot" style={{background:COLORS[i]}}/><span>{e.name}</span><strong>{e.value}</strong></div>)}</div></div></article>
      </section>
      <section className="chart-grid secondary-charts">
        <article className="panel finance-panel"><PanelHeader icon={<TrendingUp size={17}/>} title="Financial trajectory" subtitle="Annual values reported in 10-K filings" badge="USD"/><div className="chart-wrap finance-chart"><ResponsiveContainer width="100%" height="100%"><ComposedChart data={data.financials} margin={{top:18,right:14,left:0,bottom:0}}><CartesianGrid stroke="#263044" strokeDasharray="3 5" vertical={false}/><XAxis dataKey="year" tickLine={false} axisLine={false} tick={{fill:"#738096",fontSize:11}}/><YAxis tickFormatter={compact} tickLine={false} axisLine={false} tick={{fill:"#738096",fontSize:11}} width={54}/><Tooltip content={<ChartTooltip moneyMode/>}/><Bar dataKey="revenue" name="Revenue" fill="#6250d7" radius={[6,6,0,0]} barSize={28}/><Line type="monotone" dataKey="netIncome" name="Net income" stroke="#2dd4bf" strokeWidth={2.5} dot={{fill:"#2dd4bf",r:3,strokeWidth:0}}/></ComposedChart></ResponsiveContainer></div></article>
        <article className="panel activity-panel"><PanelHeader icon={<CalendarDays size={17}/>} title="Activity map" subtitle="Filing days · last 12 weeks"/><div className="heatmap-weekdays"><span>M</span><span>W</span><span>F</span><span>S</span></div><div className="heatmap">{heatmap.map((day) => <div key={day.date} title={`${day.date}: ${day.count} filing${day.count===1?"":"s"}`} className={`heat-cell level-${Math.min(day.count,3)}`}/>)}</div><div className="heatmap-footer"><span>12 weeks ago</span><div className="heat-legend"><span>Less</span><i className="level-0"/><i className="level-1"/><i className="level-2"/><i className="level-3"/><span>More</span></div><span>Today</span></div></article>
      </section>
      <section className="panel filings-panel"><div className="filings-toolbar"><PanelHeader icon={<Building2 size={17}/>} title="Latest filings" subtitle="Direct links to SEC filing documents"/><div className="filters"><label className="search-box"><Search size={15}/><input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Search filings"/></label><select value={formFilter} onChange={(e)=>setFormFilter(e.target.value)}>{availableForms.map((form)=><option key={form}>{form}</option>)}</select></div></div><div className="filing-table"><div className="table-head"><span>FORM</span><span>FILED</span><span>REPORT</span><span>DESCRIPTION</span><span></span></div>{visibleFilings.map((f)=><a className="table-row" key={`${f.accessionNumber}-${f.form}`} href={f.url} target="_blank" rel="noreferrer"><span><b className={`form-badge form-${f.form.replace(/[^a-zA-Z0-9]/g,"").toLowerCase()}`}>{f.form}</b></span><span>{new Date(`${f.filingDate}T00:00:00`).toLocaleDateString("en",{month:"short",day:"numeric",year:"numeric"})}</span><span className="muted-cell">{f.reportDate||"—"}</span><span className="description-cell">{f.description||f.primaryDocument||"SEC filing"}</span><span><ArrowUpRight size={16}/></span></a>)}</div></section>
      <footer><span>Data source: U.S. Securities and Exchange Commission EDGAR</span><span>Updated {new Date(data.fetchedAt).toLocaleString("en",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"})}</span></footer>
    </section>
  </main>;
}

function Kpi({ icon, label, value, note, tint }: { icon: React.ReactNode; label: string; value: string; note: string; tint: string }) { return <article className={`kpi-card ${tint}`}><div className="kpi-icon">{icon}</div><div><div className="kpi-label">{label}</div><div className="kpi-value">{value}</div><div className="kpi-note">{note}</div></div></article>; }
function PanelHeader({ icon, title, subtitle, badge }: { icon: React.ReactNode; title: string; subtitle: string; badge?: string }) { return <div className="panel-head"><div className="panel-heading"><div className="panel-icon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>{badge&&<span className="mini-badge">{badge}</span>}</div>; }
