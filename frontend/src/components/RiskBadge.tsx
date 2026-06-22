interface RiskBadgeProps {
  status: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export default function RiskBadge({ status, size = 'md' }: RiskBadgeProps) {
  const base = 'inline-flex items-center font-medium rounded-full whitespace-nowrap';
  const sizes = { sm: 'text-[11px] px-2.5 py-0.5', md: 'text-xs px-3 py-1', lg: 'text-sm px-4 py-1.5' };

  if (!status) return (
    <span className={`${base} ${sizes[size]} bg-slate-100 text-slate-500`}>Pending</span>
  );
  if (status === 'AUTO-APPROVED') return (
    <span className={`${base} ${sizes[size]} bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5" />
      Approved
    </span>
  );
  if (status === 'CREDIT UNDERWRITER REVIEW') return (
    <span className={`${base} ${sizes[size]} bg-amber-50 text-amber-700 ring-1 ring-amber-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5" />
      Manual Review
    </span>
  );
  if (status === 'SYSTEM HARD DECLINED') return (
    <span className={`${base} ${sizes[size]} bg-red-50 text-red-700 ring-1 ring-red-200`}>
      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5" />
      Declined
    </span>
  );
  return <span className={`${base} ${sizes[size]} bg-slate-100 text-slate-500`}>{status}</span>;
}
