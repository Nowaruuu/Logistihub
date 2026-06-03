import React, { createContext, useContext, useEffect, useState } from 'react';
import { getProfile, uploadProfilePicture as apiUploadProfilePicture } from '../lib/api';
import { UserProfile } from '../types';

interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signIn: (userData: any, loginResponse?: any) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  uploadProfilePicture: (base64Image: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function buildProfile(data: any): UserProfile {
  // Always normalize role to lowercase so 'Driver' from DB === 'driver' in all app checks
  const rawRole = (data.role || data.user_type || 'user') as string;
  const normalizedRole = rawRole.toLowerCase();

  return {
    uid: data.uid || data.user_id || data.staff_id || data.id || '',
    fullName: data.fullName || data.name || `${data.first_name || ''} ${data.last_name || ''}`.trim() || 'User',
    email: data.email || data.username || '',
    phone: data.phone || '',
    role: normalizedRole as any,
    tier: data.tier || 'Bronze',
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
    profile_picture: data.profile_picture || undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('auth_token');
      const slug = localStorage.getItem('auth_slug');
      if (!token || !slug) {
        setLoading(false);
        return;
      }

      // Try to restore profile from localStorage cache first
      const cachedProfile = localStorage.getItem('auth_profile');
      if (cachedProfile) {
        try {
          const parsed = JSON.parse(cachedProfile);
          const p = buildProfile(parsed);
          setUser({ uid: p.uid, ...p });
          setProfile(p);
        } catch { /* ignore parse errors */ }
      }

      // Then try to refresh from API
      try {
        const data = await getProfile();
        const p = buildProfile(data);
        setUser({ uid: p.uid, ...p });
        setProfile(p);
        localStorage.setItem('auth_profile', JSON.stringify(data));
      } catch (err) {
        console.warn('getProfile failed:', err);
        // If no cached profile either, clear auth
        if (!cachedProfile) {
          setUser(null);
          setProfile(null);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_slug');
          localStorage.removeItem('auth_profile');
        }
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  const signIn = async (_userData: any, loginResponse?: any) => {
    // Clear any stale cached profile so old 'user' role never bleeds into a new driver session
    localStorage.removeItem('auth_profile');

    // Build profile immediately from login response data
    if (loginResponse?.user) {
      const p = buildProfile(loginResponse.user);
      setUser({ uid: p.uid, ...p });
      setProfile(p);
      localStorage.setItem('auth_profile', JSON.stringify(loginResponse.user));
    } else if (loginResponse) {
      const p = buildProfile(loginResponse);
      setUser({ uid: p.uid, ...p });
      setProfile(p);
      localStorage.setItem('auth_profile', JSON.stringify(loginResponse));
    }

    // Also try to get full profile from /me in the background
    try {
      const data = await getProfile();
      const p = buildProfile(data);
      setUser({ uid: p.uid, ...p });
      setProfile(p);
      localStorage.setItem('auth_profile', JSON.stringify(data));
    } catch (err) {
      console.warn('getProfile after signIn failed (using login data):', err);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_slug');
    localStorage.removeItem('auth_profile');
    setUser(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    try {
      const data = await getProfile();
      const p = buildProfile(data);
      setUser({ uid: p.uid, ...p });
      setProfile(p);
      localStorage.setItem('auth_profile', JSON.stringify(data));
    } catch (err) {
      console.warn('refreshProfile failed:', err);
    }
  };

  const uploadProfilePicture = async (base64Image: string) => {
    const { profile_picture } = await apiUploadProfilePicture(base64Image);
    if (profile) {
      const updated = { ...profile, profile_picture };
      setProfile(updated);
      setUser({ uid: updated.uid, ...updated });
      // Also update the cached raw data
      const cached = localStorage.getItem('auth_profile');
      try {
        const raw = cached ? JSON.parse(cached) : {};
        raw.profile_picture = profile_picture;
        localStorage.setItem('auth_profile', JSON.stringify(raw));
      } catch { /* ignore */ }
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, signIn, signOut, refreshProfile, uploadProfilePicture }}>
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
