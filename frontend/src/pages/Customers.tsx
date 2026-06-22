import { useEffect, useState } from 'react';
import { Search, ChevronsUpDown, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Customer } from '../types/customer';
import RiskBadge from '../components/RiskBadge';

type SortKey = 'created_at' | 'full_name' | 'amount_usd' | 'default_probability';
type SortDir  = 'asc' | 'desc';

const FILTER_TABS = [
  { value: 'all',      label: 'All' },
  { value: 'approved', label: 'Approved' },
  { value: 'review',   label: 'Review' },
  { value: 'declined', label: 'Declined' },
];

export default function Customers({
  onNavigate,
  onSelectCustomer,
}: {
  onNavigate: (p: any) => void;
  onSelectCustomer: (id: string) => void;
}) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [filter, setFilter]       = useState('all');
  const [sortKey, setSortKey]     = useState<SortKey>('created_at');
  const [sortDir, setSortDir]     = useState<SortDir>('desc');

  useEffect(() => {
    supabase
      .from('customers')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setCustomers(data as Customer[]);
        setLoading(false);
      });
  }, []);

  const filtered = customers
    .filter(c => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        c.application_id.toLowerCase().includes(q) ||
        c.province.toLowerCase().includes(q) ||
        c.employment_sector.toLowerCase().includes(q);
      const matchFilter =
        filter === 'all' ||
        (filter === 'approved' && c.underwriting_status === 'AUTO-APPROVED') ||
        (filter === 'review'   && c.underwriting_status === 'CREDIT UNDERWRITER REVIEW') ||
        (filter === 'declined' && c.underwriting_status === 'SYSTEM HARD DECLINED');
      return matchSearch && matchFilter;
    })
    .sort((a, b) => {
      const av = (a as any)[sortKey] ?? '';
      const bv = (b as any)[sortKey] ?? '';
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const Th = ({ k, label, right = false, cls = '' }: { k: SortKey; label: string; right?: boolean; cls?: string }) => (
    <th className={`px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider ${right ? 'text-right' : 'text-left'} ${cls}`}>
      <button
        className="flex items-center gap-1 hover:text-slate-600 transition-colors"
        style={{ marginLeft: right ? 'auto' : undefined }}
        onClick={() => toggleSort(k)}
      >
        {label}
        <ChevronsUpDown
          size={11}
          className={sortKey === k ? 'text-[#1a3a5c]' : 'text-slate-300'}
        />
      </button>
    </th>
  );

  return (
    <div className="space-y-4">

      {/* Toolbar */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-0">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search name, ID, province, sector…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-field pl-9"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center rounded-xl overflow-hidden border border-slate-200 flex-shrink-0">
          {FILTER_TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className="px-4 py-2 text-sm font-medium transition-all duration-150 border-r border-slate-200 last:border-r-0"
              style={{
                backgroundColor: filter === value ? '#1a3a5c' : undefined,
                color: filter === value ? 'white' : undefined,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="px-6 py-3.5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-700">
            {loading
              ? 'Loading…'
              : `${filtered.length} of ${customers.length} applicant${customers.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <Th k="full_name"           label="Applicant" />
                <Th k="created_at"          label="Province / Sector"     cls="hidden md:table-cell" />
                <Th k="amount_usd"          label="Amount"    right />
                <Th k="default_probability" label="POD"       right  cls="hidden lg:table-cell" />
                <th className="px-5 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-left">
                  Status
                </th>
                <th className="w-10" />
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i}>
                      {[70, 90, 50, 40, 60].map((w, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-3.5 bg-slate-100 rounded-full animate-pulse" style={{ width: `${w}%` }} />
                        </td>
                      ))}
                    </tr>
                  ))
                : filtered.length === 0
                ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-16 text-center text-slate-400 text-sm">
                      No customers match your search or filter.
                    </td>
                  </tr>
                )
                : filtered.map(c => (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                      onClick={() => { onSelectCustomer(c.id); onNavigate('underwriting'); }}
                    >
                      {/* Applicant */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                            style={{ backgroundColor: 'rgba(13,33,55,0.07)', color: '#1a3a5c' }}
                          >
                            {c.full_name.split(' ').map((n: string) => n[0]).slice(0, 2).join('')}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-slate-800 truncate">{c.full_name}</p>
                            <p className="text-[11px] font-mono text-slate-400">{c.application_id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Province / Sector */}
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        <p className="text-slate-700">{c.province}</p>
                        <p className="text-xs text-slate-400">{c.employment_sector}</p>
                      </td>

                      {/* Amount */}
                      <td className="px-5 py-3.5 text-right font-semibold text-slate-800">
                        ${Number(c.amount_usd).toLocaleString()}
                      </td>

                      {/* POD */}
                      <td className="px-5 py-3.5 text-right hidden lg:table-cell">
                        <span className={`font-semibold tabular-nums ${
                          c.default_probability === null ? 'text-slate-400'
                            : c.default_probability < 0.35 ? 'text-emerald-600'
                            : c.default_probability < 0.60 ? 'text-amber-600'
                            : 'text-red-600'
                        }`}>
                          {c.default_probability !== null
                            ? `${(c.default_probability * 100).toFixed(1)}%`
                            : '—'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-3.5">
                        <RiskBadge status={c.underwriting_status} size="sm" />
                      </td>

                      {/* Arrow */}
                      <td className="px-3 py-3.5 w-10">
                        <ArrowUpRight
                          size={14}
                          className="text-slate-300 group-hover:text-[#1a3a5c] transition-colors"
                        />
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
