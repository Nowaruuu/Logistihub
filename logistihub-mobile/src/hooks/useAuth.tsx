import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { AppUser, Tenant } from '../types';
import * as API from '../lib/api';
import { SuspendedError } from '../lib/api';

interface AuthContextType {
  user: AppUser | null;
  tenant: Tenant | null;
  slug: string | null;
  token: string | null;
  isLoading: boolean;
  isSuspended: boolean;
  suspendedCompany: string;
  login: (slug: string, email: string, password: string) => Promise<void>;
  register: (slug: string, payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  setSlug: (slug: string) => void;
  updateProfile: (payload: { first_name?: string; last_name?: string; phone?: string }) => Promise<void>;
  uploadProfilePicture: (base64Image: string) => Promise<void>;
}

interface RegisterPayload {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  password: string;
  address?: string;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [slug, setSlugState] = useState<string | null>(() => localStorage.getItem('lh_slug'));
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('lh_token'));
  const [isLoading, setIsLoading] = useState(true);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedCompany, setSuspendedCompany] = useState('');

  // Restore session on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('lh_token');
    const savedSlug = localStorage.getItem('lh_slug');
    const savedUser = localStorage.getItem('lh_user');
    const savedTenant = localStorage.getItem('lh_tenant');

    if (savedToken && savedSlug && savedUser) {
      setToken(savedToken);
      setSlugState(savedSlug);
      try {
        setUser(JSON.parse(savedUser));
        if (savedTenant) setTenant(JSON.parse(savedTenant));
      } catch (_) {}

      // Re-validate tenant status on app open
      API.getTenantInfo(savedSlug)
        .then(({ tenant: t }) => {
          setTenant(t);
          localStorage.setItem('lh_tenant', JSON.stringify(t));
          setIsSuspended(false);
        })
        .catch((err) => {
          if (err instanceof SuspendedError) {
            setIsSuspended(true);
            setSuspendedCompany(err.companyName);
          }
        });
    }
    setIsLoading(false);
  }, []);

  const setSlug = (s: string) => {
    setSlugState(s);
    localStorage.setItem('lh_slug', s);
    setIsSuspended(false);
    API.getTenantInfo(s)
      .then(({ tenant: t }) => {
        setTenant(t);
        localStorage.setItem('lh_tenant', JSON.stringify(t));
      })
      .catch((err) => {
        if (err instanceof SuspendedError) {
          setIsSuspended(true);
          setSuspendedCompany(err.companyName);
        }
      });
  };

  const login = async (s: string, email: string, password: string) => {
    const { token: tok, user: u } = await API.login(s, email, password);
    setToken(tok);
    setUser(u);
    setSlugState(s);
    localStorage.setItem('lh_token', tok);
    localStorage.setItem('lh_slug', s);
    localStorage.setItem('lh_user', JSON.stringify(u));

    // Fetch tenant info
    try {
      const { tenant: t } = await API.getTenantInfo(s);
      setTenant(t);
      localStorage.setItem('lh_tenant', JSON.stringify(t));
    } catch (_) {}
  };

  const register = async (s: string, payload: RegisterPayload) => {
    const { token: tok, user: u } = await API.register(s, payload);
    setToken(tok);
    setUser(u);
    setSlugState(s);
    localStorage.setItem('lh_token', tok);
    localStorage.setItem('lh_slug', s);
    localStorage.setItem('lh_user', JSON.stringify(u));

    try {
      const { tenant: t } = await API.getTenantInfo(s);
      setTenant(t);
      localStorage.setItem('lh_tenant', JSON.stringify(t));
    } catch (_) {}
  };

  const logout = async () => {
    if (slug) await API.logout(slug);
    setUser(null);
    setTenant(null);
    setToken(null);
    setSlugState(null);
    localStorage.removeItem('lh_token');
    localStorage.removeItem('lh_slug');
    localStorage.removeItem('lh_user');
    localStorage.removeItem('lh_tenant');
  };

  const updateProfile = async (payload: { first_name?: string; last_name?: string; phone?: string }) => {
    if (!slug) throw new Error('No workspace');
    await API.updateProfile(slug, payload);
    try {
      const { user: fresh } = await API.getProfile(slug);
      setUser(fresh);
      localStorage.setItem('lh_user', JSON.stringify(fresh));
    } catch (_) {
      const merged = { ...user, ...payload };
      setUser(merged as AppUser);
      localStorage.setItem('lh_user', JSON.stringify(merged));
    }
  };

  const uploadProfilePicture = async (base64Image: string) => {
    if (!slug) throw new Error('No workspace');
    const { profile_picture } = await API.uploadProfilePicture(slug, base64Image);
    const updated = { ...user, profile_picture } as AppUser;
    setUser(updated);
    localStorage.setItem('lh_user', JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, tenant, slug, token, isLoading, isSuspended, suspendedCompany, login, register, logout, setSlug, updateProfile, uploadProfilePicture }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
