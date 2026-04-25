import React, { createContext, useContext, useEffect, useState } from 'react';
import { getProfile } from '../lib/api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (user: any) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      try {
        const data = await getProfile();
        setUser({ uid: data.id, ...data });
        setProfile(data as UserProfile);
      } catch (err) {
        setUser(null);
        setProfile(null);
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_slug');
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const signIn = async (userData: any) => {
    setUser(userData);
    setLoading(true);
    try {
      const data = await getProfile();
      setProfile(data as UserProfile);
    } catch (err) {
      console.error("Fetch profile failed after sign in:", err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_slug');
    setUser(null);
    setProfile(null);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
