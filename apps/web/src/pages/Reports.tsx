import { useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { formatRupiah, formatDate } from "@/lib/format";
import { useMonthlyReport, type MonthlyReport, type CategoryBreakdown } from "@/hooks/useReports";
import { useCategories } from "@/hooks/useCategories";
import { useAccounts } from "@/hooks/useAccounts";
import { ApiError } from "@/lib/api";

// ═════════════════════════════════════════════════════════════
// Constants
// ═════════════════════════════════════════════════════════════
const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const PERIOD_PRESETS = [
  { key: "this-month", label: "Bulan ini" },
  { key: "3-months", label: "3 Bulan" },
  { key: "6-months", label: "6 Bulan" },
  { key: "this-year", label: "Tahun ini" },
] as const;

type PeriodPreset = typeof PERIOD_PRESETS[number]["key"];

// ═════════════════════════════════════════════════════════════
// Shared: Card wrapper
// ═════════════════════════════════════════════════════════════
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white dark:bg-[#1C1D1A] rounded-2xl border border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)] ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children, icon }: { children: React.ReactNode; icon?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      {icon && <span className="text-sm">{icon}</span>}
      <h3 className="text-[12px] font-bold text-[#1A1917] dark:text-[#F0EEE9] uppercase tracking-wide">
        {children}
      </h3>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// SVG Charts
// ═════════════════════════════════════════════════════════════

// ── Donut Chart ──
function DonutChart({ data, centerLabel }: {
  data: { color: string; percentage: number }[];
  centerLabel?: string;
}) {
  if (data.length === 0) return null;

  let cumAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const start = cumAngle;
    const angle = (d.percentage / 100) * 2 * Math.PI;
    cumAngle += angle;
    return { ...d, start, end: cumAngle, angle };
  });

  return (
    <svg viewBox="-1.1 -1.1 2.2 2.2" className="w-full h-full">
      {slices.map((s, i) => {
        if (s.angle < 0.01) return null;
        const x1 = Math.cos(s.start), y1 = Math.sin(s.start);
        const x2 = Math.cos(s.end), y2 = Math.sin(s.end);
        const large = s.angle > Math.PI ? 1 : 0;
        return (
          <path
            key={i}
            d={`M 0 0 L ${x1} ${y1} A 1 1 0 ${large} 1 ${x2} ${y2} Z`}
            fill={s.color}
            stroke="white"
            strokeWidth="0.03"
            className="dark:stroke-[#1C1D1A]"
          />
        );
      })}
      <circle cx="0" cy="0" r="0.6" className="fill-white dark:fill-[#1C1D1A]" />
      {centerLabel && (
        <text
          x="0" y="0.05"
          textAnchor="middle"
          className="fill-[#6B6864] dark:fill-[#9E9B96]"
          fontSize="0.22"
          fontFamily="DM Mono, monospace"
          fontWeight="600"
        >
          {centerLabel}
        </text>
      )}
    </svg>
  );
}

