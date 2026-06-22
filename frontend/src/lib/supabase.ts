// Mock Supabase client mapping database and authentication operations
// directly to our local SQLite-backed FastAPI server using real Promises.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class MockSupabaseClient {
  auth = {
    async getSession() {
      const email = localStorage.getItem('zimbank_email');
      if (email) {
        return {
          data: {
            session: {
              user: { email },
            },
          },
          error: null,
        };
      }
      return { data: { session: null }, error: null };
    },

    async signInWithPassword({ email, password }: any) {
      localStorage.setItem('zimbank_email', email);
      this._triggerAuthChange(email);
      return {
        data: {
          session: {
            user: { email },
          },
        },
        error: null,
      };
    },

    async signUp({ email, password }: any) {
      localStorage.setItem('zimbank_email', email);
      this._triggerAuthChange(email);
      return {
        data: {
          session: {
            user: { email },
          },
        },
        error: null,
      };
    },

    async signOut() {
      localStorage.removeItem('zimbank_email');
      this._triggerAuthChange(null);
      return { error: null };
    },

    onAuthStateChange(callback: any) {
      const listener = (event: any, session: any) => {
        callback(event, session);
      };
      this._listeners.push(listener);
      
      // Trigger initial auth check
      const email = localStorage.getItem('zimbank_email');
      const session = email ? { user: { email } } : null;
      setTimeout(() => callback('SIGNED_IN', session), 0);

      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this._listeners = this._listeners.filter(l => l !== listener);
            },
          },
        },
      };
    },

    _listeners: [] as any[],
    _triggerAuthChange(email: string | null) {
      const session = email ? { user: { email } } : null;
      this._listeners.forEach(l => l('SIGNED_IN', session));
    }
  };

  from(table: string) {
    if (table === 'customers') {
      return {
        select: (cols?: string) => {
          const promise = (async () => {
            try {
              const res = await fetch(`${API_URL}/api/customers`);
              const data = await res.json();
              return { data, error: null };
            } catch (err: any) {
              console.error('Error fetching customers from FastAPI:', err);
              return { data: [], error: err };
            }
          })();

          const order = (col: string, opts?: { ascending?: boolean }) => {
            return promise;
          };

          return {
            order,
            then: (onfulfilled?: any, onrejected?: any) => promise.then(onfulfilled, onrejected)
          };
        },

        insert: (record: any) => {
          const promise = (async () => {
            try {
              const res = await fetch(`${API_URL}/api/customers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record),
              });
              const data = await res.json();
              if (!res.ok) {
                throw new Error(data.detail || 'Failed to submit application');
              }
              return { data, error: null };
            } catch (err: any) {
              console.error('Error posting new customer to FastAPI:', err);
              return { data: null, error: err };
            }
          })();

          const select = () => {
            const single = () => promise;
            return {
              single,
              then: (onfulfilled?: any, onrejected?: any) => promise.then(onfulfilled, onrejected)
            };
          };

          return {
            select,
            then: (onfulfilled?: any, onrejected?: any) => promise.then(onfulfilled, onrejected)
          };
        }
      };
    }
    throw new Error(`Table ${table} not supported in mock client`);
  }
}

export const supabase = new MockSupabaseClient() as any;
