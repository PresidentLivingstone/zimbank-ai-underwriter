import { useEffect, useState } from 'react';
import {
  AlertTriangle, CheckCircle, XCircle, Clock,
  User, Briefcase, MapPin, CreditCard, Search,
  ChevronDown, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Customer } from '../types/customer';
import ScoreBar from '../components/ScoreBar';
import RiskBadge from '../components/RiskBadge';

/* ── Decision banner ── */
function DecisionBanner({ status, pod }: { status: string | null; pod: number | null }) {
  if (!status) return null;
  const pct = pod !== null ? (pod * 100).toFixed(2) : null;

  const configs = {
    'AUTO-APPROVED': {
      bg: '#059669', lightBg: '#ecfdf5', border: '#6ee7b7',
      textLight: '#d1fae5', textSub: '#a7f3d0',
      Icon: CheckCircle,
      title: 'AUTO-APPROVED',
      sub: 'Low risk profile — system authorised for disbursement.',
      tier: 'Basel IV Tier A — Proceed to loan agreement and disbursement workflow.',
    },
    'CREDIT UNDERWRITER REVIEW': {
      bg: '#d97706', lightBg: '#fffbeb', border: '#fcd34d',
      textLight: '#fef3c7', textSub: '#fde68a',
      Icon: Clock,
      title: 'CREDIT UNDERWRITER REVIEW',
      sub: 'Elevated risk — manual review required before decision.',
      tier: 'Basel IV Tier B — Refer to credit committee for manual assessment.',
    },
    'SYSTEM HARD DECLINED': {
      bg: '#dc2626', lightBg: '#fef2f2', border: '#fca5a5',
      textLight: '#fee2e2', textSub: '#fecaca',
      Icon: XCircle,
      title: 'SYSTEM HARD DECLINED',
      sub: 'Critical risk threshold exceeded — application rejected.',
      tier: 'Basel IV Tier C — Issue adverse action notice per regulatory requirements.',
    },
  } as const;

  const cfg = configs[status as keyof typeof configs];
  if (!cfg) return null;
  const { Icon } = cfg;

  return (
    <div className="rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-5 flex items-center gap-4" style={{ backgroundColor: cfg.bg }}>
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
        >
          <Icon size={26} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-lg leading-none">{cfg.title}</p>
          <p className="text-sm mt-1" style={{ color: cfg.textSub }}>{cfg.sub}</p>
        </div>
        {pct && (
          <div className="hidden sm:block text-right flex-shrink-0">
            <p className="text-3xl font-bold text-white tabular-nums">{pct}%</p>
            <p className="text-xs mt-0.5" style={{ color: cfg.textSub }}>Prob. of Default</p>
          </div>
        )}
      </div>
      <div
        className="px-6 py-2.5 text-xs font-medium"
        style={{ backgroundColor: cfg.lightBg, color: cfg.bg, borderBottom: `1px solid ${cfg.border}`, borderLeft: `1px solid ${cfg.border}`, borderRight: `1px solid ${cfg.border}`, borderRadius: '0 0 16px 16px' }}
      >
        {cfg.tier}
      </div>
    </div>
  );
}

