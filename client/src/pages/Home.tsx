import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  Check,
  ChevronDown,
  CircleCheck,
  Filter,
  LayoutDashboard,
  LogOut,
  Menu,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  WalletCards,
  X,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { calculateTradeMetrics, hasCompletedResult, resultAmount } from "@shared/tradeMetrics";

export type JournalEntry = {
  id: number;
  pair: string;
  type: string;
  setup: string;
  date: string;
  result: string;
  percent: string;
  status: string;
  accent: string;
  reason: string;
  rr: string;
  feeling: string;
  beforeImage?: string;
  afterImage?: string;
  outcome?: string;
  reviewNotes?: string;
  reviewedAt?: string;
};

const initialEntries: JournalEntry[] = [];

const chartData = [
  { day: "Mon", value: 26, label: "+$120" },
  { day: "Tue", value: 42, label: "+$210" },
  { day: "Wed", value: 34, label: "+$170" },
  { day: "Thu", value: 58, label: "+$320" },
  { day: "Fri", value: 73, label: "+$448" },
  { day: "Sat", value: 67, label: "+$410" },
  { day: "Sun", value: 86, label: "+$512" },
];

const fallbackMarketTicker = [
  { symbol: "XAUUSD", name: "Gold / US Dollar", price: "2,654.80", change: "+0.62%", tone: "up", points: "0,42 16,36 32,40 48,26 64,30 80,16 96,21 112,8" },
  { symbol: "BTCUSD", name: "Bitcoin / US Dollar", price: "63,842.10", change: "+1.84%", tone: "up", points: "0,34 16,39 32,25 48,29 64,17 80,22 96,10 112,14" },
  { symbol: "USDJPY", name: "US Dollar / Yen", price: "143.862", change: "-0.28%", tone: "down", points: "0,11 16,19 32,14 48,29 64,22 80,34 96,29 112,42" },
  { symbol: "CADJPY", name: "Canadian Dollar / Yen", price: "106.214", change: "+0.15%", tone: "up", points: "0,38 16,30 32,33 48,23 64,27 80,15 96,20 112,10" },
  { symbol: "EURUSD", name: "Euro / US Dollar", price: "1.0824", change: "+0.41%", tone: "up", points: "0,39 16,35 32,37 48,23 64,27 80,19 96,21 112,11" },
];

type MarketQuote = typeof fallbackMarketTicker[number];

