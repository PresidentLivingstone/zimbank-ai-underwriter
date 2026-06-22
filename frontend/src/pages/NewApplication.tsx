import { useState } from 'react';
import { CheckCircle, AlertCircle, User, Briefcase, CreditCard, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { scoreCustomer } from '../lib/scoring';

const PROVINCES = [
  'Harare','Bulawayo','Manicaland','Mashonaland Central','Mashonaland East',
  'Mashonaland West','Masvingo','Matabeleland North','Matabeleland South','Midlands',
];
const SECTORS = [
  'Agriculture','Construction','Education','Finance','Government','Healthcare',
  'Hospitality','Manufacturing','Mining','Real Estate','Retail Trade','Technology',
  'Transport','Utilities',
];
const PURPOSES = [
  'Business Expansion','Asset Acquisition','Education','Home Improvement',
  'Medical','Personal Consumption','Debt Consolidation','Agriculture',
];
const PRODUCTS: { code: string; label: string }[] = [
  { code: 'PL01', label: 'PL01 — Personal Loan' },
  { code: 'PL02', label: 'PL02 — Personal Loan (Premium)' },
  { code: 'BL03', label: 'BL03 — Business Loan' },
  { code: 'BL04', label: 'BL04 — Business Loan (Large)' },
  { code: 'ML05', label: 'ML05 — Micro Loan' },
  { code: 'HL06', label: 'HL06 — Home Loan' },
];

interface FormData {
  full_name: string; client_dob: string; province: string; employment_sector: string;
  months_at_employer: string; monthly_income_usd: string; existing_obligations: string;
  num_dependents: string; amount_usd: string; annual_rate_pct: string;
  term_months: string; loan_purpose: string; product_code: string;
}
const INITIAL: FormData = {
  full_name: '', client_dob: '', province: 'Harare', employment_sector: 'Retail Trade',
  months_at_employer: '', monthly_income_usd: '', existing_obligations: '0',
  num_dependents: '0', amount_usd: '', annual_rate_pct: '24.5',
  term_months: '12', loan_purpose: 'Business Expansion', product_code: 'PL01',
};

function FieldLabel({ label }: { label: string }) {
  return (
    <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-2">
      {label}
    </label>
  );
}

export default function NewApplication({
  onNavigate,
  onSelectCustomer,
}: {
  onNavigate: (p: any) => void;
  onSelectCustomer: (id: string) => void;
}) {
  const [form, setForm]           = useState<FormData>(INITIAL);
  const [errors, setErrors]       = useState<Partial<FormData>>({});
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]     = useState(false);
  const [serverError, setServerError] = useState('');

  function set(field: keyof FormData, value: string) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: '' }));
  }

  function validate(): boolean {
    const errs: Partial<FormData> = {};
    if (!form.full_name.trim()) errs.full_name = 'Required';
    if (!form.client_dob) errs.client_dob = 'Required';
    if (form.months_at_employer === '' || Number(form.months_at_employer) < 0) errs.months_at_employer = 'Enter 0 or more';
    if (!form.monthly_income_usd || Number(form.monthly_income_usd) <= 0) errs.monthly_income_usd = 'Must be > 0';
    if (!form.amount_usd || Number(form.amount_usd) <= 0) errs.amount_usd = 'Must be > 0';
    if (!form.annual_rate_pct || Number(form.annual_rate_pct) <= 0) errs.annual_rate_pct = 'Must be > 0';
    if (!form.term_months || Number(form.term_months) <= 0) errs.term_months = 'Must be > 0';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setSubmitting(true);
    setServerError('');
    try {
      const scoring = scoreCustomer({
        amount_usd: Number(form.amount_usd),
        term_months: Number(form.term_months),
        monthly_income_usd: Number(form.monthly_income_usd),
        months_at_employer: Number(form.months_at_employer),
        existing_obligations: Number(form.existing_obligations),
        num_dependents: Number(form.num_dependents),
        client_dob: form.client_dob,
      });
      const appId = `APP${Date.now().toString().slice(-7)}`;
      const { data, error: dbErr } = await supabase.from('customers').insert({
        application_id: appId,
        full_name: form.full_name.trim(),
        client_dob: form.client_dob,
        province: form.province,
        employment_sector: form.employment_sector,
        months_at_employer: Number(form.months_at_employer),
        monthly_income_usd: Number(form.monthly_income_usd),
        existing_obligations: Number(form.existing_obligations),
        num_dependents: Number(form.num_dependents),
        amount_usd: Number(form.amount_usd),
        annual_rate_pct: Number(form.annual_rate_pct),
        term_months: Number(form.term_months),
        loan_purpose: form.loan_purpose,
        product_code: form.product_code,
        dti_ratio:                    scoring.dti_ratio,
        monthly_installment:          scoring.monthly_installment,
        total_to_income:              scoring.total_to_income,
        work_stability:               scoring.work_stability,
        default_probability:          scoring.default_probability,
        risk_tier:                    scoring.risk_tier,
        underwriting_status:          scoring.underwriting_status,
        dti_burden_score:             scoring.dti_burden_score,
        employment_stability_score:   scoring.employment_stability_score,
        existing_leverage_score:      scoring.existing_leverage_score,
        life_stage_score:             scoring.life_stage_score,
        loan_to_income_score:         scoring.loan_to_income_score,
        flag_high_dti:                scoring.flag_high_dti,
        flag_tenure_instability:      scoring.flag_tenure_instability,
        flag_credit_leverage:         scoring.flag_credit_leverage,
        flag_demographic_burden:      scoring.flag_demographic_burden,
      }).select().single();
      if (dbErr) throw dbErr;
      setSuccess(true);
      if (data) {
        setTimeout(() => {
          onSelectCustomer(data.id);
          onNavigate('underwriting');
        }, 1500);
      }
    } catch (err: any) {
      setServerError(err.message || 'Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-28 space-y-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
          <CheckCircle size={34} className="text-emerald-500" />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Application Submitted</h2>
        <p className="text-slate-500 text-sm">Credit scoring complete. Redirecting to risk report…</p>
        <div className="w-4 h-4 border-2 border-slate-300 border-t-[#1a3a5c] rounded-full animate-spin mt-2" />
      </div>
    );
  }

  /* ── Shared field components ── */
  const TextInput = ({
    name, type = 'text', placeholder = '', min, step,
  }: {
    name: keyof FormData; type?: string; placeholder?: string; min?: string; step?: string;
  }) => (
    <>
      <input
        type={type}
        value={form[name]}
        onChange={e => set(name, e.target.value)}
        placeholder={placeholder}
        min={min}
        step={step}
        className={`input-field ${errors[name] ? 'input-field-error' : ''}`}
      />
      {errors[name] && (
        <p className="text-[11px] text-red-500 mt-1.5 flex items-center gap-1">
          <AlertCircle size={11} /> {errors[name]}
        </p>
      )}
    </>
  );

  const SelectInput = ({
    name, options,
  }: {
    name: keyof FormData; options: string[];
  }) => (
    <select
      value={form[name]}
      onChange={e => set(name, e.target.value)}
      className="input-field"
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );

  const SectionHeader = ({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) => (
    <div
      className="flex items-center gap-3 px-6 py-4"
      style={{ backgroundColor: '#0d2137' }}
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
        <Icon size={16} className="text-amber-400" />
      </div>
      <div>
        <p className="text-white font-semibold text-sm leading-none">{title}</p>
        <p className="text-slate-400 text-xs mt-1">{desc}</p>
      </div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">

        {/* ── Section 1: Personal ── */}
        <div className="card overflow-hidden">
          <SectionHeader icon={User} title="Personal Information" desc="Applicant identity and demographic profile" />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <FieldLabel label="Full Name" />
              <TextInput name="full_name" placeholder="e.g. Tendai Moyo" />
            </div>
            <div>
              <FieldLabel label="Date of Birth" />
              <TextInput name="client_dob" type="date" />
            </div>
            <div>
              <FieldLabel label="Number of Dependents" />
              <TextInput name="num_dependents" type="number" min="0" placeholder="0" />
            </div>
            <div>
              <FieldLabel label="Province" />
              <SelectInput name="province" options={PROVINCES} />
            </div>
          </div>
        </div>

        {/* ── Section 2: Employment ── */}
        <div className="card overflow-hidden">
          <SectionHeader icon={Briefcase} title="Employment Details" desc="Current employer and income information" />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel label="Employment Sector" />
              <SelectInput name="employment_sector" options={SECTORS} />
            </div>
            <div>
              <FieldLabel label="Months at Current Employer" />
              <TextInput name="months_at_employer" type="number" min="0" placeholder="e.g. 24" />
            </div>
            <div>
              <FieldLabel label="Monthly Net Income (USD)" />
              <TextInput name="monthly_income_usd" type="number" min="1" step="0.01" placeholder="e.g. 1 200" />
            </div>
            <div>
              <FieldLabel label="Existing Credit Obligations" />
              <TextInput name="existing_obligations" type="number" min="0" placeholder="e.g. 1" />
            </div>
          </div>
        </div>

        {/* ── Section 3: Loan ── */}
        <div className="card overflow-hidden">
          <SectionHeader icon={CreditCard} title="Loan Facility Details" desc="Requested credit parameters for scoring" />
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <FieldLabel label="Principal Amount (USD)" />
              <TextInput name="amount_usd" type="number" min="1" step="0.01" placeholder="e.g. 5 000" />
            </div>
            <div>
              <FieldLabel label="Annual Interest Rate (%)" />
              <TextInput name="annual_rate_pct" type="number" min="0.1" step="0.1" placeholder="e.g. 24.5" />
            </div>
            <div>
              <FieldLabel label="Loan Term (Months)" />
              <TextInput name="term_months" type="number" min="1" placeholder="e.g. 12" />
            </div>
            <div>
              <FieldLabel label="Loan Purpose" />
              <SelectInput name="loan_purpose" options={PURPOSES} />
            </div>
            <div className="sm:col-span-2">
              <FieldLabel label="Product Code" />
              <select
                value={form.product_code}
                onChange={e => set('product_code', e.target.value)}
                className="input-field"
              >
                {PRODUCTS.map(p => (
                  <option key={p.code} value={p.code}>{p.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Error */}
        {serverError && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5 text-red-700 text-sm">
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            {serverError}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between gap-4 pt-2">
          <button
            type="button"
            onClick={() => { setForm(INITIAL); setErrors({}); setServerError(''); }}
            className="btn-ghost"
          >
            Reset Form
          </button>
          <button type="submit" disabled={submitting} className="btn-primary px-7 py-3 text-[15px]">
            {submitting
              ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing Score…</>
              : <>Submit Application <ChevronRight size={16} /></>
            }
          </button>
        </div>
      </form>
    </div>
  );
}