/* ── Detail card ── */
function DetailCard({ icon: Icon, title, items }: {
  icon: any; title: string; items: [string, string | number | null][];
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 mb-4 pb-4 border-b border-slate-100">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: '#0d2137' }}
        >
          <Icon size={14} className="text-amber-400" />
        </div>
        <p className="text-sm font-bold text-slate-800">{title}</p>
      </div>
      <dl className="space-y-3">
        {items.map(([k, v]) => (
          <div key={k} className="flex items-start justify-between gap-3">
            <dt className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider flex-shrink-0">{k}</dt>
            <dd className="text-sm text-slate-800 font-semibold text-right">{v ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Underwriting({
  customerId,
  onNavigate,
}: {
  customerId: string | null;
  onNavigate: (p: any) => void;
}) {
  const [customers, setCustomers]   = useState<Customer[]>([]);
  const [selected, setSelected]     = useState<Customer | null>(null);
  const [loading, setLoading]       = useState(true);
  const [sideSearch, setSideSearch] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  async function handleDownloadPDF() {
    if (!selected) return;
    setDownloading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/pdf/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...selected,
          officer_name: 'Credit Officer',
          branch_code: 'HQ-001'
        }),
      });
      if (!res.ok) throw new Error('Failed to generate PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZimBank_Assessment_${selected.application_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download PDF report. Make sure the backend server is running.');
    } finally {
      setDownloading(false);
    }
  }

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setCustomers(data as Customer[]);
          const found = customerId ? data.find(c => c.id === customerId) : null;
          setSelected((found || data[0] || null) as Customer | null);
        }
        setLoading(false);
      });
  }, [customerId]);

  if (loading) {
    return <div className="py-24 text-center text-slate-400 text-sm">Loading underwriting data…</div>;
  }

  if (customers.length === 0) {
    return (
      <div className="py-24 text-center space-y-3">
        <p className="text-slate-600 font-semibold">No applications available</p>
        <p className="text-slate-400 text-sm">Submit an application to view underwriting reports.</p>
        <button onClick={() => onNavigate('new-application')} className="btn-primary mt-2">
          New Application
        </button>
      </div>
    );
  }

  const visible = customers.filter(cu =>
    !sideSearch ||
    cu.full_name.toLowerCase().includes(sideSearch.toLowerCase()) ||
    cu.application_id.toLowerCase().includes(sideSearch.toLowerCase())
  );

  const c = selected;

  return (
    <div className="flex gap-6 items-start">

      {/* ── Left panel: applicant list (desktop) ── */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 flex-shrink-0">
        <div className="card overflow-hidden sticky top-[129px]">
          {/* Header */}
          <div
            className="px-4 py-3 flex items-center gap-2"
            style={{ backgroundColor: '#0d2137' }}
          >
            <Search size={13} style={{ color: 'rgba(255,255,255,0.45)' }} />
            <input
              type="text"
              placeholder="Search applicants…"
              value={sideSearch}
              onChange={e => setSideSearch(e.target.value)}
              className="flex-1 bg-transparent text-xs outline-none placeholder-slate-500"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            />
          </div>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold px-4 py-2 border-b border-slate-100">
            {visible.length} applicant{visible.length !== 1 ? 's' : ''}
          </p>
          <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 260px)' }}>
            {visible.map(cu => (
              <button
                key={cu.id}
                onClick={() => setSelected(cu)}
                className="w-full text-left px-4 py-3 border-b border-slate-100 border-l-2 transition-all last:border-b-0"
                style={{
                  borderLeftColor: selected?.id === cu.id ? '#1a3a5c' : 'transparent',
                  backgroundColor: selected?.id === cu.id ? 'rgba(26,58,92,0.04)' : undefined,
                }}
              >
                <p className={`text-xs font-semibold truncate ${selected?.id === cu.id ? 'text-[#1a3a5c]' : 'text-slate-700'}`}>
                  {cu.full_name}
                </p>
                <p className="text-[10px] font-mono text-slate-400 mt-0.5">{cu.application_id}</p>
                <div className="mt-1.5">
                  <RiskBadge status={cu.underwriting_status} size="sm" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* ── Right: detail report ── */}
      {c ? (
        <div className="flex-1 space-y-4 min-w-0">

          {/* Mobile applicant selector */}
          <div className="lg:hidden">
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="card w-full px-4 py-3 flex items-center justify-between text-sm font-semibold text-slate-700"
            >
              <span>{c.full_name} — {c.application_id}</span>
              <ChevronDown size={16} className={`text-slate-400 transition-transform ${mobileOpen ? 'rotate-180' : ''}`} />
            </button>
            {mobileOpen && (
              <div className="card mt-1 overflow-hidden max-h-64 overflow-y-auto">
                {customers.map(cu => (
                  <button
                    key={cu.id}
                    onClick={() => { setSelected(cu); setMobileOpen(false); }}
                    className="w-full text-left px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors"
                  >
                    <p className="text-sm font-medium text-slate-800">{cu.full_name}</p>
                    <p className="text-xs font-mono text-slate-400 mt-0.5">{cu.application_id}</p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Report header */}
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{c.full_name}</h2>
              <p className="text-slate-400 text-sm font-mono mt-0.5">
                {c.application_id} &mdash; {c.product_code} &mdash; {c.loan_purpose}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all font-semibold text-xs px-4.5 py-2 rounded-xl shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download size={13} className={downloading ? 'animate-bounce' : ''} />
                {downloading ? 'Generating Report...' : 'Download PDF Report'}
              </button>
              <RiskBadge status={c.underwriting_status} size="lg" />
            </div>
          </div>

          {/* Decision banner */}
          <DecisionBanner status={c.underwriting_status} pod={c.default_probability} />

          {/* Key metric strip */}
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
            {[
              {
                label: 'Probability of Default',
                value: c.default_probability !== null ? `${(c.default_probability * 100).toFixed(2)}%` : '—',
                warn: c.default_probability !== null && c.default_probability >= 0.35,
              },
              {
                label: 'DTI Ratio',
                value: c.dti_ratio !== null ? c.dti_ratio.toFixed(4) : '—',
                warn: c.flag_high_dti,
              },
              {
                label: 'Monthly Installment',
                value: c.monthly_installment !== null ? `$${c.monthly_installment.toFixed(2)}` : '—',
                warn: false,
              },
              {
                label: 'Loan-to-Income',
                value: c.total_to_income !== null ? c.total_to_income.toFixed(3) : '—',
                warn: false,
              },
            ].map(({ label, value, warn }) => (
              <div
                key={label}
                className="card p-4"
                style={warn ? { outlineWidth: 1, outlineStyle: 'solid', outlineColor: '#fca5a5', outlineOffset: 0 } : undefined}
              >
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold leading-none">{label}</p>
                <p className={`text-xl font-bold mt-2 leading-none ${warn ? 'text-red-600' : 'text-slate-900'}`}>
                  {value}
                </p>
              </div>
            ))}
          </div>

          {/* Risk flags */}
          {(c.flag_high_dti || c.flag_tenure_instability || c.flag_credit_leverage || c.flag_demographic_burden) && (
            <div className="card p-5">
              <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 mb-3">
                Critical Risk Flags
              </p>
              <div className="space-y-2">
                {[
                  {
                    flag: c.flag_high_dti,
                    title: 'High DTI Ratio (>0.42)',
                    desc: 'Systemic payment vulnerability under income shock conditions.',
                  },
                  {
                    flag: c.flag_tenure_instability,
                    title: 'Tenure Instability (<12 months)',
                    desc: 'Probationary employment detected — elevated income risk.',
                  },
                  {
                    flag: c.flag_credit_leverage,
                    title: 'Credit Leverage (>2 obligations)',
                    desc: 'Over-extended credit profile with multiple active exposures.',
                  },
                  {
                    flag: c.flag_demographic_burden,
                    title: 'Demographic Burden (>3 dependents)',
                    desc: 'Elevated non-discretionary spending baseline.',
                  },
                ]
                  .filter(f => f.flag)
                  .map(({ title, desc }) => (
                    <div key={title} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                      <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-800 leading-none">{title}</p>
                        <p className="text-xs text-amber-600 mt-1">{desc}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Score bars */}
          <div className="card p-6">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 mb-5">
              Risk Component Analysis — Basel IV Scoring Matrix
            </p>
            <div className="space-y-4">
              <ScoreBar label="DTI Burden Score"        score={c.dti_burden_score} />
              <ScoreBar label="Employment Stability"    score={c.employment_stability_score} />
              <ScoreBar label="Existing Leverage"       score={c.existing_leverage_score} />
              <ScoreBar label="Life Stage Profile Risk" score={c.life_stage_score} />
              <ScoreBar label="Loan-to-Income Index"    score={c.loan_to_income_score} />
            </div>
          </div>

          {/* Detail cards 2×2 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <DetailCard icon={User} title="Applicant Profile" items={[
              ['Full Name',       c.full_name],
              ['Application ID',  c.application_id],
              ['Date of Birth',   c.client_dob],
              ['Province',        c.province],
              ['Dependents',      c.num_dependents],
            ]} />
            <DetailCard icon={Briefcase} title="Employment" items={[
              ['Sector',           c.employment_sector],
              ['Months at Employer', c.months_at_employer],
              ['Monthly Income',   `$${Number(c.monthly_income_usd).toLocaleString()} USD`],
              ['Obligations',      c.existing_obligations],
              ['Work Stability',   c.work_stability?.toFixed(4) ?? '—'],
            ]} />
            <DetailCard icon={CreditCard} title="Loan Facility" items={[
              ['Principal',   `$${Number(c.amount_usd).toLocaleString()} USD`],
              ['Annual Rate', `${c.annual_rate_pct}%`],
              ['Term',        `${c.term_months} months`],
              ['Product',     c.product_code],
              ['Purpose',     c.loan_purpose],
            ]} />
            <DetailCard icon={MapPin} title="Computed Ratios" items={[
              ['DTI Ratio',          c.dti_ratio?.toFixed(4) ?? '—'],
              ['Total-to-Income',    c.total_to_income?.toFixed(4) ?? '—'],
              ['Installment',        c.monthly_installment !== null ? `$${c.monthly_installment.toFixed(2)}` : '—'],
              ['Risk Tier',          c.risk_tier ?? '—'],
              ['Submitted',          new Date(c.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })],
            ]} />
          </div>

          {/* Action buttons */}
          <div className="card p-5">
            <p className="text-[11px] uppercase tracking-widest font-semibold text-slate-400 mb-3.5">
              Next Steps & Workflows
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                onClick={() => alert('Application queued for Credit Committee review.')}
                className="btn-primary w-full py-2.5 text-xs font-semibold"
              >
                Send to Credit Committee
              </button>
              <button
                onClick={() => alert('Assessment successfully archived in SQLite history.')}
                className="btn-ghost w-full py-2.5 text-xs font-semibold"
              >
                Archive Assessment
              </button>
              <button
                onClick={() => onNavigate('new-application')}
                className="btn-ghost w-full py-2.5 text-xs font-semibold border-amber-300 hover:border-amber-400 text-amber-700 hover:text-amber-800"
              >
                Score Another Applicant
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
