import { clearAccountStorage } from "@/lib/storage";
import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  error: string | null;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    let authEventReceived = false;
    let previousOwner: string | null = null;

    const fail = () => {
      if (!active || authEventReceived) return;
      window.clearTimeout(timeout);
      setError('Не вдалося перевірити вхід. Перевірте інтернет і спробуйте ще раз.');
      setLoading(false);
    };

    // Відновлення сесії може чекати на мережу або блокування іншої вкладки.
    const timeout = window.setTimeout(fail, 12_000);

    const applySession = (nextSession: Session | null) => {
      if (!active) return;
      window.clearTimeout(timeout);
      if (previousOwner && previousOwner !== nextSession?.user.id) clearAccountStorage(previousOwner);
      previousOwner = nextSession?.user.id ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setError(null);
      setLoading(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      authEventReceived = true;
      applySession(nextSession);
    });

    void supabase.auth.getSession().then(({ data, error: sessionError }) => {
      if (!active || authEventReceived) return;
      if (sessionError) {
        fail();
      } else {
        applySession(data.session);
      }
    }).catch(fail);

    return () => {
      active = false;
      window.clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) throw error;
    if (user) clearAccountStorage(user.id);
  };

  const value = {
    user,
    session,
    loading,
    error,
    signUp,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
