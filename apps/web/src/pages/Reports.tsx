import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Skeleton } from "@/components/ui/LoadingSkeleton";
import { formatRupiah } from "@/lib/format";
import {
  useMonthlyReport,
  useTrendReport,
  useYearlyReport,
  type CategoryBreakdown,
  type DailyBreakdown,
  type YearlyMonth,
} from "@/hooks/useReports";
import { ApiError } from "@/lib/api";

type Tab = "monthly" | "trend" | "yearly";

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// ── SVG Donut Chart ──
function DonutChart({ data }: { data: { color: string; percentage: number }[] }) {
  if (data.length === 0) return null;

  let cumAngle = -Math.PI / 2;
  const slices = data.map((d) => {
    const start = cumAngle;
    const angle = (d.percentage / 100) * 2 * Math.PI;
    cumAngle += angle;
    return { ...d, start, end: cumAngle, angle };
  });

  return (
    <svg viewBox="-1 -1 2 2" className="w-full h-full">
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
            strokeWidth="0.04"
          />
        );
      })}
      <circle cx="0" cy="0" r="0.58" className="fill-white dark:fill-[#111210]" />
    </svg>
  );
}

// ── SVG Daily Bar Chart ──
// Each day = 10 units wide: [0.5] income(4) [gap 1] expense(4) [0.5]
// ViewBox width = n × 10, height = 58 (48 chart + 10 label area)
function DailyBarChart({ breakdown }: { breakdown: DailyBreakdown[] }) {
  const n = breakdown.length;
  if (n === 0) return <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center py-6">Belum ada transaksi</p>;

  const CHART_H = 48;
  const LABEL_H = 10;
  const TOTAL_H = CHART_H + LABEL_H;
  const W = n * 10;
  const maxVal = Math.max(...breakdown.flatMap((d) => [d.income, d.expense]), 1);
  const hasAnyData = breakdown.some((d) => d.income > 0 || d.expense > 0);

  if (!hasAnyData) {
    return <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] text-center py-6">Belum ada transaksi</p>;
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${TOTAL_H}`}
      className="w-full"
      style={{ height: 80 }}
      preserveAspectRatio="xMidYMax meet"
    >
      {/* Baseline */}
      <line x1="0" y1={CHART_H} x2={W} y2={CHART_H} stroke="#E5E7EB" strokeWidth="0.4" />

      {breakdown.map((d, i) => {
        const incH = d.income > 0 ? Math.max((d.income / maxVal) * (CHART_H - 2), 1.5) : 0;
        const expH = d.expense > 0 ? Math.max((d.expense / maxVal) * (CHART_H - 2), 1.5) : 0;
        const x = i * 10;
        const dayNum = i + 1;
        const showLabel = dayNum === 1 || dayNum % 5 === 0;

        return (
          <g key={i}>
            {incH > 0 && (
              <rect
                x={x + 0.5}
                y={CHART_H - incH}
                width={4}
                height={incH}
                fill="#10b981"
                rx="0.6"
              />
            )}
            {expH > 0 && (
              <rect
                x={x + 5}
                y={CHART_H - expH}
                width={4}
                height={expH}
                fill="#ef4444"
                rx="0.6"
              />
            )}
            {showLabel && (
              <text
                x={x + 5}
                y={TOTAL_H - 1}
                textAnchor="middle"
                fontSize="4.5"
                fill="#9CA3AF"
              >
                {dayNum}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── SVG Trend/Yearly Bar Chart (few bars, wider) ──
function MultiBarChart({ items, labels }: {
  items: { income: number; expense: number }[];
  labels?: string[];
}) {
  const n = items.length;
  if (n === 0) return null;

  const CHART_H = 60;
  const LABEL_H = labels ? 12 : 0;
  const TOTAL_H = CHART_H + LABEL_H;
  const SLOT = 20;
  const W = n * SLOT;
  const maxVal = Math.max(...items.flatMap((d) => [d.income, d.expense]), 1);

  return (
    <svg
      viewBox={`0 0 ${W} ${TOTAL_H}`}
      className="w-full"
      style={{ height: labels ? 88 : 72 }}
      preserveAspectRatio="xMidYMax meet"
    >
      <line x1="0" y1={CHART_H} x2={W} y2={CHART_H} stroke="#E5E7EB" strokeWidth="0.4" />
      {items.map((item, i) => {
        const incH = item.income > 0 ? Math.max((item.income / maxVal) * (CHART_H - 2), 2) : 0;
        const expH = item.expense > 0 ? Math.max((item.expense / maxVal) * (CHART_H - 2), 2) : 0;
        const x = i * SLOT;
        return (
          <g key={i}>
            {incH > 0 && (
              <rect x={x + 1} y={CHART_H - incH} width={8} height={incH} fill="#10b981" rx="1" />
            )}
            {expH > 0 && (
              <rect x={x + 11} y={CHART_H - expH} width={8} height={expH} fill="#ef4444" rx="1" />
            )}
            {labels && (
              <text
                x={x + SLOT / 2}
                y={TOTAL_H - 1}
                textAnchor="middle"
                fontSize="5"
                fill="#9CA3AF"
              >
                {labels[i]}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ── Legend row ──
function ChartLegend() {
  return (
    <div className="flex items-center gap-4 justify-center mt-2">
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-income dark:bg-income-dark" />
        <span className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Masuk</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-expense dark:bg-expense-dark" />
        <span className="text-[10px] text-[#9E9B98] dark:text-[#4A4948]">Keluar</span>
      </div>
    </div>
  );
}

// ── Upgrade gate ──
function UpgradeGate({ feature }: { feature: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] text-center px-6 py-10">
      <span className="text-4xl mb-3">🔒</span>
      <h3 className="text-[13px] font-bold text-[#1A1917] dark:text-[#F0EEE9] mb-1">Fitur Premium</h3>
      <p className="text-[11px] text-[#6B6864] dark:text-[#9E9B96] mb-4">
        {feature} tersedia untuk pengguna Premium & Trial.
      </p>
      <Link
        to="/subscription"
        className="px-4 py-2 bg-accent-500 dark:bg-accent-dark text-white text-xs font-semibold rounded-btn"
      >
        Upgrade Sekarang
      </Link>
    </div>
  );
}

// ── Month navigation ──
// BUG 1 FIX: separate canPrev / canNext so < is always enabled
function MonthNav({ month, year, onPrev, onNext, canPrev, canNext }: {
  month: number; year: number;
  onPrev: () => void; onNext: () => void;
  canPrev: boolean; canNext: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <button
        onClick={onPrev}
        disabled={!canPrev}
        className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-[#9E9B98] dark:text-[#4A4948] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] disabled:opacity-25 transition-colors"
      >
        ‹
      </button>
      <span className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">
        {MONTH_NAMES[month - 1]} {year}
      </span>
      <button
        onClick={onNext}
        disabled={!canNext}
        className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-[#9E9B98] dark:text-[#4A4948] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] disabled:opacity-25 transition-colors"
      >
        ›
      </button>
    </div>
  );
}

// ── Summary cards ──
function SummaryCards({ income, expense, savings, isLoading }: {
  income: number; expense: number; savings: number; isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
            <Skeleton className="h-2.5 w-10 rounded mb-2" />
            <Skeleton className="h-5 w-14 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
        <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">Masuk</p>
        <p className="text-[15px] font-bold font-mono leading-tight text-[#1E8A5A] dark:text-[#4CAF7A]">
          {formatRupiah(income, { compact: true })}
        </p>
      </div>
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
        <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">Keluar</p>
        <p className="text-[15px] font-bold font-mono leading-tight text-[#C94A1C] dark:text-[#E87340]">
          {formatRupiah(expense, { compact: true })}
        </p>
      </div>
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
        <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">Hemat</p>
        <p className={`text-[15px] font-bold font-mono leading-tight ${savings >= 0 ? "text-[#1E8A5A] dark:text-[#4CAF7A]" : "text-[#C94A1C] dark:text-[#E87340]"}`}>
          {formatRupiah(savings, { compact: true })}
        </p>
      </div>
    </div>
  );
}

// ── Category pie section ──
// IMPROVEMENT: legend below chart, each row: icon + name + % + amount
function CategoryPieSection({ categories, total, isIncome = false }: {
  categories: CategoryBreakdown[];
  total: number;
  isIncome?: boolean;
}) {
  if (categories.length === 0) return null;

  return (
    <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
      <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
        {isIncome ? "Pemasukan" : "Pengeluaran"} per Kategori
      </p>
      {/* Donut centered */}
      <div className="flex justify-center mb-4">
        <div className="w-28 h-28">
          <DonutChart
            data={categories.map((c) => ({ color: c.category.color, percentage: c.percentage }))}
          />
        </div>
      </div>
      {/* Legend below */}
      <div className="space-y-2">
        {categories.slice(0, 6).map((c, i) => (
          <div key={i} className="flex items-center gap-2">
            {/* Color dot + icon */}
            <span
              className="w-2.5 h-2.5 rounded-full shrink-0"
              style={{ backgroundColor: c.category.color }}
            />
            <span className="text-sm shrink-0">{c.category.icon}</span>
            {/* Name */}
            <span className="flex-1 text-[11px] text-[#1A1917] dark:text-[#F0EEE9] truncate">
              {c.category.name}
            </span>
            {/* Percentage */}
            <span className="text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] shrink-0 w-8 text-right">
              {c.percentage}%
            </span>
            {/* Amount */}
            <span className={`text-[11px] font-semibold font-mono shrink-0 w-16 text-right ${isIncome ? "text-income dark:text-income-dark" : "text-expense dark:text-expense-dark"}`}>
              {formatRupiah(c.amount, { compact: true })}
            </span>
          </div>
        ))}
        {categories.length > 6 && (
          <p className="text-[10px] text-[#9E9B98] dark:text-[#4A4948] pl-5">+{categories.length - 6} kategori lainnya</p>
        )}
      </div>
    </div>
  );
}

// ── Monthly view ──
function MonthlyView({ month, year, onPrev, onNext, canNext }: {
  month: number; year: number;
  onPrev: () => void; onNext: () => void;
  canNext: boolean;
}) {
  const { data, isLoading, error } = useMonthlyReport(month, year);
  const isGated = error instanceof ApiError && error.status === 403;

  return (
    <div className="p-4 space-y-4">
      <MonthNav
        month={month}
        year={year}
        onPrev={onPrev}
        onNext={onNext}
        canPrev={true}
        canNext={isGated ? false : canNext}
      />

      {isGated ? (
        <UpgradeGate feature="Laporan bulan lainnya" />
      ) : (
        <>
          <SummaryCards
            income={data?.income ?? 0}
            expense={data?.expense ?? 0}
            savings={data?.savings ?? 0}
            isLoading={isLoading}
          />

          {/* Expense by category */}
          {isLoading ? (
            <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
              <Skeleton className="h-3 w-36 rounded mb-3" />
              <Skeleton className="h-28 w-28 rounded-full mx-auto mb-4" />
              {[0, 1, 2].map((i) => <Skeleton key={i} className="h-3 w-full rounded mb-2" />)}
            </div>
          ) : data && data.expense_by_category.length > 0 ? (
            <CategoryPieSection categories={data.expense_by_category} total={data.expense} />
          ) : null}

          {/* Daily bar chart */}
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
            <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
              Transaksi Harian
            </p>
            {isLoading ? (
              <Skeleton className="h-20 w-full rounded" />
            ) : data ? (
              <>
                <DailyBarChart breakdown={data.daily_breakdown} />
                <ChartLegend />
              </>
            ) : null}
          </div>

          {/* Income by category */}
          {!isLoading && data && data.income_by_category.length > 0 && (
            <CategoryPieSection
              categories={data.income_by_category}
              total={data.income}
              isIncome
            />
          )}
        </>
      )}
    </div>
  );
}

// ── Trend view ──
function TrendView() {
  const { data, isLoading, error } = useTrendReport(6);
  const isGated = error instanceof ApiError && error.status === 403;

  if (isGated) return <div className="p-4"><UpgradeGate feature="Tren 6 bulan" /></div>;

  const items = data ? data.labels.map((_, i) => ({ income: data.income[i], expense: data.expense[i] })) : [];

  return (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
        <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
          Tren 6 Bulan Terakhir
        </p>
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded" />
        ) : data ? (
          <>
            <MultiBarChart items={items} labels={data.labels} />
            <ChartLegend />
          </>
        ) : null}
      </div>

      {data && (
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
          <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
            Detail per Bulan
          </p>
          <div className="space-y-2.5">
            {data.labels.map((label, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-16 text-[11px] text-[#6B6864] dark:text-[#9E9B96] shrink-0">{label}</span>
                <span className="flex-1 text-xs font-mono text-income dark:text-income-dark">
                  {formatRupiah(data.income[i], { compact: true })}
                </span>
                <span className="text-xs font-mono text-expense dark:text-expense-dark shrink-0">
                  {formatRupiah(data.expense[i], { compact: true })}
                </span>
                <span className={`text-xs font-mono font-semibold shrink-0 w-14 text-right ${data.savings[i] >= 0 ? "text-income dark:text-income-dark" : "text-expense dark:text-expense-dark"}`}>
                  {data.savings[i] >= 0 ? "+" : ""}{formatRupiah(data.savings[i], { compact: true })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Yearly view ──
function YearlyView({ year, onPrev, onNext }: {
  year: number; onPrev: () => void; onNext: () => void;
}) {
  const { data, isLoading, error } = useYearlyReport(year);
  const isGated = error instanceof ApiError && error.status === 403;

  if (isGated) return <div className="p-4"><UpgradeGate feature="Laporan tahunan" /></div>;

  const items = data ? data.months.map((m) => ({ income: m.income, expense: m.expense })) : [];
  const labels = data ? data.months.map((m) => m.label) : [];
  const totalIncome = data ? data.months.reduce((s, m) => s + m.income, 0) : 0;
  const totalExpense = data ? data.months.reduce((s, m) => s + m.expense, 0) : 0;
  const totalSavings = totalIncome - totalExpense;

  return (
    <div className="p-4 space-y-4">
      {/* Year nav */}
      <div className="flex items-center justify-between">
        <button
          onClick={onPrev}
          className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-[#9E9B98] dark:text-[#4A4948] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
        >
          ‹
        </button>
        <span className="text-[12px] font-semibold text-[#1A1917] dark:text-[#F0EEE9]">{year}</span>
        <button
          onClick={onNext}
          className="w-9 h-9 flex items-center justify-center rounded-full text-lg text-[#9E9B98] dark:text-[#4A4948] hover:bg-[#F0EEE9] dark:hover:bg-[#242522] transition-colors"
        >
          ›
        </button>
      </div>

      {/* Annual summary */}
      {(isLoading || data) && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">Masuk</p>
            <p className="text-[15px] font-bold font-mono leading-tight text-income dark:text-income-dark">
              {isLoading ? "—" : formatRupiah(totalIncome, { compact: true })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">Keluar</p>
            <p className="text-[15px] font-bold font-mono leading-tight text-expense dark:text-expense-dark">
              {isLoading ? "—" : formatRupiah(totalExpense, { compact: true })}
            </p>
          </div>
          <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3">
            <p className="text-[9px] uppercase tracking-wider text-[#9E9B98] dark:text-[#4A4948] mb-1">Hemat</p>
            <p className={`text-[15px] font-bold font-mono leading-tight ${totalSavings >= 0 ? "text-income dark:text-income-dark" : "text-expense dark:text-expense-dark"}`}>
              {isLoading ? "—" : formatRupiah(totalSavings, { compact: true })}
            </p>
          </div>
        </div>
      )}

      {/* Yearly bar chart */}
      <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] p-3.5">
        <p className="text-[11px] font-semibold text-[#1A1917] dark:text-[#F0EEE9] mb-3">
          Per Bulan {year}
        </p>
        {isLoading ? (
          <Skeleton className="h-24 w-full rounded" />
        ) : data ? (
          <>
            <MultiBarChart items={items} labels={labels} />
            <ChartLegend />
          </>
        ) : null}
      </div>

      {/* Monthly table */}
      {data && (
        <div className="bg-white dark:bg-[#1C1D1A] rounded-[14px] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] overflow-hidden">
          <div className="divide-y divide-[rgba(0,0,0,0.06)] dark:divide-[rgba(255,255,255,0.06)]">
            {data.months.map((m) => (
              <YearlyMonthRow key={m.month} item={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function YearlyMonthRow({ item }: { item: YearlyMonth }) {
  const hasData = item.income > 0 || item.expense > 0;
  return (
    <div className={`flex items-center px-4 py-2.5 gap-2 ${!hasData ? "opacity-35" : ""}`}>
      <span className="w-8 text-[11px] font-semibold text-[#6B6864] dark:text-[#9E9B96] shrink-0">{item.label}</span>
      <span className="flex-1 text-xs font-mono text-income dark:text-income-dark">
        {formatRupiah(item.income, { compact: true })}
      </span>
      <span className="text-xs font-mono text-expense dark:text-expense-dark shrink-0">
        {formatRupiah(item.expense, { compact: true })}
      </span>
      <span className={`text-xs font-mono font-semibold shrink-0 w-14 text-right ${item.savings >= 0 ? "text-income dark:text-income-dark" : "text-expense dark:text-expense-dark"}`}>
        {item.savings >= 0 ? "+" : ""}{formatRupiah(item.savings, { compact: true })}
      </span>
    </div>
  );
}

// ── Page ──
export function ReportsPage() {
  const [tab, setTab] = useState<Tab>("monthly");
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [yearlyYear, setYearlyYear] = useState(now.getFullYear());

  // BUG 1 FIX: prev always works, next disabled only at current month
  function prevMonth() {
    if (month === 1) { setMonth(12); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 12) { setMonth(1); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  }

  const isCurrentMonth = month === now.getMonth() + 1 && year === now.getFullYear();

  const tabs: { key: Tab; label: string }[] = [
    { key: "monthly", label: "Bulanan" },
    { key: "trend", label: "Tren" },
    { key: "yearly", label: "Tahunan" },
  ];

  return (
    <div className="flex flex-col pb-24">
      <Header title="Laporan" />

      {/* Tab bar */}
      <div className="flex gap-1.5 px-[17px] py-3 sticky top-14 bg-[#F7F6F3] dark:bg-[#111210] z-10">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              "flex-1 py-1.5 rounded-[9px] text-[10px] font-semibold transition-colors",
              tab === t.key
                ? "bg-accent-500 dark:bg-accent-dark text-white"
                : "bg-white dark:bg-[#1C1D1A] border border-[rgba(0,0,0,0.08)] dark:border-[rgba(255,255,255,0.07)] text-[#6B6864] dark:text-[#9E9B96]",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "monthly" && (
        <MonthlyView
          month={month}
          year={year}
          onPrev={prevMonth}
          onNext={nextMonth}
          canNext={!isCurrentMonth}
        />
      )}
      {tab === "trend" && <TrendView />}
      {tab === "yearly" && (
        <YearlyView
          year={yearlyYear}
          onPrev={() => setYearlyYear((y) => y - 1)}
          onNext={() => setYearlyYear((y) => y + 1)}
        />
      )}
    </div>
  );
}
