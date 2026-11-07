import {createContext, useContext, useEffect, useMemo, useState, type ReactNode} from 'react';
import {
  getAuthErrorMessage,
  observeAuthState,
  registerWithEmail,
  signInWithEmail,
  signOut,
  type User,
} from '../services/auth';

type AuthContextValue = {
  user: User | null;
  isReady: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  logOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({children}: {children: ReactNode}) {
  const [user, setUser] = useState<User | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const unsubscribe = observeAuthState((nextUser) => {
      setUser(nextUser);
      setIsReady(true);
    });

    return unsubscribe;
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    isReady,
    signIn: async (email: string, password: string) => {
      try {
        await signInWithEmail(email.trim(), password);
      } catch (error) {
        throw new Error(getAuthErrorMessage(error));
      }
    },
    signUp: async (email: string, password: string) => {
      try {
        await registerWithEmail(email.trim(), password);
      } catch (error) {
        throw new Error(getAuthErrorMessage(error));
      }
    },
    logOut: async () => {
      try {
        await signOut();
      } catch (error) {
        throw new Error(getAuthErrorMessage(error));
      }
    },
  }), [user, isReady]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
