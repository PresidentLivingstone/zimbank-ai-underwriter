import { useState } from 'react';
import { Shield, Eye, EyeOff, AlertCircle, Lock, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ProgressMetricCard from '../components/ui/progress-metric-card';

const underwritingActivityData = [
  { value: 120, date: '15 Jun' },
  { value: 145, date: '16 Jun' },
  { value: 135, date: '17 Jun' },
  { value: 168, date: '18 Jun' },
  { value: 185, date: '19 Jun' },
  { value: 210, date: '20 Jun' },
  { value: 245, date: '21 Jun' },
  { value: 298, date: '22 Jun' },
];


export default function Login({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [mode, setMode]         = useState<'login' | 'signup'>('login');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError('');
    try {
      const { error: err } = mode === 'login'
        ? await supabase.auth.signInWithPassword({ email, password })
        : await supabase.auth.signUp({ email, password });
      if (err) throw err;
      onLogin();
    } catch (err: any) {
      setError(err.message || 'Authentication failed.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#f0f2f5' }}>

      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex lg:w-[55%] flex-col relative overflow-hidden border-r border-slate-200"
        style={{
          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 50%, #f1f5f9 100%)',
        }}
      >
        {/* Subtle grid texture */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.02) 1px,transparent 1px),' +
              'linear-gradient(90deg,rgba(15,23,42,0.02) 1px,transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow orbs */}
        <div
          className="absolute rounded-full"
          style={{
            width: 420, height: 420,
            top: '-120px', right: '-100px',
            background: 'radial-gradient(circle, rgba(245,158,11,0.06) 0%, transparent 70%)',
          }}
        />
        <div
          className="absolute rounded-full"
          style={{
            width: 340, height: 340,
            bottom: '10%', left: '-80px',
            background: 'radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)',
          }}
        />

        {/* Bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0"
          style={{ height: '40%', background: 'linear-gradient(to top, #f1f5f9, transparent)' }}
        />

        {/* Logo top */}
        <div className="relative z-10 px-14 pt-12">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center shadow-md">
              <Shield size={20} className="text-amber-400" />
            </div>
            <span className="text-slate-900 font-bold text-[22px] tracking-tight">
              ZimBank<span className="text-amber-500"> AI</span>
            </span>
          </div>
        </div>

        {/* Main copy — bottom */}
        <div className="relative z-10 mt-auto px-14 pb-16">
          <span
            className="inline-block text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-6"
            style={{
              backgroundColor: 'rgba(217,119,6,0.08)',
              color: '#d97706',
              border: '1px solid rgba(217,119,6,0.15)',
            }}
          >
            Credit Underwriting Platform
          </span>

          <h1 className="text-slate-950 text-[2.6rem] font-bold leading-[1.15] mb-5 tracking-tight">
            Intelligent lending<br />decisions for<br />modern banking.
          </h1>

          <p className="text-slate-500" style={{ fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 360 }}>
            Basel IV compliant AI credit scoring with deterministic
            risk traceability across the SADC financial ecosystem.
          </p>

          {/* Interactive Progress Metric Card */}
          <div className="mt-8 w-full max-w-[460px]">
            <ProgressMetricCard
              title="Active Evaluations"
              unit="cases"
              data={underwritingActivityData}
              size="sm"
              accent="amber"
              showStats={true}
              period="Past 7 days"
              periodOptions={[
                { label: 'Past 3 days', points: 3 },
                { label: 'Past 7 days', points: 7 },
              ]}
            />
          </div>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-xl bg-amber-400 flex items-center justify-center">
              <Shield size={18} style={{ color: '#0a1d2e' }} />
            </div>
            <span className="font-bold text-xl" style={{ color: '#1a3a5c' }}>ZimBank AI</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900">
              {mode === 'login' ? 'Welcome back' : 'Create account'}
            </h2>
            <p className="text-slate-500 text-sm mt-2 leading-relaxed">
              {mode === 'login'
                ? 'Sign in to your underwriter workspace to continue.'
                : 'Register to access the ZimBank credit underwriting platform.'}
            </p>
          </div>

          <form
            onSubmit={handleSubmit}
            className="card p-8 space-y-5"
          >
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="officer@zimbank.co.zw"
                  required
                  className="input-field pl-9"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  minLength={6}
                  className="input-field pl-9 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-xl p-3.5 text-red-700 text-sm">
                <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-[15px] mt-1"
            >
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />{mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
                : <>{mode === 'login' ? 'Sign In' : 'Create Account'}<ArrowRight size={15} /></>
              }
            </button>

            {/* Toggle */}
            <div className="pt-1 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
                <button
                  type="button"
                  onClick={() => { setMode(m => m === 'login' ? 'signup' : 'login'); setError(''); }}
                  className="font-semibold hover:underline"
                  style={{ color: '#1a3a5c' }}
                >
                  {mode === 'login' ? 'Register here' : 'Sign in'}
                </button>
              </p>
            </div>
          </form>

          <p className="text-center text-[11px] text-slate-400 mt-6">
            ZimBank AI Underwriter v2.1 &mdash; SADC Financial Ecosystem
          </p>
        </div>
      </div>
    </div>
  );
}
