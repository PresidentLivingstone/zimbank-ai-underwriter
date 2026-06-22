import { useId, useMemo, useState } from 'react';
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react';
import {
  ACCENTS,
  formatCompact,
  MetricChart,
  SERIES_COLORS,
  type ChartSeries,
  type ChartView,
  type MetricAccent,
  type MetricSeries,
  type SeriesPoint,
} from './metric-chart';
import { PeriodSelect, ViewToggle, type PeriodOption } from './metric-controls';

// Ré-export des types pour que les consommateurs n'importent que ce fichier.
export type { SeriesPoint, MetricSeries, MetricAccent, ChartView, PeriodOption };

export type CardSize = 'sm' | 'md' | 'lg';

export interface ProgressMetricCardProps {
  title: string;
  total?: string | number;
  delta?: string;
  deltaLabel?: string;
  percent?: string;
  trend?: 'up' | 'down';
  unit?: string;
  period?: string;
  periodOptions?: PeriodOption[];
  onPeriodChange?: (option: PeriodOption) => void;
  defaultView?: ChartView;
  accent?: MetricAccent;
  /** Série unique. À fournir, OU `series`. */
  data?: SeriesPoint[];
  /** Plusieurs séries nommées. Prioritaire sur `data`. */
  series?: MetricSeries[];
  defaultIndex?: number;
  size?: CardSize;
  /** Affiche les stats secondaires (peak / low / avg) dans le footer. */
  showStats?: boolean;
  /** Format des valeurs. Par défaut : compact en titre, exact en tooltip. */
  valueFormatter?: (value: number) => string;
  dateFormatter?: (date: string) => string;
  loading?: boolean;
  className?: string;
}

const DEFAULT_PERIODS: PeriodOption[] = [
  { label: 'Past 7 days', points: 4 },
  { label: 'Past 14 days', points: 7 },
  { label: 'Past 30 days' },
];

// Part de la card (depuis la droite) occupée par le graphe.
const REGION_W = 62; // %
// Variation sous ce seuil = "stable" → accent neutre.
const NEUTRAL_PCT = 0.5;

const SIZES: Record<
  CardSize,
  { minH: string; pad: string; footer: string; title: string; headline: string }
> = {
  sm: { minH: 'min-h-[220px]', pad: 'px-5 pt-4', footer: 'px-5 py-2.5', title: 'text-[14px]', headline: 'text-[36px]' },
  md: { minH: 'min-h-[280px]', pad: 'px-6 pt-5', footer: 'px-6 py-3', title: 'text-[15px]', headline: 'text-[44px]' },
  lg: { minH: 'min-h-[340px]', pad: 'px-8 pt-7', footer: 'px-8 py-4', title: 'text-[17px]', headline: 'text-[52px]' },
};

const sliceWindow = (points: SeriesPoint[], n?: number) =>
  n && n < points.length ? points.slice(-n) : points;

