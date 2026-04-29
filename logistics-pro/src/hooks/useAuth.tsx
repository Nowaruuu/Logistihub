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
        const token = localStorage.getItem('auth_token');
        const slug = localStorage.getItem('auth_slug');
        if (!token || !slug) {
          setLoading(false);
          return;
        }
        const data = await getProfile();
        const mappedUser = { uid: data.uid || data.user_id || data.id, ...data };
        setUser(mappedUser);
        setProfile({
          uid: mappedUser.uid,
          fullName: data.fullName || '',
          email: data.email || '',
          phone: data.phone || '',
          role: data.role || 'user',
          tier: data.tier || 'Bronze',
          createdAt: data.createdAt || new Date().toISOString(),
        } as UserProfile);
      } catch (err) {
        console.warn('Auth init failed:', err);
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
      const mappedUser = { uid: data.uid || data.user_id || data.id, ...data };
      setUser(mappedUser);
      setProfile({
        uid: mappedUser.uid,
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        role: data.role || 'user',
        tier: data.tier || 'Bronze',
        createdAt: data.createdAt || new Date().toISOString(),
      } as UserProfile);
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