function MarketTicker({ timestamp }: { timestamp: string }) {
  const [markets, setMarkets] = useState<MarketQuote[]>(fallbackMarketTicker);
  const [isLive, setIsLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadQuotes() {
      try {
        const [fxResponse, btcResponse] = await Promise.all([
          fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=EUR,JPY,CAD"),
          fetch("https://api.coinbase.com/v2/prices/BTC-USD/spot"),
        ]);
        const fx = await fxResponse.json() as { rates?: Record<string, number> };
        const btc = await btcResponse.json() as { data?: { amount?: string } };
        const eurusd = fx.rates?.EUR ? 1 / fx.rates.EUR : null;
        const usdjpy = fx.rates?.JPY ?? null;
        const cadjpy = fx.rates?.JPY && fx.rates?.CAD ? fx.rates.JPY / fx.rates.CAD : null;
        const btcusd = btc.data?.amount ? Number(btc.data.amount) : null;
        if (cancelled || (!eurusd && !usdjpy && !cadjpy && !btcusd)) return;
        setMarkets(fallbackMarketTicker.map((market) => {
          const livePrice = market.symbol === "BTCUSD" ? btcusd : market.symbol === "EURUSD" ? eurusd : market.symbol === "USDJPY" ? usdjpy : market.symbol === "CADJPY" ? cadjpy : null;
          if (!livePrice) return market;
          return { ...market, price: livePrice.toLocaleString(undefined, { minimumFractionDigits: market.symbol === "BTCUSD" ? 2 : 3, maximumFractionDigits: market.symbol === "BTCUSD" ? 2 : 5 }), change: "Live", tone: "up" };
        }));
        setIsLive(true);
      } catch {
        if (!cancelled) setIsLive(false);
      }
    }
    void loadQuotes();
    const timer = window.setInterval(loadQuotes, 60_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, []);
  return (
    <section className="market-ticker" aria-label="Top traded markets">
      <div className="ticker-heading"><span className={`ticker-live-dot ${isLive ? "is-live" : ""}`} /><div><strong>Top markets</strong><span>{isLive ? "Live prices · updates every minute" : `Snapshot at ${timestamp} local time · fallback`}</span></div></div>
      <div className="ticker-window">
        <div className="ticker-track">
          {[...markets, ...markets].map((market, index) => (
            <div className="ticker-card" key={`${market.symbol}-${index}`}>
              <div className="ticker-card-head"><div><strong>{market.symbol}</strong><span>{market.name}</span></div><span className={`ticker-change ${market.tone}`}>{market.change}</span></div>
              <div className="ticker-card-bottom"><strong className="ticker-price">{market.price}</strong><svg className={`ticker-chart ${market.tone}`} viewBox="0 0 112 48" preserveAspectRatio="none" role="img" aria-label={`${market.symbol} mini price chart`}><polyline points={market.points} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Journal", icon: BookOpen },
  { label: "Analytics", icon: BarChart3 },
  { label: "Goals", icon: Target },
];

function formatMoney(value: number) {
  return `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
}

function buildEquityPath(entries: JournalEntry[]) {
  const values = entries.filter((entry) => hasCompletedResult(entry.outcome || entry.result)).slice().reverse().reduce<number[]>((curve, entry) => {
    curve.push((curve[curve.length - 1] || 0) + resultAmount(entry.outcome || entry.result));
    return curve;
  }, []);
  if (!values.length) return { line: "M0 205 L700 205", area: "M0 205 L700 205 L700 230 L0 230 Z", endpointY: 205, labels: ["No trades yet"] };
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = Math.max(max - min, 1);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 700 : (index / (values.length - 1)) * 700;
    const y = 205 - ((value - min) / range) * 160;
    return `${x.toFixed(1)} ${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  const endpointY = Number(points[points.length - 1].split(" ")[1]);
  return { line, area: `${line} L700 230 L0 230 Z`, endpointY, labels: entries.slice().reverse().slice(-7).map((entry) => entry.date.split(",")[0].slice(0, 3)) };
}

function AnalyticsPanel({ entries }: { entries: JournalEntry[] }) {
  const metrics = calculateTradeMetrics(entries);
  const largestWin = entries.reduce((best, entry) => Math.max(best, resultAmount(entry.result)), 0);
  const largestLoss = entries.reduce((worst, entry) => Math.min(worst, resultAmount(entry.result)), 0);
  return (
    <section className="analytics-panel panel" aria-labelledby="analytics-title">
      <div className="panel-head"><div><div className="panel-kicker">Performance analytics</div><h2 id="analytics-title">Your trading edge</h2><p className="analytics-subtitle">Every figure below is calculated from your saved journal entries.</p></div><div className="analytics-live"><span className="live-dot" /> Live from journal</div></div>
      <div className="analytics-grid">
        <div className="analytics-stat"><span>Total trades</span><strong>{metrics.count}</strong><small>{metrics.wins} wins · {metrics.losses} losses</small></div>
        <div className="analytics-stat"><span>Net P&amp;L</span><strong>{formatMoney(metrics.net)}</strong><small>Average {formatMoney(metrics.average)} per trade</small></div>
        <div className="analytics-stat"><span>Best trade</span><strong>{formatMoney(largestWin)}</strong><small>Largest recorded winner</small></div>
        <div className="analytics-stat"><span>Largest loss</span><strong>{formatMoney(largestLoss)}</strong><small>Largest recorded loser</small></div>
      </div>
      {!entries.length && <div className="analytics-empty"><BarChart3 size={18} /><div><strong>Analytics will appear after your first trade</strong><span>Log a completed trade to start building your performance history.</span></div></div>}
    </section>
  );
}

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof TrendingUp;
  tone: "blue" | "mint" | "purple" | "orange";
}) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${tone}`}>
        <Icon size={17} strokeWidth={2.2} />
      </div>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className={`stat-detail ${tone === "orange" ? "negative" : ""}`}>
        {detail}
      </div>
    </div>
  );
}

function JournalRow({ entry, onReview }: { entry: JournalEntry; onReview: (entry: JournalEntry) => void }) {
  const displayResult = entry.outcome || entry.result;
  const displayStatus = entry.outcome ? entry.status : "Open";
  return (
    <div className="journal-row">
      <div className={`pair-mark ${entry.accent}`}>{entry.pair.slice(0, 2)}</div>
      <div className="journal-main"><div className="journal-pair">{entry.pair}</div><div className="journal-setup">{entry.setup} <span>•</span> {entry.date} <span>•</span> {entry.feeling} <span>•</span> R:R {entry.rr}</div></div>
      <div className={`direction ${entry.type.toLowerCase()}`}>{entry.type === "Long" ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{entry.type}</div>
      <div className={`trade-result ${displayStatus.toLowerCase()}`}><strong>{displayResult}</strong><span>{entry.outcome ? entry.percent : "Awaiting review"}</span></div>
      {(entry.beforeImage || entry.afterImage) && <div className="trade-images" aria-label="Trade before and after images">{entry.beforeImage && <img src={entry.beforeImage} alt="Before trade" />}{entry.afterImage && <img src={entry.afterImage} alt="After trade" />}</div>}
      <div className="row-menu" aria-label={`Review ${entry.pair}`}><button className="review-entry-button" onClick={() => onReview(entry)}>{entry.outcome ? "View review" : "Review trade"}</button></div>
    </div>
  );
}

export default function Home() {
  const { user, logout } = useAuth();
  const [activeNav, setActiveNav] = useState("Overview");
  const [timeframe, setTimeframe] = useState("This week");
  const [showEntry, setShowEntry] = useState(false);
  const [reviewEntry, setReviewEntry] = useState<JournalEntry | null>(null);
  const [showMobileNav, setShowMobileNav] = useState(false);
  const [filter, setFilter] = useState("All trades");
  const storageKey = `trading-edge-journal-trades-${user?.openId || user?.email || "guest"}`;
  const [journalNow, setJournalNow] = useState(() => new Date());
  const [entries, setEntries] = useState<JournalEntry[]>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      return stored ? JSON.parse(stored) as JournalEntry[] : initialEntries;
    } catch {
      return initialEntries;
    }
  });
  const [form, setForm] = useState({ pair: "", type: "Long", setup: "", result: "", reason: "", rr: "", feeling: "😌", beforeImage: "", afterImage: "" });
  const [reviewForm, setReviewForm] = useState({ result: "", afterImage: "", notes: "" });
  const [lotInputs, setLotInputs] = useState({ balance: "10000", risk: "1", stop: "25", pipValue: "10" });

  useEffect(() => {
    try { localStorage.setItem(storageKey, JSON.stringify(entries)); } catch { /* storage is optional */ }
  }, [entries, storageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => setJournalNow(new Date()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const lotCalculation = useMemo(() => {
    const balance = Number(lotInputs.balance) || 0;
    const risk = Number(lotInputs.risk) || 0;
    const stop = Number(lotInputs.stop) || 0;
    const pipValue = Number(lotInputs.pipValue) || 0;
    const riskAmount = balance * (risk / 100);
    const lotSize = stop > 0 && pipValue > 0 ? riskAmount / (stop * pipValue) : 0;
    return { riskAmount, lotSize };
  }, [lotInputs]);

  const visibleEntries = useMemo(() => {
    if (filter === "Wins") return entries.filter((entry) => entry.status === "Win");
    if (filter === "Losses") return entries.filter((entry) => entry.status === "Loss");
    return entries;
  }, [entries, filter]);

  const tradeMetrics = useMemo(() => calculateTradeMetrics(entries), [entries]);

  const equityPath = useMemo(() => buildEquityPath(entries), [entries]);
  const journalDate = journalNow.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const journalTime = journalNow.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });

  function handleNewEntry() {
    setShowEntry(true);
  }

  function handleImageChange(field: "beforeImage" | "afterImage", file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setForm((current) => ({ ...current, [field]: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  function handleReviewImageChange(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setReviewForm((current) => ({ ...current, afterImage: String(reader.result) }));
    reader.readAsDataURL(file);
  }

  function openReview(entry: JournalEntry) {
    setReviewEntry(entry);
    setReviewForm({ result: entry.outcome ? entry.outcome.replace(/[^\d.-]/g, "") : "", afterImage: entry.afterImage || "", notes: entry.reviewNotes || "" });
  }

  function handleSaveReview(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reviewEntry) return;
    const amount = Number(reviewForm.result);
    if (!Number.isFinite(amount) || reviewForm.result.trim() === "") {
      toast.error("Add the final trade result before saving the review");
      return;
    }
    const isWin = amount >= 0;
    const outcome = `${isWin ? "+" : "-"}$${Math.abs(amount).toFixed(2)}`;
    const feedback = reviewForm.notes.trim() || (isWin ? "The trade finished positive. Compare the execution with the original plan and note what you can repeat without increasing risk." : "The trade finished negative. Review whether the entry followed your plan, and focus on process quality rather than trying to win the loss back.");
    setEntries((current) => current.map((entry) => entry.id === reviewEntry.id ? { ...entry, outcome, percent: `${isWin ? "+" : "-"}${(Math.abs(amount) / 100).toFixed(2)}%`, status: isWin ? "Win" : "Loss", afterImage: reviewForm.afterImage || undefined, reviewNotes: feedback, reviewedAt: journalTime } : entry));
    setReviewEntry(null);
    toast.success("Post-trade review saved", { description: isWin ? "Positive result recorded. Keep reviewing the process." : "Loss recorded honestly. Use the review to improve the next decision." });
  }

  function handleSaveEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const newEntry: JournalEntry = {
      id: Date.now(),
      pair: form.pair.toUpperCase() || "EUR/USD",
      type: form.type,
      setup: form.setup || "Manual entry",
      date: `${journalNow.toLocaleDateString(undefined, { month: "short", day: "numeric" })}, ${journalNow.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}`,
      result: "Open",
      percent: "—",
      status: "Open",
      accent: "blue",
      reason: form.reason || "No reason captured yet.",
      rr: form.rr || "—",
      feeling: form.feeling,
      beforeImage: form.beforeImage || undefined,
    };
    setEntries((current) => [newEntry, ...current]);
    setForm({ pair: "", type: "Long", setup: "", result: "", reason: "", rr: "", feeling: "😌", beforeImage: "", afterImage: "" });
    setShowEntry(false);
    toast.success("Trade added to your journal", {
      description: `${newEntry.pair} is now part of your review queue.`,
    });
  }

  return (
    <div className="app-shell">
      <aside className={`sidebar ${showMobileNav ? "mobile-open" : ""}`}>
        <div className="brand-lockup">
          <div className="brand-mark"><span>T</span></div>
          <div>
            <div className="brand-name">Trading Edge Journal</div>
            <div className="brand-caption">TRADING JOURNAL</div>
          </div>
          <button className="sidebar-close" onClick={() => setShowMobileNav(false)} aria-label="Close navigation"><X size={18} /></button>
        </div>

        <div className="sidebar-section-label">Workspace</div>
        <nav className="main-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activeNav === label ? "active" : ""}`}
              onClick={() => {
                setActiveNav(label);
                setShowMobileNav(false);
              }}
            >
              <Icon size={18} strokeWidth={activeNav === label ? 2.4 : 1.9} />
              <span>{label}</span>
              {label === "Journal" && <span className="nav-count">{entries.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-section-label second">Your rhythm</div>
        <div className="rhythm-card">
          <div className="rhythm-top"><span className="rhythm-icon"><Zap size={14} fill="currentColor" /></span><span>{entries.length ? "Keep building" : "Ready to begin"}</span></div>
          <div className="rhythm-title">{entries.length} trade{entries.length === 1 ? "" : "s"} logged</div>
          <div className="rhythm-track"><span style={{ width: `${Math.min(entries.length, 7) / 7 * 100}%` }} /></div>
          <div className="rhythm-foot"><span>{entries.length ? "Keep showing up" : "Your first trade starts here"}</span><span>{Math.min(entries.length, 7)} / 7</span></div>
        </div>

        <div className="sidebar-bottom">
          <button className="nav-item muted" onClick={() => toast("Settings are ready for your next pass") }><Settings size={18} /><span>Settings</span></button>
          <div className="profile-chip">
            <div className="avatar">{(user?.name || "Trader").split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase()}</div>
            <div><strong>{user?.name || "Trader"}</strong><span>{user?.email || "Personal account"}</span></div>
            <button className="profile-logout" onClick={() => void logout()} aria-label="Sign out" title="Sign out"><LogOut size={14} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setShowMobileNav(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <div className="breadcrumb"><span>Workspace</span><span>/</span><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <button className="icon-button" aria-label="Search" onClick={() => toast("Search is ready when you are") }><Search size={18} /></button>
            <button className="icon-button notification" aria-label="Notifications" onClick={() => toast("You're all caught up") }><Bell size={18} /><i /></button>
            <Button className="new-entry-button" onClick={handleNewEntry}><Plus size={16} /> New entry</Button>
          </div>
        </header>

        <div className="content-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="live-dot" /> {journalDate} · {journalTime} local time</div>
              <h1>Good morning, {user?.name?.split(" ")[0] || "trader"} <span>✦</span></h1>
              <p>Trade with intention. Review with honesty.</p>
            </div>
            <div className="review-note">
              <Sparkles size={17} />
              <div><strong>Weekly review</strong><span>Your Sunday ritual is ready</span></div>
              <ArrowUpRight size={16} />
            </div>
          </section>

          {activeNav === "Analytics" && <AnalyticsPanel entries={entries} />}

          <section className="stats-grid" aria-label="Trading statistics">
            <StatCard label="Net P&L" value={formatMoney(tradeMetrics.net)} detail={tradeMetrics.count ? `${tradeMetrics.count} trade${tradeMetrics.count === 1 ? "" : "s"} recorded` : "No trades yet"} icon={TrendingUp} tone="mint" />
            <StatCard label="Win rate" value={`${tradeMetrics.winRate.toFixed(1)}%`} detail={tradeMetrics.count ? `${tradeMetrics.wins} win${tradeMetrics.wins === 1 ? "" : "s"} · ${tradeMetrics.losses} loss${tradeMetrics.losses === 1 ? "" : "es"}` : "No trades yet"} icon={Target} tone="blue" />
            <StatCard label="Profit factor" value={tradeMetrics.profitFactor === Infinity ? "∞" : tradeMetrics.profitFactor.toFixed(2)} detail={tradeMetrics.count ? `${tradeMetrics.wins} winning trade${tradeMetrics.wins === 1 ? "" : "s"} measured` : "No trades yet"} icon={WalletCards} tone="purple" />
            <StatCard label="Avg. P&L / trade" value={formatMoney(tradeMetrics.average)} detail={tradeMetrics.count ? "Based on your results" : "No trades yet"} icon={Zap} tone="orange" />
          </section>

          <MarketTicker timestamp={journalTime} />

          <section className="calculator-panel panel" aria-labelledby="calculator-title">
            <div className="calculator-intro">
              <div className="calculator-icon"><Target size={17} /></div>
              <div><div className="panel-kicker">For smarter entries</div><h2 id="calculator-title">Lot size calculator</h2><p>Know your risk before you click buy or sell.</p></div>
            </div>
            <div className="calculator-fields">
              <div className="calc-field"><Label htmlFor="calc-balance">Account balance</Label><div className="calc-input"><span>$</span><Input id="calc-balance" type="number" min="0" value={lotInputs.balance} onChange={(event) => setLotInputs({ ...lotInputs, balance: event.target.value })} /></div></div>
              <div className="calc-field"><Label htmlFor="calc-risk">Risk per trade</Label><div className="calc-input"><Input id="calc-risk" type="number" min="0" step="0.1" value={lotInputs.risk} onChange={(event) => setLotInputs({ ...lotInputs, risk: event.target.value })} /><span>%</span></div></div>
              <div className="calc-field"><Label htmlFor="calc-stop">Stop loss</Label><div className="calc-input"><Input id="calc-stop" type="number" min="0" value={lotInputs.stop} onChange={(event) => setLotInputs({ ...lotInputs, stop: event.target.value })} /><span>pips</span></div></div>
              <div className="calc-field"><Label htmlFor="calc-pip">Pip value / lot</Label><div className="calc-input"><span>$</span><Input id="calc-pip" type="number" min="0" step="0.01" value={lotInputs.pipValue} onChange={(event) => setLotInputs({ ...lotInputs, pipValue: event.target.value })} /></div></div>
            </div>
            <div className="calculator-result"><div><span>Risk amount</span><strong>${lotCalculation.riskAmount.toFixed(2)}</strong></div><div className="result-divider" /><div><span>Suggested lot size</span><strong className="lot-result">{lotCalculation.lotSize.toFixed(2)} lots</strong></div><div className="result-tip"><Sparkles size={14} /> Keep each loss within your plan.</div></div>
          </section>

          <section className="dashboard-grid">
            <div className="panel performance-panel">
              <div className="panel-head">
                <div><div className="panel-kicker">Performance</div><h2>Equity curve</h2></div>
                <div className="segmented-control" role="tablist" aria-label="Equity curve timeframe">
                  {["This week", "This month"].map((range) => <button key={range} className={timeframe === range ? "selected" : ""} onClick={() => setTimeframe(range)}>{range}</button>)}
                </div>
              </div>
              <div className="chart-summary"><strong>{formatMoney(tradeMetrics.net)}</strong><span>{tradeMetrics.count ? `${tradeMetrics.count} trade${tradeMetrics.count === 1 ? "" : "s"} in your journal` : "Your equity curve starts here"}</span></div>
              <div className="chart-area">
                <div className="chart-y-labels"><span>$600</span><span>$400</span><span>$200</span><span>$0</span></div>
                <div className="chart-wrap">
                  <div className="chart-gridlines"><i /><i /><i /><i /></div>
                  <svg className={`equity-chart ${tradeMetrics.count ? "has-data" : "empty"}`} viewBox="0 0 700 230" preserveAspectRatio="none" role="img" aria-label={tradeMetrics.count ? "Equity curve based on recorded trade results" : "Empty equity curve awaiting the first trade"}>
                    <defs><linearGradient id="areaFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#4c8dff" stopOpacity=".24" /><stop offset="100%" stopColor="#4c8dff" stopOpacity="0" /></linearGradient></defs>
                    <path d={equityPath.area} fill="url(#areaFill)" />
                    <path d={equityPath.line} fill="none" stroke="#397cf2" strokeWidth="3.5" strokeLinecap="round" />
                    <circle cx="700" cy={equityPath.endpointY} r="5" fill="#397cf2" stroke="#fff" strokeWidth="3" />
                  </svg>
                  <div className="chart-x-labels">{equityPath.labels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}</div>
                </div>
              </div>
            </div>

            <div className="panel focus-panel">
              <div className="panel-head"><div><div className="panel-kicker">Today&apos;s focus</div><h2>Trade like a pro</h2></div><div className="focus-badge"><CircleCheck size={15} /> {entries.length ? "2 / 3" : "0 / 3"}</div></div>
              <div className="focus-list">
                <button className="focus-item checked"><span className="check-circle"><Check size={13} /></span><span>Review pre-market plan</span><ChevronDown size={15} /></button>
                <button className="focus-item checked"><span className="check-circle"><Check size={13} /></span><span>Set risk for the session</span><ChevronDown size={15} /></button>
                <button className="focus-item"><span className="check-circle" /><span>Journal your next trade</span><ChevronDown size={15} /></button>
              </div>
              <div className="focus-footer"><div className="mini-avatars"><span>AM</span><span>+</span></div><span>Consistency compounds.</span></div>
            </div>
          </section>

          <section className="panel journal-panel">
            <div className="panel-head journal-head"><div><div className="panel-kicker">Recent activity</div><h2>Trade journal</h2></div><Button variant="ghost" className="view-all" onClick={() => setActiveNav("Journal")}>View all <ArrowUpRight size={15} /></Button></div>
            <div className="journal-toolbar">
              <div className="journal-subtitle"><PenLine size={15} /> Your latest market decisions</div>
              <div className="journal-filters"><div className="filter-select"><Filter size={14} /><select aria-label="Filter trades" value={filter} onChange={(event) => setFilter(event.target.value)}><option>All trades</option><option>Wins</option><option>Losses</option></select><ChevronDown size={14} /></div><button className="date-filter"><CalendarDays size={14} /> Last 30 days <ChevronDown size={14} /></button></div>
            </div>
            <div className="journal-table-head"><span>Market</span><span>Direction</span><span>Result</span><span /></div>
            <div className="journal-list">{visibleEntries.length ? visibleEntries.map((entry) => <JournalRow key={entry.id} entry={entry} onReview={openReview} />) : <div className="empty-state">No trades match this filter yet.</div>}</div>
          </section>

          <section className="bottom-grid">
            <div className="quote-card"><div className="quote-mark">“</div><p>The goal is not to trade more. It&apos;s to trade <em>better.</em></p><span>— Your journal, every day</span></div>
            <div className="quick-actions"><div className="panel-kicker">Quick actions</div><div className="quick-action-grid"><button onClick={handleNewEntry}><span className="quick-icon blue"><Plus size={17} /></span><span><strong>Log a trade</strong><small>Add a new journal entry</small></span><ArrowUpRight size={15} /></button><button onClick={() => toast("Goal tracking is coming next") }><span className="quick-icon mint"><Target size={17} /></span><span><strong>Update your goals</strong><small>Stay aligned with your plan</small></span><ArrowUpRight size={15} /></button></div></div>
          </section>
        </div>
      </main>

      {showEntry && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowEntry(false); }}><div className="entry-modal" role="dialog" aria-modal="true" aria-labelledby="entry-title"><div className="modal-head"><div><div className="panel-kicker">New journal entry</div><h2 id="entry-title">Capture the decision</h2></div><button onClick={() => setShowEntry(false)} className="modal-close" aria-label="Close"><X size={19} /></button></div><form onSubmit={handleSaveEntry}><div className="form-grid"><div className="field"><Label htmlFor="pair">Market</Label><Input id="pair" autoFocus placeholder="e.g. EUR/USD" value={form.pair} onChange={(event) => setForm({ ...form, pair: event.target.value })} /></div><div className="field"><Label htmlFor="type">Direction</Label><select id="type" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}><option>Long</option><option>Short</option></select></div></div><div className="field"><Label htmlFor="setup">Setup / thesis</Label><Input id="setup" placeholder="What did you see?" value={form.setup} onChange={(event) => setForm({ ...form, setup: event.target.value })} /></div><div className="field"><Label htmlFor="reason">Why did you take this trade?</Label><Textarea id="reason" placeholder="Describe the signal, context, and your conviction..." rows={2} value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} /></div><div className="field"><Label htmlFor="rr">Planned risk to reward</Label><Input id="rr" placeholder="e.g. 1:2.5" value={form.rr} onChange={(event) => setForm({ ...form, rr: event.target.value })} /></div><div className="field"><Label>How were you feeling?</Label><div className="feeling-picker">{["😌", "🎯", "😤", "😬", "😎", "😴"].map((emoji) => <button type="button" key={emoji} className={form.feeling === emoji ? "selected" : ""} onClick={() => setForm({ ...form, feeling: emoji })} aria-label={`Feeling ${emoji}`}>{emoji}</button>)}</div></div><div className="image-upload-grid"><div className="image-upload"><Label htmlFor="before-image">Planned entry chart <span>Optional</span></Label><label className="upload-box" htmlFor="before-image">{form.beforeImage ? <img src={form.beforeImage} alt="Planned entry chart preview" /> : <><Plus size={16} /><span>Attach before trade</span></>}<input id="before-image" type="file" accept="image/*" onChange={(event) => handleImageChange("beforeImage", event.target.files?.[0])} /></label></div></div><span className="field-help">This entry is locked after saving. Add the final result and after-trade chart from the Review trade action.</span><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setShowEntry(false)}>Cancel</Button><Button type="submit" className="new-entry-button"><Check size={16} /> Save entry</Button></div></form></div></div>}
      {reviewEntry && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setReviewEntry(null); }}><div className="entry-modal review-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><div className="modal-head"><div><div className="panel-kicker">Post-trade review</div><h2 id="review-title">How did it play out?</h2><p className="review-locked-note">{reviewEntry.pair} · Original entry is locked</p></div><button onClick={() => setReviewEntry(null)} className="modal-close" aria-label="Close"><X size={19} /></button></div><div className="locked-entry-summary"><span>Original plan</span><strong>{reviewEntry.type} · {reviewEntry.setup}</strong><small>{reviewEntry.reason}</small></div><form onSubmit={handleSaveReview}><div className="field"><Label htmlFor="final-result">Final P&amp;L in USD</Label><Input id="final-result" type="number" step="0.01" placeholder="184.20 or -42.50" value={reviewForm.result} onChange={(event) => setReviewForm({ ...reviewForm, result: event.target.value })} required /></div><div className="image-upload-grid"><div className="image-upload"><Label htmlFor="review-after-image">After-trade chart <span>Optional</span></Label><label className="upload-box" htmlFor="review-after-image">{reviewForm.afterImage ? <img src={reviewForm.afterImage} alt="After trade chart preview" /> : <><Plus size={16} /><span>Attach after trade</span></>}<input id="review-after-image" type="file" accept="image/*" onChange={(event) => handleReviewImageChange(event.target.files?.[0])} /></label></div></div><div className="field"><Label htmlFor="review-notes">Your review <span>Optional — we add an honest prompt if blank</span></Label><Textarea id="review-notes" placeholder="What did you execute well? What would you change?" rows={4} value={reviewForm.notes} onChange={(event) => setReviewForm({ ...reviewForm, notes: event.target.value })} /></div><div className="modal-actions"><Button type="button" variant="ghost" onClick={() => setReviewEntry(null)}>Cancel</Button><Button type="submit" className="new-entry-button"><Check size={16} /> Save review</Button></div></form></div></div>}
    </div>
  );
}