export default function ProgressMetricCard({
  title,
  total,
  delta,
  deltaLabel = 'today',
  percent,
  trend,
  unit,
  period = 'Past 30 days',
  periodOptions,
  onPeriodChange,
  defaultView = 'curve',
  accent,
  data,
  series,
  defaultIndex,
  size = 'md',
  showStats = true,
  valueFormatter,
  dateFormatter,
  loading = false,
  className = '',
}: ProgressMetricCardProps) {
  const gridId = `grid-${useId().replace(/:/g, '')}`;
  const sz = SIZES[size];
  const shell = `relative flex ${sz.minH} w-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white/70 backdrop-blur-sm shadow-[0_2px_10px_rgba(0,0,0,0.03)] ${className}`;

  const periods = periodOptions ?? DEFAULT_PERIODS;
  const [selectedLabel, setSelectedLabel] = useState(period);
  const [view, setView] = useState<ChartView>(defaultView);

  // Normalise l'entrée en liste de séries (un `data` simple → une seule série).
  const baseSeries: MetricSeries[] = useMemo(
    () => (series?.length ? series : [{ name: title, data: data ?? [], accent }]),
    [series, data, title, accent],
  );

  const selectedOption =
    periods.find((p) => p.label === selectedLabel) ?? periods[periods.length - 1];

  // Découpe chaque série sur la période choisie.
  const visibleSeries = useMemo(
    () => baseSeries.map((s) => ({ ...s, data: sliceWindow(s.data, selectedOption?.points) })),
    [baseSeries, selectedOption],
  );

  const primary = visibleSeries[0];
  const isMulti = visibleSeries.length > 1;
  const hasData = (primary?.data.length ?? 0) >= 2;

  // Tous les chiffres dérivent de la série principale → la card reste cohérente
  // et réagit au changement de période. Les props restent prioritaires.
  const stats = useMemo(() => {
    const vals = primary?.data.map((d) => d.value) ?? [];
    const sum = vals.reduce((a, b) => a + b, 0);
    const first = vals[0] ?? 0;
    const last = vals[vals.length - 1] ?? 0;
    const prev = vals[vals.length - 2] ?? first;
    const net = last - first;
    return {
      sum,
      net,
      pct: first ? (net / first) * 100 : 0,
      step: last - prev,
      peak: vals.length ? Math.max(...vals) : 0,
      low: vals.length ? Math.min(...vals) : 0,
      avg: vals.length ? sum / vals.length : 0,
    };
  }, [primary]);

  // La couleur dépend du sens (dernier vs premier point), avec une zone neutre.
  const resolvedTrend: 'up' | 'down' | 'flat' =
    trend ?? (Math.abs(stats.pct) < NEUTRAL_PCT ? 'flat' : stats.net >= 0 ? 'up' : 'down');
  const resolvedAccent: MetricAccent =
    accent ?? (resolvedTrend === 'up' ? 'emerald' : resolvedTrend === 'down' ? 'rose' : 'neutral');
  const color = ACCENTS[resolvedAccent];
  const TrendIcon =
    resolvedTrend === 'flat' ? ArrowRight : resolvedTrend === 'down' ? ArrowDown : ArrowUp;

  const fmtCompact = valueFormatter ?? formatCompact;
  const fmtFull = valueFormatter ?? ((n: number) => n.toLocaleString() + (unit ? ` ${unit}` : ''));
  const fmtDate = dateFormatter ?? ((d: string) => d);
  const sign = (n: number) => (n >= 0 ? '+' : '−') + fmtCompact(Math.abs(n));

  const displayTotal = total ?? fmtCompact(stats.sum);
  const displayDelta = delta ?? sign(stats.step);
  const displayPercent = percent ?? `${Math.abs(stats.pct).toFixed(1)}%`;

  // Couleur de chaque série : accent défini → palette → couleur du titre.
  const chartSeries: ChartSeries[] = visibleSeries.map((s, i) => ({
    name: s.name,
    data: s.data,
    color: s.accent
      ? ACCENTS[s.accent].stroke
      : isMulti
        ? SERIES_COLORS[i % SERIES_COLORS.length]
        : color.stroke,
  }));

  const lastIndex = (primary?.data.length ?? 1) - 1;
  const fallback = Math.min(defaultIndex ?? lastIndex, lastIndex);

  const handlePeriodChange = (option: PeriodOption) => {
    setSelectedLabel(option.label);
    onPeriodChange?.(option);
  };

  if (loading) {
    return (
      <div className={shell} aria-busy="true">
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <div className="flex items-center justify-between">
            <div className="h-5 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-24 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="mt-6 h-14 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="mt-auto h-24 w-full animate-pulse rounded-lg bg-slate-200/50" />
        </div>
        <div className={`border-t border-slate-100 ${sz.footer}`}>
          <div className="h-4 w-40 animate-pulse rounded bg-slate-200" />
        </div>
      </div>
    );
  }

  if (!hasData) {
    return (
      <div className={shell}>
        <div className={`flex flex-1 flex-col ${sz.pad}`}>
          <h3 className={`${sz.title} font-semibold tracking-tight text-slate-800`}>{title}</h3>
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <p className="text-sm font-medium text-slate-800">No data yet</p>
            <p className="text-xs text-slate-400">
              Metrics will appear once data is available.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={shell}>
      {/* Zone du graphe (à droite, derrière le contenu) */}
      <div className="absolute inset-y-0 right-0 z-0 pointer-events-none" style={{ width: `${REGION_W}%` }}>
        <div
          className="absolute inset-0"
          style={{ background: `linear-gradient(to left, ${color.stroke}14, transparent 80%)` }}
        />
        <div
          className="absolute inset-0 text-slate-200/50"
          style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent, black 40%)',
            maskImage: 'linear-gradient(to right, transparent, black 40%)',
          }}
        >
          <svg className="h-full w-full" aria-hidden="true">
            <defs>
              <pattern id={gridId} width="14" height="14" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill={`url(#${gridId})`} />
          </svg>
        </div>

        <div className="w-full h-full p-6">
          <MetricChart
            series={chartSeries}
            view={view}
            defaultIndex={fallback}
            valueFormatter={fmtFull}
            dateFormatter={fmtDate}
          />
        </div>
      </div>

      {/* Contenu principal */}
      <div className={`relative z-10 flex flex-1 flex-col ${sz.pad}`}>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h3 className={`${sz.title} font-semibold tracking-tight text-slate-700`}>{title}</h3>
            <ViewToggle value={view} onChange={setView} />
          </div>
          <div className="flex items-center gap-3.5 text-[14px]">
            <span className="flex items-center gap-1 font-semibold" style={{ color: color.text }}>
              <TrendIcon size={16} strokeWidth={2.5} />
              {displayPercent}
            </span>
            <PeriodSelect
              value={selectedLabel}
              options={periods}
              onChange={handlePeriodChange}
              accentText={color.text}
            />
          </div>
        </div>

        {/* Légende (seulement en multi-séries) */}
        {isMulti && (
          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1">
            {chartSeries.map((s) => (
              <span
                key={s.name}
                className="flex items-center gap-1.5 text-[12px] text-slate-500"
              >
                <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
                {s.name}
              </span>
            ))}
          </div>
        )}

        <div
          className={`mt-4 ${sz.headline} font-bold leading-none tracking-tight text-slate-900`}
        >
          {displayTotal}
        </div>
      </div>

      {/* Footer opaque : delta à gauche, stats secondaires à droite */}
      <div
        className={`relative z-10 flex items-center justify-between gap-4 border-t border-slate-100 bg-white/40 ${sz.footer} text-[13px]`}
      >
        <div>
          <span className="font-semibold" style={{ color: color.text }}>
            {displayDelta}
          </span>{' '}
          <span className="text-slate-500">{deltaLabel}</span>
        </div>
        {showStats && (
          <div className="flex items-center gap-2 text-[11px] text-slate-400 font-medium">
            <span>
              Peak: <span className="font-semibold text-slate-600">{fmtCompact(stats.peak)}</span>
            </span>
            <span className="opacity-40">·</span>
            <span>
              Low: <span className="font-semibold text-slate-600">{fmtCompact(stats.low)}</span>
            </span>
            <span className="opacity-40">·</span>
            <span>
              Avg: <span className="font-semibold text-slate-600">{fmtCompact(Math.round(stats.avg))}</span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