// ── Area / Line Chart (Cash Flow) ──
function CashFlowChart({ breakdown }: { breakdown: { date: string; income: number; expense: number }[] }) {
  const n = breakdown.length;
  if (n === 0) return null;
  const hasData = breakdown.some((d) => d.income > 0 || d.expense > 0);
  if (!hasData) return <p className="text-[11px] text-[#9E9B98] dark:text-[#4A4948] text-center py-8">Belum ada transaksi</p>;

  const PAD = 8;
  const W = 300;
  const H = 100;
  const maxVal = Math.max(...breakdown.flatMap((d) => [d.income, d.expense]), 1);

  function toPoints(values: number[]) {
    return values.map((v, i) => {
      const x = PAD + (i / (n - 1)) * (W - PAD * 2);
      const y = H - PAD - (v / maxVal) * (H - PAD * 2);
      return `${x},${y}`;
    }).join(" ");
  }

  const incomeVals = breakdown.map((d) => d.income);
  const expenseVals = breakdown.map((d) => d.expense);
  const incomePts = toPoints(incomeVals);
  const expensePts = toPoints(expenseVals);

  // Area fill paths
  const incomeArea = `${PAD},${H - PAD} ${incomePts} ${W - PAD},${H - PAD}`;
  const expenseArea = `${PAD},${H - PAD} ${expensePts} ${W - PAD},${H - PAD}`;

  // X-axis labels (show every 5th day)
  const labels = breakdown
    .map((d, i) => {
      const day = parseInt(d.date.split("-")[2]);
      if (day === 1 || day % 5 === 0) return { i, day };
      return null;
    })
    .filter(Boolean) as { i: number; day: number }[];

  return (
    <svg viewBox={`0 0 ${W} ${H + 14}`} className="w-full" style={{ height: 160 }} preserveAspectRatio="xMidYMid meet">
      {/* Grid lines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={PAD} y1={H - PAD - f * (H - PAD * 2)} x2={W - PAD} y2={H - PAD - f * (H - PAD * 2)}
          stroke="#E5E7EB" strokeWidth="0.3" className="dark:stroke-[#2A2B28]" strokeDasharray="3,3" />
      ))}
      {/* Income area */}
      <polygon points={incomeArea} fill="#10b981" opacity="0.1" />
      <polyline points={incomePts} fill="none" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* Expense area */}
      <polygon points={expenseArea} fill="#ef4444" opacity="0.1" />
      <polyline points={expensePts} fill="none" stroke="#ef4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      {/* X-axis labels */}
      {labels.map(({ i, day }) => {
        const x = PAD + (i / (n - 1)) * (W - PAD * 2);
        return (
          <text key={i} x={x} y={H + 8} textAnchor="middle" fontSize="6" fill="#9CA3AF" fontFamily="DM Mono, monospace">{day}</text>
        );
      })}
    </svg>
  );
}

