import { ReactNode, useState, useRef, useEffect } from 'react';
import {
  LayoutDashboard, Users, FilePlus, FileSearch,
  Shield, LogOut, ChevronDown, Menu, X, Bell,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

type Page = 'dashboard' | 'customers' | 'new-application' | 'underwriting';

interface LayoutProps {
  children: ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  userEmail: string;
  onLogout: () => void;
}

const NAV = [
  { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'customers' as Page, label: 'Customers', icon: Users },
  { id: 'new-application' as Page, label: 'New Application', icon: FilePlus },
  { id: 'underwriting' as Page, label: 'Underwriting', icon: FileSearch },
];

const PAGE_SUBTITLES: Record<Page, string> = {
  dashboard: 'Portfolio overview and key performance metrics',
  customers: 'All applicants and their credit profiles',
  'new-application': 'Submit a new credit application for scoring',
  underwriting: 'AI-generated risk reports per applicant',
};

export default function Layout({ children, currentPage, onNavigate, userEmail, onLogout }: LayoutProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = userEmail.slice(0, 2).toUpperCase();
  const username  = userEmail.split('@')[0];

  async function signOut() {
    await supabase.auth.signOut();
    onLogout();
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">

      {/* ── Primary nav bar ── */}
      <header style={{ backgroundColor: '#0d2137' }} className="sticky top-0 z-40 shadow-xl">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex items-center h-[60px] gap-4">

            {/* Logo */}
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 flex-shrink-0 mr-4"
            >
              <div className="w-8 h-8 rounded-lg bg-amber-400 flex items-center justify-center">
                <Shield size={16} style={{ color: '#0d2137' }} />
              </div>
              <span className="text-white font-bold text-[15px] tracking-tight leading-none">
                ZimBank<span className="text-amber-400"> AI</span>
              </span>
              <span
                className="hidden xl:block text-[11px] font-medium px-2 py-0.5 rounded-md ml-1"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
              >
                Underwriting
              </span>
            </button>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-0.5 flex-1">
              {NAV.map(({ id, label, icon: Icon }) => {
                const active = currentPage === id;
                return (
                  <button
                    key={id}
                    onClick={() => onNavigate(id)}
                    className={`nav-btn ${active ? 'active' : ''}`}
                  >
                    <Icon size={15} />
                    <span>{label}</span>
                    {active && (
                      <span
                        className="absolute bottom-0 left-3 right-3 h-0.5 rounded-full"
                        style={{ backgroundColor: '#f59e0b' }}
                      />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="ml-auto flex items-center gap-1">
              {/* Bell */}
              <button
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: 'rgba(255,255,255,0.45)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'rgba(255,255,255,0.45)';
                  e.currentTarget.style.backgroundColor = '';
                }}
              >
                <Bell size={16} />
              </button>

              {/* Divider */}
              <div className="w-px h-5 mx-1" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }} />

              {/* User menu */}
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setUserMenuOpen(o => !o)}
                  className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-lg transition-colors"
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{ backgroundColor: 'rgba(245,158,11,0.18)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}
                  >
                    {initials}
                  </div>
                  <span className="hidden sm:block text-sm font-medium" style={{ color: 'rgba(255,255,255,0.75)' }}>
                    {username}
                  </span>
                  <ChevronDown
                    size={13}
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                    className={`transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    <div className="px-4 py-3.5" style={{ backgroundColor: '#f8fafc' }}>
                      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-0.5">Signed in as</p>
                      <p className="text-sm font-semibold text-slate-800 truncate">{userEmail}</p>
                    </div>
                    <div className="p-1.5">
                      <button
                        onClick={signOut}
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={14} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Mobile toggle */}
              <button
                className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center ml-1 transition-colors"
                style={{ color: 'rgba(255,255,255,0.6)' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = '')}
                onClick={() => setMobileOpen(o => !o)}
              >
                {mobileOpen ? <X size={18} /> : <Menu size={18} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden border-t px-4 py-3 space-y-1" style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: '#0a1b2d' }}>
            {NAV.map(({ id, label, icon: Icon }) => {
              const active = currentPage === id;
              return (
                <button
                  key={id}
                  onClick={() => { onNavigate(id); setMobileOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
                  style={{
                    color: active ? 'white' : 'rgba(255,255,255,0.55)',
                    backgroundColor: active ? 'rgba(255,255,255,0.1)' : undefined,
                  }}
                >
                  <Icon size={16} />
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* ── Page header strip ── */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-10 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-slate-900 font-bold text-xl leading-none">
              {NAV.find(n => n.id === currentPage)?.label}
            </h1>
            <p className="text-slate-400 text-xs mt-1.5 leading-none">
              {PAGE_SUBTITLES[currentPage]}
            </p>
          </div>
          {currentPage !== 'new-application' && (
            <button onClick={() => onNavigate('new-application')} className="btn-primary flex-shrink-0">
              <FilePlus size={14} />
              <span className="hidden sm:inline">New Application</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Content ── */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 sm:px-6 lg:px-10 py-7">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-3">
        <p className="text-center text-[11px] text-slate-400">
          ZimBank AI Underwriter v2.1 &mdash; Basel IV Compliant &mdash; SADC Financial Ecosystem
        </p>
      </footer>
    </div>
  );
}
