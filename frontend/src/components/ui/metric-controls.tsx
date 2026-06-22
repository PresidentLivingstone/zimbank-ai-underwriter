import { useState } from 'react';
import { Calendar, ChevronDown, BarChart2, TrendingUp } from 'lucide-react';
import { type ChartView } from './metric-chart';

export interface PeriodOption {
  label: string;
  points?: number;
}

interface PeriodSelectProps {
  value: string;
  options: PeriodOption[];
  onChange: (option: PeriodOption) => void;
  accentText?: string;
}

export function PeriodSelect({ value, options, onChange, accentText }: PeriodSelectProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative pointer-events-auto">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-medium transition-colors"
      >
        <Calendar size={14} />
        <span>{value}</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-1.5 w-40 z-40 rounded-xl bg-white border border-slate-200 shadow-lg py-1 text-xs">
            {options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => {
                  onChange(opt);
                  setOpen(false);
                }}
                className={`w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors ${
                  value === opt.label ? 'font-semibold text-slate-900 bg-slate-50/50' : 'text-slate-600'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface ViewToggleProps {
  value: ChartView;
  onChange: (view: ChartView) => void;
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 pointer-events-auto">
      <button
        type="button"
        onClick={() => onChange('curve')}
        className={`p-1 rounded-md transition-colors ${
          value === 'curve' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
        }`}
        title="Line Chart"
      >
        <TrendingUp size={14} />
      </button>
      <button
        type="button"
        onClick={() => onChange('bar')}
        className={`p-1 rounded-md transition-colors ${
          value === 'bar' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'
        }`}
        title="Bar Chart"
      >
        <BarChart2 size={14} />
      </button>
    </div>
  );
}
