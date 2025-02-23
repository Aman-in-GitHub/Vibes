import { createContext, useEffect, useState } from 'react';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { db } from '@/lib/dexie';

export interface AuthState {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  error: AuthError | null;
}

export interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null
  });

  async function signOut() {
    toast.warning('Signing out of Vibes');

    await db.users.clear();
    await db.likes.clear();
    await db.bookmarks.clear();

    try {
      await supabase.auth.signOut();

      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null
      });

      navigate('/auth/create-account', { replace: true });
    } catch (error) {
      setAuthState((prev) => ({
        ...prev,
        error: error as AuthError
      }));
    }
  }

  useEffect(() => {
    async function getInitialSession() {
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession();

        if (session) {
          const {
            data: { user },
            error
          } = await supabase.auth.getUser();

          if (error || !user) {
            await signOut();
          } else {
            setAuthState({
              session,
              user,
              isLoading: false,
              error: null
            });
          }
        } else {
          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        setAuthState({
          session: null,
          user: null,
          isLoading: false,
          error: error as AuthError
        });
      }
    }

    getInitialSession();

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_, session) => {
      setAuthState((prev) => ({
        ...prev,
        session,
        user: session?.user ?? null,
        isLoading: false
      }));
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = {
    ...authState,
    signOut,
    isAuthenticated: !!authState.user,
    error: authState.error
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;