// ── Horizontal Bar Chart (Account Spending) ──
function HorizontalBarChart({ items }: { items: { label: string; icon: string; amount: number; percentage: number; color: string }[] }) {
  if (items.length === 0) return <p className="text-[11px] text-[#9E9B98] dark:text-[#4A4948] text-center py-4">Belum ada data</p>;

  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-sm">{item.icon}</span>
              <span className="text-[11px] font-medium text-[#1A1917] dark:text-[#F0EEE9] truncate">{item.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-bold font-mono text-[#1A1917] dark:text-[#F0EEE9]">{formatRupiah(item.amount, { compact: true })}</span>
              <span className="text-[10px] font-mono text-[#9E9B98] dark:text-[#4A4948] w-8 text-right">{item.percentage}%</span>
            </div>
          </div>
          <div className="h-2 bg-[#F0EEE9] dark:bg-[#242522] rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(item.percentage, 2)}%`, backgroundColor: item.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Trend Bar Chart (6 months) ──
function TrendBarChart({ trend }: { trend: MonthlyReport["monthly_trend"] }) {
  const n = trend.labels.length;
  if (n === 0) return null;

  const maxVal = Math.max(...trend.income, ...trend.expense, 1);
  const CHART_H = 80;
  const LABEL_H = 16;
  const TOTAL_H = CHART_H + LABEL_H;
  const SLOT = 44;
  const W = n * SLOT;

  // Net savings line points
  const savingsPts = trend.savings.map((s, i) => {
    const x = i * SLOT + SLOT / 2;
    const maxAbs = Math.max(Math.abs(Math.min(...trend.savings)), Math.abs(Math.max(...trend.savings)), 1);
    const mid = CHART_H / 2;
    const y = mid - (s / maxAbs) * (CHART_H / 2 - 4);
    return `${x},${Math.max(4, Math.min(CHART_H - 4, y))}`;
  }).join(" ");

  return (
    <svg viewBox={`0 0 ${W} ${TOTAL_H}`} className="w-full" style={{ height: 140 }} preserveAspectRatio="xMidYMax meet">
      <line x1="0" y1={CHART_H} x2={W} y2={CHART_H} stroke="#E5E7EB" strokeWidth="0.4" className="dark:stroke-[#2A2B28]" />
      {trend.labels.map((label, i) => {
        const incH = trend.income[i] > 0 ? Math.max((trend.income[i] / maxVal) * (CHART_H - 6), 3) : 0;
        const expH = trend.expense[i] > 0 ? Math.max((trend.expense[i] / maxVal) * (CHART_H - 6), 3) : 0;
        const x = i * SLOT;
        return (
          <g key={i}>
            {incH > 0 && <rect x={x + 4} y={CHART_H - incH} width={16} height={incH} fill="#10b981" rx="2" opacity="0.85" />}
            {expH > 0 && <rect x={x + 24} y={CHART_H - expH} width={16} height={expH} fill="#ef4444" rx="2" opacity="0.85" />}
            <text x={x + SLOT / 2} y={TOTAL_H - 2} textAnchor="middle" fontSize="7" fill="#9CA3AF" fontFamily="DM Mono, monospace">{label}</text>
          </g>
        );
      })}
      {/* Savings line overlay */}
      <polyline points={savingsPts} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
    </svg>
  );
}

// ═════════════════════════════════════════════════════════════
// Filter Bottom Sheet
// ═════════════════════════════════════════════════════════════
function FilterSheet({ open, onClose, categories, accounts, filters, onApply }: {
  open: boolean;
  onClose: () => void;
  categories: { id: string; name: string; icon: string }[];
  accounts: { id: string; name: string; icon: string }[];
  filters: FilterState;
  onApply: (f: FilterState) => void;
}) {
  const [local, setLocal] = useState<FilterState>(filters);

  // Reset local when opened
  const handleOpen = useCallback(() => setLocal(filters), [filters]);
  if (open && local !== filters && local === filters) handleOpen();

  if (!open) return null;

  const toggleCategory = (id: string) => {
    setLocal((p) => ({
      ...p,
      categoryIds: p.categoryIds.includes(id)
        ? p.categoryIds.filter((c) => c !== id)
        : [...p.categoryIds, id],
    }));
  };

  const toggleAccount = (id: string) => {
    setLocal((p) => ({
      ...p,
      accountIds: p.accountIds.includes(id)
        ? p.accountIds.filter((a) => a !== id)
        : [...p.accountIds, id],
    }));
  };

  const reset = () => {
    setLocal({ dateFrom: "", dateTo: "", categoryIds: [], accountIds: [], type: "all" });
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 z-40 animate-fadeIn" onClick={onClose} />
      {/* Sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-[#1C1D1A] rounded-t-3xl max-h-[80vh] overflow-y-auto animate-slideUp safe-pb max-w-md mx-auto">
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-8 h-1 bg-[#D4D2CE] dark:bg-[#3A3B38] rounded-full" />
        </div>

        <div className="px-5 pb-6 space-y-5">
          <h3 className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">Filter Detail</h3>

          {/* Date Range */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2 block">Rentang Tanggal</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={local.dateFrom}
                onChange={(e) => setLocal((p) => ({ ...p, dateFrom: e.target.value }))}
                className="px-3 py-2 text-[12px] bg-[#F7F6F3] dark:bg-[#242522] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-xl text-[#1A1917] dark:text-[#F0EEE9]"
                placeholder="Dari"
              />
              <input
                type="date"
                value={local.dateTo}
                onChange={(e) => setLocal((p) => ({ ...p, dateTo: e.target.value }))}
                className="px-3 py-2 text-[12px] bg-[#F7F6F3] dark:bg-[#242522] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] rounded-xl text-[#1A1917] dark:text-[#F0EEE9]"
                placeholder="Sampai"
              />
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2 block">Tipe Transaksi</label>
            <div className="flex gap-2">
              {(["all", "income", "expense"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setLocal((p) => ({ ...p, type: t }))}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-semibold transition-colors ${
                    local.type === t
                      ? "bg-accent-500 dark:bg-accent-dark text-white"
                      : "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]"
                  }`}
                >
                  {t === "all" ? "Semua" : t === "income" ? "Pemasukan" : "Pengeluaran"}
                </button>
              ))}
            </div>
          </div>

          {/* Categories */}
          {categories.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2 block">Kategori</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => toggleCategory(c.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1 ${
                      local.categoryIds.includes(c.id)
                        ? "bg-accent-500 dark:bg-accent-dark text-white"
                        : "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]"
                    }`}
                  >
                    <span>{c.icon}</span>
                    {c.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Accounts */}
          {accounts.length > 0 && (
            <div>
              <label className="text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] mb-2 block">Akun</label>
              <div className="flex flex-wrap gap-1.5">
                {accounts.map((a) => (
                  <button
                    key={a.id}
                    onClick={() => toggleAccount(a.id)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors flex items-center gap-1 ${
                      local.accountIds.includes(a.id)
                        ? "bg-accent-500 dark:bg-accent-dark text-white"
                        : "bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]"
                    }`}
                  >
                    <span>{a.icon}</span>
                    {a.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={reset} className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold bg-[#F0EEE9] dark:bg-[#242522] text-[#6B6864] dark:text-[#9E9B96]">
              Reset
            </button>
            <button
              onClick={() => { onApply(local); onClose(); }}
              className="flex-1 py-2.5 rounded-xl text-[12px] font-semibold bg-accent-500 dark:bg-accent-dark text-white"
            >
              Terapkan
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// ═════════════════════════════════════════════════════════════
// Filter State
// ═════════════════════════════════════════════════════════════
interface FilterState {
  dateFrom: string;
  dateTo: string;
  categoryIds: string[];
  accountIds: string[];
  type: "all" | "income" | "expense";
}

// ═════════════════════════════════════════════════════════════
// Metric Card
// ═════════════════════════════════════════════════════════════
function MetricCard({ label, value, subValue, icon, color, isLoading }: {
  label: string;
  value: string;
  subValue?: React.ReactNode;
  icon?: string;
  color?: string;
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <Card className="p-3">
        <Skeleton className="h-2 w-12 rounded mb-2" />
        <Skeleton className="h-5 w-20 rounded mb-1" />
        <Skeleton className="h-2 w-16 rounded" />
      </Card>
    );
  }

  return (
    <Card className="p-3 flex flex-col">
      <div className="flex items-center gap-1.5 mb-1">
        {icon && <span className="text-xs">{icon}</span>}
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948]">{label}</span>
      </div>
      <p className={`text-[15px] font-bold font-mono leading-tight ${color ?? "text-[#1A1917] dark:text-[#F0EEE9]"}`}>
        {value}
      </p>
      {subValue && <div className="mt-1">{subValue}</div>}
    </Card>
  );
}

function ChangeIndicator({ value, suffix = "" }: { value: number; suffix?: string }) {
  if (value === 0) return <span className="text-[9px] font-mono text-[#9E9B98] dark:text-[#4A4948]">— vs lalu</span>;
  const isPositive = value > 0;
  return (
    <span className={`text-[9px] font-mono font-semibold ${isPositive ? "text-[#10b981]" : "text-[#ef4444]"}`}>
      {isPositive ? "↑" : "↓"} {Math.abs(value)}%{suffix} vs lalu
    </span>
  );
}

// ═════════════════════════════════════════════════════════════
// Category Pie Section
// ═════════════════════════════════════════════════════════════
function CategoryPieSection({ title, categories, total, isExpense }: {
  title: string;
  categories: CategoryBreakdown[];
  total: number;
  isExpense: boolean;
}) {
  if (categories.length === 0) {
    return (
      <Card className="p-4">
        <SectionTitle icon={isExpense ? "📤" : "📥"}>{title}</SectionTitle>
        <p className="text-[11px] text-[#9E9B98] dark:text-[#4A4948] text-center py-6">Belum ada data</p>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <SectionTitle icon={isExpense ? "📤" : "📥"}>{title}</SectionTitle>
      <div className="flex justify-center mb-4">
        <div className="w-28 h-28">
          <DonutChart
            data={categories.map((c) => ({ color: c.category.color, percentage: c.percentage }))}
            centerLabel={formatRupiah(total, { compact: true })}
          />
        </div>
      </div>
      <div className="space-y-2">
        {categories.slice(0, 8).map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.category.color }} />
            <span className="text-sm shrink-0">{c.category.icon}</span>
            <span className="flex-1 text-[11px] text-[#1A1917] dark:text-[#F0EEE9] truncate">{c.category.name}</span>
            <span className="text-[10px] font-semibold text-[#9E9B98] dark:text-[#4A4948] shrink-0 w-7 text-right">{c.percentage}%</span>
            <span className={`text-[11px] font-bold font-mono shrink-0 ${isExpense ? "text-[#C94A1C] dark:text-[#E87340]" : "text-[#1E8A5A] dark:text-[#4CAF7A]"}`}>
              {formatRupiah(c.amount, { compact: true })}
            </span>
          </div>
        ))}
        {categories.length > 8 && (
          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] pl-5">+{categories.length - 8} lainnya</p>
        )}
      </div>
    </Card>
  );
}

// ═════════════════════════════════════════════════════════════
// Upgrade Gate
// ═════════════════════════════════════════════════════════════
function UpgradeGate({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[240px] text-center px-6 py-10">
      <span className="text-4xl mb-3">🔒</span>
      <h3 className="text-[14px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-1">Fitur Premium</h3>
      <p className="text-[12px] text-[#6B6864] dark:text-[#9E9B96] mb-4">{feature} tersedia untuk pengguna Premium & Trial.</p>
      <Link to="/subscription" className="px-5 py-2.5 bg-accent-500 dark:bg-accent-dark text-white text-xs font-semibold rounded-xl">
        Upgrade Sekarang
      </Link>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Legend
// ═════════════════════════════════════════════════════════════
function ChartLegend({ items }: { items?: { color: string; label: string }[] }) {
  const defaultItems = [
    { color: "#10b981", label: "Pemasukan" },
    { color: "#ef4444", label: "Pengeluaran" },
  ];
  const list = items ?? defaultItems;

  return (
    <div className="flex items-center gap-4 justify-center mt-3">
      {list.map((item, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
          <span className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════
// Main Page
// ═════════════════════════════════════════════════════════════
export function ReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [activePeriod, setActivePeriod] = useState<PeriodPreset>("this-month");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: "", dateTo: "", categoryIds: [], accountIds: [], type: "all",
  });

  const { data, isLoading, error } = useMonthlyReport(month, year);
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const isGated = error instanceof ApiError && error.status === 403;

  // ── Period preset handler ──
  function handlePeriodChange(preset: PeriodPreset) {
    setActivePeriod(preset);
    const today = new Date();
    if (preset === "this-month") {
      setMonth(today.getMonth() + 1);
      setYear(today.getFullYear());
    } else if (preset === "3-months" || preset === "6-months" || preset === "this-year") {
      // Stay on current month, the trend chart handles multi-month view
      setMonth(today.getMonth() + 1);
      setYear(today.getFullYear());
    }
  }

  // ── Month nav ──
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
    setActivePeriod("this-month");
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
    setActivePeriod("this-month");
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  // ── Filter active count ──
  const filterCount = [
    filters.dateFrom || filters.dateTo ? 1 : 0,
    filters.categoryIds.length > 0 ? 1 : 0,
    filters.accountIds.length > 0 ? 1 : 0,
    filters.type !== "all" ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // ── Filtered data ──
  const filtered = useMemo(() => {
    if (!data) return null;

    // If no client-side filters active, return raw data
    if (filterCount === 0) return data;

    // Client-side filter top_transactions and per_account_spending
    // (API already gives us category and account breakdowns — we only filter display)
    let filteredExpenseCats = data.expense_by_category;
    let filteredIncomeCats = data.income_by_category;
    let filteredAccountSpending = data.per_account_spending;
    let filteredTopTx = data.top_transactions;

    if (filters.categoryIds.length > 0) {
      filteredExpenseCats = data.expense_by_category.filter((c) =>
        c.category.id && filters.categoryIds.includes(c.category.id)
      );
      filteredIncomeCats = data.income_by_category.filter((c) =>
        c.category.id && filters.categoryIds.includes(c.category.id)
      );
      filteredTopTx = data.top_transactions.filter((t) =>
        t.category.id && filters.categoryIds.includes(t.category.id)
      );
    }

    if (filters.accountIds.length > 0) {
      filteredAccountSpending = data.per_account_spending.filter((a) =>
        filters.accountIds.includes(a.account.id)
      );
      filteredTopTx = filteredTopTx.filter((t) =>
        t.account && filters.accountIds.includes(t.account.id)
      );
    }

    if (filters.type === "expense") {
      filteredIncomeCats = [];
    } else if (filters.type === "income") {
      filteredExpenseCats = [];
      filteredTopTx = [];
    }

    return {
      ...data,
      expense_by_category: filteredExpenseCats,
      income_by_category: filteredIncomeCats,
      per_account_spending: filteredAccountSpending,
      top_transactions: filteredTopTx,
    };
  }, [data, filters, filterCount]);

  const d = filtered;

  return (
    <div className="flex flex-col pb-24">
      <Header title="Laporan & Analitik" />

      {/* ═══ Sticky Filter Bar ═══ */}
      <div className="sticky top-14 z-20 bg-[#F7F6F3]/95 dark:bg-[#111210]/95 backdrop-blur-xl border-b border-[rgba(0,0,0,0.05)] dark:border-[rgba(255,255,255,0.05)]">
        {/* Period presets */}
        <div className="flex items-center gap-1.5 px-4 pt-3 pb-2">
          <div className="flex gap-1.5 flex-1 overflow-x-auto no-scrollbar">
            {PERIOD_PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => handlePeriodChange(p.key)}
                className={`px-3 py-1.5 rounded-full text-[10px] font-semibold whitespace-nowrap transition-colors ${
                  activePeriod === p.key
                    ? "bg-accent-500 dark:bg-accent-dark text-white"
                    : "bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          {/* Filter button */}
          <button
            onClick={() => setFilterOpen(true)}
            className="relative w-8 h-8 flex items-center justify-center rounded-full bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#6B6864] dark:text-[#9E9B96]">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            {filterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-accent-500 dark:bg-accent-dark text-white text-[8px] font-bold rounded-full flex items-center justify-center">{filterCount}</span>
            )}
          </button>
        </div>

        {/* Month Navigation */}
        <div className="flex items-center justify-between px-4 pb-2">
          <button
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg text-[#9E9B98] dark:text-[#4A4948] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
          >
            ‹
          </button>
          <span className="text-[13px] font-bold text-[#1A1917] dark:text-[#F0EEE9]">
            {MONTH_NAMES[month - 1]} {year}
          </span>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="w-8 h-8 flex items-center justify-center rounded-full text-lg text-[#9E9B98] dark:text-[#4A4948] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] disabled:opacity-25 transition-colors"
          >
            ›
          </button>
        </div>
      </div>

      {/* ═══ Content ═══ */}
      {isGated ? (
        <UpgradeGate feature="Laporan bulan lainnya" />
      ) : (
        <div className="px-4 py-4 space-y-4">

          {/* ═══ ROW 1 — Metric Cards (3 col) ═══ */}
          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              label="Pemasukan"
              value={d ? formatRupiah(d.income, { compact: true }) : "—"}
              icon="↑"
              color="text-[#1E8A5A] dark:text-[#4CAF7A]"
              isLoading={isLoading}
              subValue={d && <ChangeIndicator value={d.comparison.income_change} />}
            />
            <MetricCard
              label="Pengeluaran"
              value={d ? formatRupiah(d.expense, { compact: true }) : "—"}
              icon="↓"
              color="text-[#C94A1C] dark:text-[#E87340]"
              isLoading={isLoading}
              subValue={d && <ChangeIndicator value={d.comparison.expense_change} />}
            />
            <MetricCard
              label="Tabungan"
              value={d ? formatRupiah(d.savings, { compact: true }) : "—"}
              icon="💰"
              color={d && d.savings >= 0 ? "text-[#1E8A5A] dark:text-[#4CAF7A]" : "text-[#C94A1C] dark:text-[#E87340]"}
              isLoading={isLoading}
              subValue={d && (
                <span className="text-[9px] font-mono text-[#9E9B98] dark:text-[#4A4948]">
                  Saving rate: {d.saving_rate}%
                </span>
              )}
            />
          </div>

          {/* ═══ ROW 2 — Metric Cards (3 col) ═══ */}
          <div className="grid grid-cols-3 gap-2">
            <MetricCard
              label="Rata-rata/Hari"
              value={d ? formatRupiah(d.daily_average, { compact: true }) : "—"}
              icon="📊"
              isLoading={isLoading}
            />
            <MetricCard
              label="Transaksi"
              value={d ? `${d.total_transaction_count}` : "—"}
              icon="📝"
              isLoading={isLoading}
              subValue={d && d.comparison.prev_transaction_count > 0 && (
                <span className="text-[9px] font-mono text-[#9E9B98] dark:text-[#4A4948]">
                  Lalu: {d.comparison.prev_transaction_count}
                </span>
              )}
            />
            <MetricCard
              label="Hari Terboros"
              value={d?.busiest_day ? formatRupiah(d.busiest_day.amount, { compact: true }) : "—"}
              icon="🔥"
              isLoading={isLoading}
              subValue={d?.busiest_day && (
                <span className="text-[9px] font-mono text-[#9E9B98] dark:text-[#4A4948]">
                  {new Date(d.busiest_day.date).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                </span>
              )}
            />
          </div>

          {/* ═══ ROW 3 — Cash Flow Chart ═══ */}
          <Card className="p-4">
            <SectionTitle icon="📈">Arus Kas Harian</SectionTitle>
            {isLoading ? (
              <Skeleton className="h-40 w-full rounded-xl" />
            ) : d ? (
              <>
                <CashFlowChart breakdown={d.daily_breakdown} />
                <ChartLegend />
              </>
            ) : null}
          </Card>

          {/* ═══ ROW 4 — Category Pie Charts (2 col on desktop, stack on mobile) ═══ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {isLoading ? (
              <>
                <Card className="p-4"><Skeleton className="h-56 w-full rounded-xl" /></Card>
                <Card className="p-4"><Skeleton className="h-56 w-full rounded-xl" /></Card>
              </>
            ) : d ? (
              <>
                <CategoryPieSection
                  title="Pengeluaran per Kategori"
                  categories={d.expense_by_category}
                  total={d.expense}
                  isExpense
                />
                <CategoryPieSection
                  title="Pemasukan per Kategori"
                  categories={d.income_by_category}
                  total={d.income}
                  isExpense={false}
                />
              </>
            ) : null}
          </div>

          {/* ═══ ROW 5 — Top 5 Pengeluaran Terbesar ═══ */}
          <Card className="p-4">
            <SectionTitle icon="🏆">Top 5 Pengeluaran Terbesar</SectionTitle>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : d && d.top_transactions.length > 0 ? (
              <div className="space-y-2">
                {d.top_transactions.map((t, i) => (
                  <Link
                    key={t.id}
                    to={`/transactions/${t.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[#F7F6F3] dark:hover:bg-[#242522] transition-colors"
                  >
                    <span className="w-6 h-6 flex items-center justify-center rounded-full bg-[#F0EEE9] dark:bg-[#242522] text-xs font-bold text-[#9E9B98]">{i + 1}</span>
                    <span className="text-sm">{t.category.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] truncate">{t.description || t.category.name}</p>
                      <p className="text-[9px] text-[#9E9B98] dark:text-[#4A4948]">
                        {t.category.name} · {formatDate(t.date)}
                      </p>
                    </div>
                    <span className="text-[12px] font-bold font-mono text-[#C94A1C] dark:text-[#E87340] shrink-0">
                      {formatRupiah(t.amount, { compact: true })}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-[#9E9B98] dark:text-[#4A4948] text-center py-6">Belum ada pengeluaran</p>
            )}
          </Card>

          {/* ═══ ROW 6 — Budget vs Aktual ═══ */}
          {d && d.budget_vs_actual.length > 0 && (
            <Card className="p-4">
              <SectionTitle icon="🎯">Budget vs Aktual</SectionTitle>
              <div className="space-y-3">
                {d.budget_vs_actual.map((b, i) => {
                  const pctColor = b.percentage > 80 ? "#ef4444" : b.percentage > 60 ? "#f59e0b" : "#10b981";
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{b.category.icon}</span>
                          <span className="text-[11px] font-medium text-[#1A1917] dark:text-[#F0EEE9]">{b.category.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-[#6B6864] dark:text-[#9E9B96]">
                          {formatRupiah(b.spent, { compact: true })} / {formatRupiah(b.budget, { compact: true })}
                          <span className="ml-1 font-semibold" style={{ color: pctColor }}>({b.percentage}%)</span>
                        </span>
                      </div>
                      <div className="h-2 bg-[#F0EEE9] dark:bg-[#242522] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(b.percentage, 100)}%`, backgroundColor: pctColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* ═══ ROW 7 — Spending per Akun ═══ */}
          <Card className="p-4">
            <SectionTitle icon="🏦">Pengeluaran per Akun</SectionTitle>
            {isLoading ? (
              <div className="space-y-3">
                {[0, 1].map((i) => <Skeleton key={i} className="h-8 w-full rounded-lg" />)}
              </div>
            ) : d ? (
              <HorizontalBarChart
                items={d.per_account_spending.map((a) => ({
                  label: a.account.name,
                  icon: a.account.icon,
                  amount: a.amount,
                  percentage: a.percentage,
                  color: a.account.color,
                }))}
              />
            ) : null}
          </Card>

          {/* ═══ ROW 8 — Tren Bulanan (6 bulan) ═══ */}
          <Card className="p-4">
            <SectionTitle icon="📉">Tren 6 Bulan Terakhir</SectionTitle>
            {isLoading ? (
              <Skeleton className="h-36 w-full rounded-xl" />
            ) : d ? (
              <>
                <TrendBarChart trend={d.monthly_trend} />
                <ChartLegend items={[
                  { color: "#10b981", label: "Pemasukan" },
                  { color: "#ef4444", label: "Pengeluaran" },
                  { color: "#3b82f6", label: "Net Savings" },
                ]} />
              </>
            ) : null}
          </Card>

          {/* ═══ ROW 9 — Perbandingan Bulan ═══ */}
          {d && (
            <Card className="p-4">
              <SectionTitle icon="⚖️">Perbandingan vs Bulan Lalu</SectionTitle>
              <div className="overflow-x-auto">
                <table className="w-full text-[11px]">
                  <thead>
                    <tr className="border-b border-[rgba(0,0,0,0.06)] dark:border-[rgba(255,255,255,0.06)]">
                      <th className="text-left py-2 font-semibold text-[#9E9B98] dark:text-[#4A4948]">Metrik</th>
                      <th className="text-right py-2 font-semibold text-[#9E9B98] dark:text-[#4A4948]">Bulan Lalu</th>
                      <th className="text-right py-2 font-semibold text-[#9E9B98] dark:text-[#4A4948]">Bulan Ini</th>
                      <th className="text-right py-2 font-semibold text-[#9E9B98] dark:text-[#4A4948]">Perubahan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Pemasukan",
                        prev: d.comparison.prev_income,
                        curr: d.income,
                        change: d.comparison.income_change,
                        goodUp: true,
                      },
                      {
                        label: "Pengeluaran",
                        prev: d.comparison.prev_expense,
                        curr: d.expense,
                        change: d.comparison.expense_change,
                        goodUp: false,
                      },
                      {
                        label: "Tabungan",
                        prev: d.comparison.prev_savings,
                        curr: d.savings,
                        change: d.comparison.prev_savings !== 0
                          ? Math.round(((d.savings - d.comparison.prev_savings) / Math.abs(d.comparison.prev_savings)) * 100)
                          : d.savings > 0 ? 100 : 0,
                        goodUp: true,
                      },
                      {
                        label: "Jumlah Transaksi",
                        prev: d.comparison.prev_transaction_count,
                        curr: d.total_transaction_count,
                        change: d.comparison.prev_transaction_count !== 0
                          ? Math.round(((d.total_transaction_count - d.comparison.prev_transaction_count) / d.comparison.prev_transaction_count) * 100)
                          : d.total_transaction_count > 0 ? 100 : 0,
                        goodUp: true,
                        isCurrency: false,
                      },
                    ].map((row, i) => {
                      const isGood = row.goodUp ? row.change >= 0 : row.change <= 0;
                      const isCurrency = row.isCurrency !== false;
                      return (
                        <tr key={i} className="border-b border-[rgba(0,0,0,0.04)] dark:border-[rgba(255,255,255,0.04)]">
                          <td className="py-2 font-medium text-[#1A1917] dark:text-[#F0EEE9]">{row.label}</td>
                          <td className="py-2 text-right font-mono text-[#6B6864] dark:text-[#9E9B96]">
                            {isCurrency ? formatRupiah(row.prev, { compact: true }) : row.prev}
                          </td>
                          <td className="py-2 text-right font-mono font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
                            {isCurrency ? formatRupiah(row.curr, { compact: true }) : row.curr}
                          </td>
                          <td className={`py-2 text-right font-mono font-semibold ${isGood ? "text-[#10b981]" : "text-[#ef4444]"}`}>
                            {row.change > 0 ? "↑" : row.change < 0 ? "↓" : "—"} {Math.abs(row.change)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ═══ Filter Bottom Sheet ═══ */}
      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        categories={categories.map((c) => ({ id: c.id, name: c.name, icon: c.icon }))}
        accounts={(accounts ?? []).map((a) => ({ id: a.id, name: a.name, icon: a.icon }))}
        filters={filters}
        onApply={setFilters}
      />
    </div>
  );
}
