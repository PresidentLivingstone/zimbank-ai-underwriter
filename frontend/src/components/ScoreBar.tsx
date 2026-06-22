interface ScoreBarProps {
  label: string;
  score: number | null;
  showValue?: boolean;
}

export default function ScoreBar({ label, score, showValue = true }: ScoreBarProps) {
  if (score === null) return null;
  const pct = Math.min(score, 100);
  const color = pct < 30 ? 'bg-emerald-500' : pct < 60 ? 'bg-amber-400' : 'bg-red-500';
  const textColor = pct < 30 ? 'text-emerald-600' : pct < 60 ? 'text-amber-600' : 'text-red-600';
  const label2 = pct < 30 ? 'Low' : pct < 60 ? 'Elevated' : 'Critical';

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-600 font-medium">{label}</span>
        <div className="flex items-center gap-2">
          <span className={`font-semibold ${textColor}`}>{label2}</span>
          {showValue && <span className="text-slate-400 tabular-nums w-6 text-right">{score.toFixed(0)}</span>}
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
