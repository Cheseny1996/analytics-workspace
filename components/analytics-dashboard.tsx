"use client";

import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  Check,
  ChevronDown,
  CloudUpload,
  Database,
  Download,
  FileSpreadsheet,
  Filter,
  LayoutDashboard,
  LockKeyhole,
  LogIn,
  LogOut,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { filterRows, groupChannels, groupDaily, summarize } from "@/lib/analytics/metrics";
import { MAX_FILE_BYTES, parseAnalyticsCsv } from "@/lib/analytics/csv";
import type { AnalyticsRow } from "@/lib/analytics/types";
import { signOut } from "@/app/login/actions";

type DashboardMode = "demo" | "empty" | "connected";

export default function AnalyticsDashboard({
  initialRows,
  mode,
  userEmail,
  importName,
}: {
  initialRows: AnalyticsRow[];
  mode: DashboardMode;
  userEmail: string | null;
  importName: string | null;
}) {
  const [rows, setRows] = useState(initialRows);
  const [activeMode, setActiveMode] = useState(mode);
  const [activeImport, setActiveImport] = useState(importName);
  const [period, setPeriod] = useState(30);
  const [channel, setChannel] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [fileError, setFileError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);

  const anchorDate = useMemo(() => {
    const latestDate = rows.reduce((latest, row) => row.date > latest ? row.date : latest, "");
    return latestDate ? new Date(`${latestDate}T23:59:59.999Z`) : new Date();
  }, [rows]);
  const previousAnchor = useMemo(() => new Date(anchorDate.getTime() - period * 86_400_000), [anchorDate, period]);
  const visibleRows = useMemo(() => filterRows(rows, { days: period, channel, search: searchQuery, now: anchorDate }), [rows, period, channel, searchQuery, anchorDate]);
  const previousRows = useMemo(() => filterRows(rows, { days: period, channel, search: searchQuery, now: previousAnchor }), [rows, period, channel, searchQuery, previousAnchor]);
  const summary = useMemo(() => summarize(visibleRows), [visibleRows]);
  const previousSummary = useMemo(() => summarize(previousRows), [previousRows]);
  const daily = useMemo(() => groupDaily(visibleRows), [visibleRows]);
  const channels = useMemo(() => groupChannels(visibleRows), [visibleRows]);
  const previousChannels = useMemo(() => groupChannels(previousRows), [previousRows]);
  const channelOptions = useMemo(() => [...new Set(rows.map((row) => row.channel))].sort(), [rows]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInput.current?.focus();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  async function importFile(file?: File) {
    setFileError("");
    setNotice("");
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setFileError("That file is over the 2 MB limit. Choose a smaller CSV.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setFileError("Choose a .csv file.");
      return;
    }

    try {
      const parsed = parseAnalyticsCsv(await file.text());
      setUploading(true);
      const formData = new FormData();
      formData.set("file", file);
      const response = await fetch("/api/imports", { method: "POST", body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Import failed. Please try again.");
      const importedRows = result.import.records as AnalyticsRow[];
      setRows(importedRows);
      setActiveMode("connected");
      setActiveImport(result.import.name as string);
      setPeriod(30);
      setChannel("all");
      setNotice(`${parsed.length.toLocaleString()} rows securely imported.`);
    } catch (error) {
      setFileError(error instanceof Error ? error.message : "The CSV could not be imported.");
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function exportCsv() {
    const headers = ["date", "revenue", "sessions", "conversions", "channel", "campaign"];
    const escape = (value: string | number) => `"${String(value).replaceAll('"', '""')}"`;
    const contents = [
      headers.join(","),
      ...visibleRows.map((row) => headers.map((header) => escape(row[header as keyof AnalyticsRow])).join(",")),
    ].join("\r\n");
    const url = URL.createObjectURL(new Blob([`\uFEFF${contents}`], { type: "text/csv;charset=utf-8" }));
    const download = document.createElement("a");
    download.href = url;
    download.download = `northstar-${new Date().toISOString().slice(0, 10)}.csv`;
    download.click();
    URL.revokeObjectURL(url);
  }

  const dateRange = daily.length
    ? `${new Date(`${daily[0].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date(`${daily[daily.length - 1].date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
    : "No data in selected range";

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark"><BarChart3 size={19} strokeWidth={2.5} /></span>
          <span>northstar<span className="brand-period">.</span></span>
        </Link>
        <div className="workspace-picker">
          <div className="workspace-avatar">S</div>
          <div className="workspace-info"><strong>Studio workspace</strong><span>Free plan</span></div>
          <ChevronDown size={15} className="muted-icon" />
        </div>
        <span className="nav-label">WORKSPACE</span>
        <nav className="side-nav" aria-label="Main navigation">
          <a className="nav-item active" href="#overview"><LayoutDashboard size={17} /> Overview</a>
          <a className="nav-item" href="#channels"><TrendingUp size={17} /> Acquisition <span className="nav-count">4</span></a>
          <a className="nav-item" href="#performance"><Wallet size={17} /> Revenue</a>
          <button className="nav-item" type="button" onClick={() => fileInput.current?.click()}><Database size={17} /> Data sources</button>
        </nav>
        <span className="nav-label nav-label-spaced">INSIGHTS</span>
        <nav className="side-nav" aria-label="Insights">
          <a className="nav-item" href="#performance"><BarChart3 size={17} /> Reports</a>
          <a className="nav-item" href="#channels"><Users size={17} /> Audiences</a>
        </nav>
        <div className="sidebar-bottom">
          <div className="upgrade-card">
            <div className="upgrade-icon"><Sparkles size={16} /></div>
            <strong>Make better moves.</strong>
            <p>Bring your data together to see the whole picture.</p>
            <button type="button" onClick={() => fileInput.current?.click()}>Connect a source <ArrowUpRight size={14} /></button>
          </div>
          <div className="profile-row">
            <div className="profile-avatar">{userEmail ? userEmail.slice(0, 1).toUpperCase() : "G"}</div>
            <div className="profile-copy"><strong>{userEmail ?? "Guest analyst"}</strong><span>{userEmail ? "Workspace owner" : "Sample workspace"}</span></div>
            {userEmail ? (
              <form action={signOut}><button className="icon-button" title="Sign out" aria-label="Sign out"><LogOut size={16} /></button></form>
            ) : <Link className="icon-button" title="Sign in" aria-label="Sign in" href="/login"><LogIn size={16} /></Link>}
          </div>
        </div>
      </aside>

      <main className="main-content" id="overview">
        <header className="topbar">
          <div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>Overview</strong></div>
          <div className="topbar-actions">
            <button className="quiet-button search-button" type="button" aria-label="Focus search" onClick={() => searchInput.current?.focus()}><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button>
            <span className={`connection-pill ${activeMode === "connected" ? "connected" : "sample"}`}>
              <span className="status-dot" />{activeMode === "connected" ? "Connected" : "Sample data"}
            </span>
            {userEmail ? (
              <div className="top-avatar" title={userEmail}>{userEmail.slice(0, 1).toUpperCase()}</div>
            ) : (
              <Link className="small-signin" href="/login">Sign in <ArrowUpRight size={13} /></Link>
            )}
          </div>
        </header>

        <div className="dashboard-body">
          <div className="page-heading">
            <div>
              <div className="eyebrow-line"><span>YOUR ANALYTICS SNAPSHOT</span><span className="eyebrow-separator" /><span className="live-label"><span /> LIVE OVERVIEW</span></div>
              <h1>Your business, <span>in focus.</span></h1>
              <p className="page-subtitle">{activeMode === "connected" ? `Showing private data${activeImport ? ` from ${activeImport}` : ""}.` : "A clearer view of what's working — and what to do next."}</p>
            </div>
            <div className="heading-actions">
              <button className="outline-button" type="button" onClick={exportCsv}><Download size={15} /> Export</button>
              <button className="primary-button add-data-button" type="button" onClick={() => fileInput.current?.click()} disabled={uploading}>
                <CloudUpload size={16} /> {uploading ? "Importing…" : "Import CSV"}
              </button>
            </div>
          </div>

          {activeMode !== "connected" && !bannerDismissed && (
            <section className={`mode-banner ${activeMode === "demo" ? "demo-banner" : "empty-banner"}`}>
              <div className="banner-icon">{activeMode === "demo" ? <Sparkles size={17} /> : <ShieldCheck size={17} />}</div>
              <div className="banner-copy">
                <strong>{activeMode === "demo" ? "You’re exploring sample data" : "Your private workspace is ready"}</strong>
                <span>{activeMode === "demo" ? "This public preview uses synthetic metrics only. Connect Supabase and sign in to save your own CSV imports." : "This dashboard is showing sample metrics until your first private CSV import."}</span>
              </div>
              <Link href={activeMode === "demo" ? "/login" : "#overview"} className="banner-action">
                {activeMode === "demo" ? "Set up your workspace" : "Import your data"} <ArrowUpRight size={14} />
              </Link>
              {activeMode === "empty" && <button className="icon-button banner-dismiss" type="button" onClick={() => setBannerDismissed(true)} aria-label="Dismiss"><X size={15} /></button>}
            </section>
          )}

          {fileError && <div className="notice error" role="alert"><X size={17} /><span>{fileError}</span><button type="button" onClick={() => setFileError("")} aria-label="Dismiss"><X size={15} /></button></div>}
          {notice && <div className="notice success" role="status"><Check size={17} /><span>{notice}</span><button type="button" onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}
          <input ref={fileInput} className="visually-hidden" type="file" accept=".csv,text/csv" onChange={(event) => importFile(event.target.files?.[0])} />

          <div className="toolbar">
            <div className="filter-label"><Filter size={15} /><span>Filters</span></div>
            <div className="toolbar-divider" />
            <label className="select-control"><CalendarDays size={15} /><span>Last</span><select aria-label="Date range" value={period} onChange={(event) => setPeriod(Number(event.target.value))}><option value={7}>7 days</option><option value={30}>30 days</option><option value={90}>90 days</option></select><ChevronDown size={13} /></label>
            <label className="select-control channel-control"><span>Channel</span><select aria-label="Channel" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="all">All channels</option>{channelOptions.map((option) => <option key={option} value={option}>{option}</option>)}</select><ChevronDown size={13} /></label>
            <label className="search-filter-control"><Search size={14} /><input ref={searchInput} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search campaigns" aria-label="Search channels and campaigns" /></label>
            <span className="range-note"><span className="range-dot" /> {dateRange}</span>
            <button className="icon-button more-button" type="button" aria-label="More filters"><MoreHorizontal size={19} /></button>
          </div>

          <section className="metric-grid" aria-label="Key metrics">
            <MetricCard title="Total revenue" value={currency(summary.revenue)} change={getChange(summary.revenue, previousSummary.revenue, previousRows.length > 0)} positive={summary.revenue >= previousSummary.revenue} icon={<Wallet size={17} />} detail={previousRows.length ? "vs. previous period" : "no comparison data"} />
            <MetricCard title="Sessions" value={compact(summary.sessions)} change={getChange(summary.sessions, previousSummary.sessions, previousRows.length > 0)} positive={summary.sessions >= previousSummary.sessions} icon={<Users size={17} />} detail={previousRows.length ? "vs. previous period" : "no comparison data"} />
            <MetricCard title="Conversions" value={compact(summary.conversions)} change={getChange(summary.conversions, previousSummary.conversions, previousRows.length > 0)} positive={summary.conversions >= previousSummary.conversions} icon={<TrendingUp size={17} />} detail={previousRows.length ? "vs. previous period" : "no comparison data"} />
            <MetricCard title="Conversion rate" value={`${summary.conversionRate.toFixed(2)}%`} change={getChange(summary.conversionRate, previousSummary.conversionRate, previousRows.length > 0)} positive={summary.conversionRate >= previousSummary.conversionRate} icon={<BarChart3 size={17} />} detail={previousRows.length ? "vs. previous period" : "no comparison data"} />
          </section>

          <section className="chart-grid">
            <article className="panel revenue-panel" id="performance">
              <div className="panel-heading">
                <div><div className="panel-kicker">PERFORMANCE</div><h2>Revenue over time</h2></div>
                <button className="icon-button chart-menu" type="button" aria-label="Chart options"><MoreHorizontal size={19} /></button>
              </div>
              <div className="chart-summary"><strong>{currency(summary.revenue)}</strong>{previousRows.length > 0 && <span className={`trend-chip ${summary.revenue < previousSummary.revenue ? "trend-down" : ""}`}>{summary.revenue < previousSummary.revenue ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />} {getChange(summary.revenue, previousSummary.revenue, true)}</span>}<span className="chart-summary-note">{previousRows.length ? "compared to previous period" : "selected period"}</span></div>
              <RevenueChart values={daily.map((day) => day.revenue)} />
              <div className="chart-axis">{axisDates(daily.map((day) => day.date)).map((date, index) => <span key={`${date}-${index}`}>{date}</span>)}</div>
              <div className="chart-legend"><span className="legend-dot" /> Revenue <span className="legend-period">{period} day view</span></div>
            </article>
            <article className="panel channel-panel" id="channels">
              <div className="panel-heading">
                <div><div className="panel-kicker">ACQUISITION</div><h2>Channel mix</h2></div>
                <button className="icon-button chart-menu" type="button" aria-label="Chart options"><MoreHorizontal size={19} /></button>
              </div>
              <div className="donut-wrap">
                <DonutChart values={channels.map((item) => item.revenue)} />
                <div className="donut-center"><span>Total revenue</span><strong>{currency(summary.revenue, true)}</strong><small>this period</small></div>
              </div>
              <div className="channel-legend">
                {channels.slice(0, 4).map((item, index) => (
                  <div className="channel-legend-row" key={item.channel}>
                    <span className={`channel-dot dot-${index}`} /><span className="legend-channel-name">{item.channel}</span>
                    <strong>{summary.revenue ? `${((item.revenue / summary.revenue) * 100).toFixed(0)}%` : "0%"}</strong>
                  </div>
                ))}
              </div>
            </article>
          </section>

          <section className="panel table-panel">
            <div className="panel-heading table-heading">
              <div><div className="panel-kicker">YOUR TOP PERFORMERS</div><h2>Channel performance</h2></div>
              <button className="text-button" type="button" onClick={() => setChannel("all")}>View all channels <ArrowUpRight size={14} /></button>
            </div>
            <div className="table-scroll">
              <table>
                <thead><tr><th>CHANNEL</th><th>REVENUE</th><th>SESSIONS</th><th>CONVERSIONS</th><th>CONVERSION RATE</th><th>TREND</th></tr></thead>
                <tbody>
                  {channels.map((item, index) => {
                    const rate = item.sessions ? (item.conversions / item.sessions) * 100 : 0;
                    const previousRevenue = previousChannels.find((previous) => previous.channel === item.channel)?.revenue ?? 0;
                    const hasPrevious = previousRows.length > 0;
                    const revenueChange = getChange(item.revenue, previousRevenue, hasPrevious);
                    return (
                      <tr key={item.channel}>
                        <td><span className={`table-channel-icon dot-${index}`}><TrendingUp size={13} /></span><strong>{item.channel}</strong></td>
                        <td className="numeric-cell">{currency(item.revenue)}</td>
                        <td className="numeric-cell">{item.sessions.toLocaleString()}</td>
                        <td className="numeric-cell">{item.conversions.toLocaleString()}</td>
                        <td><span className="rate-value">{rate.toFixed(2)}%</span></td>
                        <td><span className={`trend-label ${hasPrevious && item.revenue < previousRevenue ? "negative" : ""}`}>{hasPrevious && item.revenue < previousRevenue ? <ArrowDownRight size={14} /> : hasPrevious ? <ArrowUpRight size={14} /> : null}{revenueChange}</span></td>
                      </tr>
                    );
                  })}
                  {!channels.length && <tr><td colSpan={6} className="empty-table">No records match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="table-footer"><span>Updated just now <span className="footer-dot">·</span> {channels.length} channels</span><button type="button" className="table-footer-link" onClick={() => fileInput.current?.click()}><FileSpreadsheet size={14} /> Upload a new CSV</button></div>
          </section>
          <footer className="dashboard-footer"><span>© 2026 Northstar Analytics</span><span><LockKeyhole size={13} /> {activeMode === "connected" ? "Private workspace" : "Synthetic sample · No personal data"}</span></footer>
        </div>
      </main>
    </div>
  );
}

function MetricCard({ title, value, change, positive, icon, detail }: { title: string; value: string; change: string; positive: boolean; icon: React.ReactNode; detail: string }) {
  return (
    <article className="metric-card">
      <div className="metric-title-row"><span>{title}</span><span className="metric-icon">{icon}</span></div>
      <strong className="metric-value">{value}</strong>
      <div className="metric-meta"><span className={`metric-change ${positive ? "" : "negative"}`}>{change !== "—" && (positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />)}{change}</span><span>{detail}</span></div>
      <div className="metric-spark"><Sparkline seed={title.length} /></div>
    </article>
  );
}

function RevenueChart({ values }: { values: number[] }) {
  const width = 620;
  const height = 166;
  const padding = { top: 10, right: 4, bottom: 4, left: 4 };
  const max = Math.max(...values, 1) * 1.16;
  const points = values.map((value, index) => ({
    x: padding.left + (index / Math.max(values.length - 1, 1)) * (width - padding.left - padding.right),
    y: height - padding.bottom - (value / max) * (height - padding.top - padding.bottom),
  }));
  const line = points.map((point, index) => `${index ? "L" : "M"} ${point.x} ${point.y}`).join(" ");
  const fill = `${line} L ${points.at(-1)?.x ?? width} ${height} L ${points[0]?.x ?? 0} ${height} Z`;
  return (
    <div className="revenue-chart" role="img" aria-label="Revenue trend over the selected period">
      <div className="chart-y-labels"><span>{currency(max, true)}</span><span>{currency(max * 0.66, true)}</span><span>{currency(max * 0.33, true)}</span><span>$0</span></div>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        {[0.25, 0.5, 0.75, 1].map((lineAt) => <line key={lineAt} x1="0" x2={width} y1={height * lineAt} y2={height * lineAt} className="grid-line" />)}
        <defs><linearGradient id="revenue-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#6e7bf7" stopOpacity=".25" /><stop offset="100%" stopColor="#6e7bf7" stopOpacity="0" /></linearGradient></defs>
        <path d={fill} fill="url(#revenue-fill)" />
        <path d={line} className="revenue-line" />
        {points.length > 0 && <circle cx={points.at(-1)?.x} cy={points.at(-1)?.y} r="4" className="chart-end-dot" />}
      </svg>
    </div>
  );
}

function DonutChart({ values }: { values: number[] }) {
  const colors = ["#6e7bf7", "#53c7a8", "#f0ac62", "#7bb3ee"];
  const total = values.reduce((sum, value) => sum + value, 0);
  const circumference = 2 * Math.PI * 53;
  return (
    <svg className="donut-chart" viewBox="0 0 140 140" role="img" aria-label="Revenue split by channel">
      <circle cx="70" cy="70" r="53" fill="none" stroke="#f1f3f8" strokeWidth="13" />
      {values.map((value, index) => {
        const segment = total ? (value / total) * circumference : 0;
        const offset = values.slice(0, index).reduce((sum, previous) => sum + (total ? (previous / total) * circumference : 0), 0);
        return <circle key={index} cx="70" cy="70" r="53" fill="none" stroke={colors[index % colors.length]} strokeWidth="13" strokeDasharray={`${segment} ${circumference - segment}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
      })}
    </svg>
  );
}

function Sparkline({ seed }: { seed: number }) {
  const points = Array.from({ length: 10 }, (_, index) => `${index * 10},${14 + Math.sin(index * 0.95 + seed) * 5 + ((index * seed) % 4)}`).join(" ");
  return <svg viewBox="0 0 90 26" preserveAspectRatio="none" aria-hidden="true"><polyline points={points} /></svg>;
}

function axisDates(dates: string[]) {
  if (!dates.length) return ["—", "—", "—", "—", "—"];
  return Array.from({ length: 5 }, (_, index) => {
    const date = dates[Math.round((index / 4) * (dates.length - 1))];
    return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  });
}

function compact(value: number) {
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function currency(value: number, short = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: short ? "compact" : "standard",
    maximumFractionDigits: short ? 1 : 0,
  }).format(value);
}

function getChange(current: number, previous: number, hasPrevious: boolean) {
  if (!hasPrevious) return "—";
  if (previous === 0) return current === 0 ? "0.0%" : "New";
  const change = ((current - previous) / previous) * 100;
  return `${change > 0 ? "+" : ""}${change.toFixed(1)}%`;
}
