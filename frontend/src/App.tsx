import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Customers from './pages/Customers';
import NewApplication from './pages/NewApplication';
import Underwriting from './pages/Underwriting';

type Page = 'dashboard' | 'customers' | 'new-application' | 'underwriting';

export default function App() {
  const [session, setSession]               = useState<any>(null);
  const [authLoading, setAuthLoading]       = useState(true);
  const [page, setPage]                     = useState<Page>('dashboard');
  const [selectedCustomerId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setPage('dashboard');
    });
    return () => subscription.unsubscribe();
  }, []);

  function selectAndNavigate(id: string, dest: Page = 'underwriting') {
    setSelectedId(id);
    setPage(dest);
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0d2137' }}>
        <div className="flex flex-col items-center gap-5">
          <div className="w-12 h-12 rounded-2xl bg-amber-400 flex items-center justify-center shadow-lg">
            <Shield size={22} style={{ color: '#0d2137' }} />
          </div>
          <div
            className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'rgba(245,158,11,0.3)', borderTopColor: '#f59e0b' }}
          />
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <Login
        onLogin={() =>
          supabase.auth.getSession().then(({ data }) => setSession(data.session))
        }
      />
    );
  }

  return (
    <Layout
      currentPage={page}
      onNavigate={setPage}
      userEmail={session.user?.email ?? ''}
      onLogout={() => setSession(null)}
    >
      {page === 'dashboard' && (
        <Dashboard
          onNavigate={setPage}
          onSelectCustomer={id => selectAndNavigate(id)}
        />
      )}
      {page === 'customers' && (
        <Customers
          onNavigate={setPage}
          onSelectCustomer={id => selectAndNavigate(id)}
        />
      )}
      {page === 'new-application' && (
        <NewApplication
          onNavigate={setPage}
          onSelectCustomer={id => selectAndNavigate(id)}
        />
      )}
      {page === 'underwriting' && (
        <Underwriting
          customerId={selectedCustomerId}
          onNavigate={setPage}
        />
      )}
    </Layout>
  );
}
