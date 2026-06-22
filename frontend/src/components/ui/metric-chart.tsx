import { useState, useRef } from 'react';

export interface SeriesPoint {
  value: number;
  date: string;
}

export interface MetricSeries {
  name: string;
  data: SeriesPoint[];
  accent?: MetricAccent;
}

export type MetricAccent = 'emerald' | 'rose' | 'neutral' | 'blue' | 'amber';
export type ChartView = 'curve' | 'bar';

export interface ChartSeries {
  name: string;
  data: SeriesPoint[];
  color: string;
}

export const ACCENTS: Record<MetricAccent, { stroke: string; fill: string; text: string }> = {
  emerald: { stroke: '#10b981', fill: 'rgba(16,185,129,0.1)', text: '#047857' },
  rose: { stroke: '#f43f5e', fill: 'rgba(244,63,94,0.1)', text: '#be123c' },
  neutral: { stroke: '#64748b', fill: 'rgba(100,116,139,0.1)', text: '#334155' },
  blue: { stroke: '#3b82f6', fill: 'rgba(59,130,246,0.1)', text: '#1d4ed8' },
  amber: { stroke: '#f59e0b', fill: 'rgba(245,158,11,0.1)', text: '#b45309' },
};

export const SERIES_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e'];

export function formatCompact(value: number): string {
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'k';
  return value.toString();
}

interface MetricChartProps {
  series: ChartSeries[];
  view: ChartView;
  defaultIndex?: number;
  valueFormatter: (value: number) => string;
  dateFormatter: (date: string) => string;
}

export function MetricChart({
  series,
  view,
  defaultIndex,
  valueFormatter,
  dateFormatter,
}: MetricChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const points = series[0]?.data || [];
  const nPoints = points.length;

  if (nPoints < 2) return null;

  const values = series.flatMap(s => s.data.map(d => d.value));
  const minVal = Math.min(...values) * 0.95;
  const maxVal = Math.max(...values) * 1.05;
  const range = maxVal - minVal || 1;

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    const step = width / (nPoints - 1);
    const index = Math.max(0, Math.min(nPoints - 1, Math.round(x / step)));
    
    setHoverIndex(index);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const getCoordinates = (data: SeriesPoint[], width: number, height: number) => {
    return data.map((d, i) => {
      const x = (i / (nPoints - 1)) * width;
      const y = height - ((d.value - minVal) / range) * height - 10; // offset padding
      return { x, y: Math.max(10, y) };
    });
  };

  const activeIndex = hoverIndex !== null ? hoverIndex : defaultIndex ?? (nPoints - 1);
  const activePoint = points[activeIndex];

  const width = 1000;
  const height = 150;

  return (
    <div ref={containerRef} className="relative w-full h-full group/chart" onMouseLeave={handleMouseLeave}>
      <svg
        className="w-full h-full overflow-visible cursor-crosshair"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        onMouseMove={handleMouseMove}
      >
        {series.map((s, sIdx) => {
          const coords = getCoordinates(s.data, width, height);

          // Path string builder
          let pathD = '';
          if (view === 'curve') {
            pathD = coords.reduce((acc, c, i) => {
              if (i === 0) return `M ${c.x} ${c.y}`;
              const prev = coords[i - 1];
              const cpX1 = prev.x + (c.x - prev.x) / 3;
              const cpY1 = prev.y;
              const cpX2 = prev.x + 2 * (c.x - prev.x) / 3;
              const cpY2 = c.y;
              return `${acc} C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${c.x} ${c.y}`;
            }, '');
          } else {
            // Render as bars instead of lines
            return (
              <g key={s.name}>
                {coords.map((c, idx) => {
                  const barW = (width / nPoints) * 0.6;
                  const barH = height - c.y;
                  const barX = c.x - barW / 2;
                  const isActive = idx === activeIndex;
                  return (
                    <rect
                      key={idx}
                      x={barX}
                      y={c.y}
                      width={barW}
                      height={Math.max(4, barH)}
                      fill={s.color}
                      opacity={isActive ? 0.95 : 0.45}
                      rx={3}
                      className="transition-all duration-200"
                    />
                  );
                })}
              </g>
            );
          }

          const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

          return (
            <g key={s.name}>
              {/* Area gradient fill */}
              <path
                d={areaD}
                fill={`url(#gradient-${sIdx})`}
                className="opacity-40"
              />
              <defs>
                <linearGradient id={`gradient-${sIdx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity="0.4" />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Stroke line */}
              <path
                d={pathD}
                fill="none"
                stroke={s.color}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Hover point circle marker */}
              {coords[activeIndex] && (
                <circle
                  cx={coords[activeIndex].x}
                  cy={coords[activeIndex].y}
                  r="7"
                  fill="#ffffff"
                  stroke={s.color}
                  strokeWidth="4"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {activePoint && (
        <div
          className="absolute z-20 pointer-events-none bg-slate-900/95 backdrop-blur-sm text-white rounded-xl px-3 py-2 text-xs shadow-xl flex flex-col gap-0.5 border border-slate-700/50 transition-all duration-75"
          style={{
            left: `${(activeIndex / (nPoints - 1)) * 100}%`,
            top: `10%`,
            transform: `translate(-50%, -100%)`,
            opacity: hoverIndex !== null ? 1 : 0,
          }}
        >
          <span className="font-semibold">{valueFormatter(activePoint.value)}</span>
          <span className="text-[10px] text-slate-400 font-medium">{dateFormatter(activePoint.date)}</span>
        </div>
      )}
    </div>
  );
}
