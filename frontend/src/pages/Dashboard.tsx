import { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp, Users, CheckCircle, Clock, XCircle,
  DollarSign, Activity, ArrowUpRight, Upload, Download,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Customer } from '../types/customer';
import RiskBadge from '../components/RiskBadge';

interface Stats {
  total: number; approved: number; review: number; declined: number;
  totalLoan: number; avgPod: number;
}

function KpiCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string | number; sub?: string; icon: any; color: string;
}) {
  return (
    <div className="card p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: any }) {
  return (
    <div className="card p-5 flex items-center gap-4">
      <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: '#0d2137' }}>
        <Icon size={19} className="text-amber-400" />
      </div>
      <div>
        <p className="text-[11px] text-slate-400 uppercase tracking-widest font-semibold">{label}</p>
        <p className="text-lg font-bold text-slate-900 mt-0.5">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard({ onNavigate, onSelectCustomer }: {
  onNavigate: (p: any) => void;
  onSelectCustomer?: (id: string) => void;
}) {
  const [stats, setStats] = useState<Stats>({ total: 0, approved: 0, review: 0, declined: 0, totalLoan: 0, avgPod: 0 });
  const [recent, setRecent] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [file, setFile] = useState<File | null>(null);
  const [batchResults, setBatchResults] = useState<any[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchPdfDownloading, setBatchPdfDownloading] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) {
      const total    = data.length;
      const approved = data.filter(c => c.underwriting_status === 'AUTO-APPROVED').length;
      const review   = data.filter(c => c.underwriting_status === 'CREDIT UNDERWRITER REVIEW').length;
      const declined = data.filter(c => c.underwriting_status === 'SYSTEM HARD DECLINED').length;
      const totalLoan = data.reduce((s, c) => s + (c.amount_usd || 0), 0);
      const pods     = data.filter(c => c.default_probability !== null).map(c => c.default_probability as number);
      const avgPod   = pods.length ? pods.reduce((s, p) => s + p, 0) / pods.length : 0;
      setStats({ total, approved, review, declined, totalLoan, avgPod });
      setRecent(data.slice(0, 8) as Customer[]);
    }
    setLoading(false);
  }, []);

  async function handleBatchUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setBatchLoading(true);
    setBatchResults(null);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/batch-score`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || 'Failed to score batch CSV file');
      }
      const data = await res.json();
      setBatchResults(data);
      load();
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Error processing batch ledger. Make sure the backend is running.');
    } finally {
      setBatchLoading(false);
    }
  }

  async function handleDownloadBatchCSV() {
    if (!batchResults) return;
    const headers = ['ID', 'full_name', 'province', 'employment_sector', 'amount_usd', 'default_probability', 'risk_tier'];
    const csvRows = [
      headers.join(','),
      ...batchResults.map(r => [
        r.ID,
        `"${r.full_name}"`,
        `"${r.province}"`,
        `"${r.employment_sector}"`,
        r.amount_usd,
        r.default_probability,
        `"${r.risk_tier}"`
      ].join(','))
    ];
    const csvContent = csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ZimBank_Batch_Scores_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  async function handleDownloadBatchPDF() {
    if (!batchResults) return;
    setBatchPdfDownloading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/api/pdf/portfolio`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch_data: batchResults,
          officer_name: 'Credit Officer',
          branch_code: 'HQ-001'
        }),
      });
      if (!res.ok) throw new Error('Failed to generate portfolio PDF');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZimBank_Portfolio_Summary_${Date.now()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download portfolio summary PDF');
    } finally {
      setBatchPdfDownloading(false);
    }
  }

  useEffect(() => { load(); }, [load]);

  const rate = stats.total > 0 ? ((stats.approved / stats.total) * 100).toFixed(0) : '0';

  function handleRowClick(c: Customer) {
    if (onSelectCustomer) onSelectCustomer(c.id);
    onNavigate('underwriting');
  }

  const Skeleton = () => (
    <div className="h-4 bg-slate-100 rounded-full animate-pulse" />
  );

  return (
    <div className="space-y-6">

      {/* KPI row */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard label="Total Applications" icon={Users}         color="bg-[#1a3a5c]"  value={loading ? '—' : stats.total} />
        <KpiCard label="Auto-Approved"       icon={CheckCircle}  color="bg-emerald-500" value={loading ? '—' : stats.approved}
          sub={stats.total > 0 ? `${rate}% approval rate` : undefined} />
        <KpiCard label="Pending Review"      icon={Clock}        color="bg-amber-500"   value={loading ? '—' : stats.review} />
        <KpiCard label="Hard Declined"       icon={XCircle}      color="bg-red-500"     value={loading ? '—' : stats.declined} />
      </div>

      {/* Secondary metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <MetricCard
          label="Portfolio Exposure"
          icon={DollarSign}
          value={loading ? '—' : `$${stats.totalLoan.toLocaleString('en-US', { maximumFractionDigits: 0 })} USD`}
        />
        <MetricCard
          label="Avg. Prob. of Default"
          icon={Activity}
          value={loading ? '—' : `${(stats.avgPod * 100).toFixed(1)}%`}
        />
        <MetricCard
          label="Approval Rate"
          icon={TrendingUp}
          value={loading ? '—' : `${rate}%`}
        />
      </div>

      {/* Recent applications */}
      <div className="card overflow-hidden">
        {/* Table header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800">Recent Applications</h2>
            <p className="text-xs text-slate-400 mt-0.5">Latest credit underwriting submissions</p>
          </div>
          <button
            onClick={() => onNavigate('customers')}
            className="flex items-center gap-1.5 text-xs font-bold transition-colors"
            style={{ color: '#1a3a5c' }}
          >
            View all <ArrowUpRight size={13} />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="grid grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, j) => <Skeleton key={j} />)}
              </div>
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <Users size={24} className="text-slate-300" />
            </div>
            <p className="text-slate-600 font-semibold text-sm">No applications yet</p>
            <p className="text-slate-400 text-xs mt-1 mb-5">
              Submit your first credit application to begin portfolio tracking.
            </p>
            <button onClick={() => onNavigate('new-application')} className="btn-primary">
              Submit Application
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {[
                    { h: 'Applicant', align: 'left', cls: '' },
                    { h: 'Application ID', align: 'left', cls: 'hidden md:table-cell' },
                    { h: 'Province', align: 'left', cls: 'hidden lg:table-cell' },
                    { h: 'Amount (USD)', align: 'right', cls: '' },
                    { h: 'POD', align: 'right', cls: 'hidden lg:table-cell' },
                    { h: 'Status', align: 'left', cls: '' },
                    { h: '', align: 'left', cls: '' },
                  ].map(({ h, align, cls }) => (
                    <th
                      key={h}
                      className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${align === 'right' ? 'text-right' : 'text-left'} ${cls}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recent.map(c => (
                  <tr
                    key={c.id}
                    className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    onClick={() => handleRowClick(c)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                          style={{ backgroundColor: 'rgba(13,33,55,0.07)', color: '#1a3a5c' }}
                        >
                          {c.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                        </div>
                        <span className="font-medium text-slate-800">{c.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-500 hidden md:table-cell">
                      {c.application_id}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 hidden lg:table-cell">{c.province}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                      ${Number(c.amount_usd).toLocaleString()}
                    </td>
                    <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                      <span className={`font-semibold tabular-nums ${
                        c.default_probability === null ? 'text-slate-400'
                          : c.default_probability < 0.35 ? 'text-emerald-600'
                          : c.default_probability < 0.60 ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {c.default_probability !== null ? `${(c.default_probability * 100).toFixed(1)}%` : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <RiskBadge status={c.underwriting_status} size="sm" />
                    </td>
                    <td className="px-3 py-3.5 w-8">
                      <ArrowUpRight
                        size={14}
                        className="text-slate-300 group-hover:text-slate-500 transition-colors"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Batch Ingestion Card */}
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">Portfolio Batch Credit Underwriting</h2>
          <p className="text-xs text-slate-400 mt-0.5">Upload a Test.csv ledger file to perform batch credit risk assessment.</p>
        </div>
        <div className="p-6">
          <form onSubmit={handleBatchUpload} className="flex flex-col sm:flex-row items-center gap-4">
            <div className="relative flex-1 w-full">
              <input
                type="file"
                accept=".csv"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
              />
            </div>
            <button
              type="submit"
              disabled={!file || batchLoading}
              className="btn-primary w-full sm:w-auto px-6 py-2.5 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={14} className={batchLoading ? 'animate-spin' : ''} />
              {batchLoading ? 'Processing Ledger...' : 'Run Batch Underwriting'}
            </button>
          </form>

          {batchResults && (
            <div className="mt-8 space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <p className="text-sm font-bold text-slate-800">Scored Results ({batchResults.length} records)</p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadBatchCSV}
                    className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm"
                  >
                    <Download size={12} />
                    Download CSV Scores
                  </button>
                  <button
                    onClick={handleDownloadBatchPDF}
                    disabled={batchPdfDownloading}
                    className="inline-flex items-center gap-2 border border-slate-200 text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 transition-all font-semibold text-xs px-3.5 py-2 rounded-xl shadow-sm disabled:opacity-50"
                  >
                    <Download size={12} className={batchPdfDownloading ? 'animate-bounce' : ''} />
                    {batchPdfDownloading ? 'Generating PDF...' : 'Download Summary PDF'}
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-100 rounded-xl">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">ID</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Applicant</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Province</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase">Amount</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold text-slate-400 uppercase">POD</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">Risk Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {batchResults.slice(0, 10).map((r, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.ID}</td>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{r.full_name}</td>
                        <td className="px-4 py-2.5 text-slate-600">{r.province}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-800">${Number(r.amount_usd).toLocaleString()}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-semibold ${
                            r.default_probability < 0.35 ? 'text-emerald-600' : r.default_probability < 0.60 ? 'text-amber-600' : 'text-red-600'
                          }`}>
                            {(r.default_probability * 100).toFixed(2)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            r.risk_tier.includes('Low') ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            r.risk_tier.includes('Medium') ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                            'bg-red-50 text-red-700 border border-red-200'
                          }`}>
                            {r.risk_tier}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {batchResults.length > 10 && (
                <p className="text-center text-xs text-slate-400 font-semibold pt-1">
                  Showing first 10 of {batchResults.length} records. Download CSV for full details.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
