import { createContext, useEffect, useState } from 'react';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { useNavigate } from 'react-router';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { db } from '@/lib/dexie';
import { useUserStore } from '@/context/UserStore';
import { useColorStore } from '@/context/ColorStore';

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
  const clearUser = useUserStore((state) => state.clearUser);
  const clearColor = useColorStore((state) => state.clearColor);

  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    session: null,
    isLoading: true,
    error: null
  });

  async function signOut() {
    toast.warning('Logged out of Vibes', {
      duration: 5000
    });

    await db.users.clear();
    await db.likes.clear();
    await db.bookmarks.clear();
    clearUser();
    clearColor();

    try {
      await supabase.auth.signOut();

      setAuthState({
        user: null,
        session: null,
        isLoading: false,
        error: null
      });

      localStorage.removeItem('vibes_auth_session');

      navigate('/auth/sign-in', { replace: true });
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
          try {
            const {
              data: { user },
              error
            } = await supabase.auth.getUser();

            if (error || !user) {
              if (!navigator.onLine) {
                setAuthState({
                  session,
                  user: session.user,
                  isLoading: false,
                  error: null
                });
              } else {
                await signOut();
              }
            } else {
              setAuthState({
                session,
                user,
                isLoading: false,
                error: null
              });
              localStorage.setItem(
                'vibes_auth_session',
                JSON.stringify({ session, user })
              );
            }
          } catch (error) {
            if (!navigator.onLine) {
              setAuthState({
                session,
                user: session.user,
                isLoading: false,
                error: null
              });
            } else {
              await signOut();
            }
          }
        } else {
          if (!navigator.onLine) {
            const storedAuth = localStorage.getItem('vibes_auth_session');
            if (storedAuth) {
              try {
                const { session, user } = JSON.parse(storedAuth);
                setAuthState({
                  session,
                  user,
                  isLoading: false,
                  error: null
                });
                return;
              } catch (e) {}
            }
          }

          setAuthState({
            user: null,
            session: null,
            isLoading: false,
            error: null
          });
        }
      } catch (error) {
        if (!navigator.onLine) {
          const storedAuth = localStorage.getItem('vibes_auth_session');
          if (storedAuth) {
            try {
              const { session, user } = JSON.parse(storedAuth);
              setAuthState({
                session,
                user,
                isLoading: false,
                error: null
              });
              return;
            } catch (e) {}
          }
        }

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
      if (session) {
        setAuthState((prev) => ({
          ...prev,
          session,
          user: session?.user ?? null,
          isLoading: false
        }));

        localStorage.setItem(
          'vibes_auth_session',
          JSON.stringify({
            session,
            user: session?.user
          })
        );
      } else {
        setAuthState((prev) => ({
          ...prev,
          session: null,
          user: null,
          isLoading: false
        }));
      }
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
