import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { login } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { LogIn, ArrowRight, Mail, Lock, Eye, EyeOff } from 'lucide-react';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, user, profile } = useAuth();
  const successMsg = (location.state as any)?.message || '';

  React.useEffect(() => {
    if (user && profile) {
      navigate('/dashboard');
    }
  }, [user, profile, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Auto-extract slug from username (e.g. colz@amongiz.com → slug=amongiz)
      const atIndex = username.indexOf('@');
      if (atIndex === -1) throw new Error('Username must be in format: name@workspace.com');
      const emailPart = username.substring(atIndex + 1); // amongiz.com
      const slug = emailPart.split('.')[0]; // amongiz
      if (!slug) throw new Error('Invalid username format. Use: name@workspace.com');

      // Auto-detect: try staff login first, then customer login
      // This means ONE login box works for drivers AND customers
      let authData: any = null;
      let lastError = '';

      try {
        authData = await login(slug, 'driver', username, password);
      } catch (staffErr: any) {
        lastError = staffErr.message;
      }

      if (!authData) {
        try {
          authData = await login(slug, 'user', username, password);
        } catch (userErr: any) {
          throw new Error(lastError || userErr.message || 'Invalid credentials.');
        }
      }

      await signIn({ uid: authData.user?.user_id || authData.staff_id || '123' }, authData);

      // Force password change for staff with temp passwords
      if (authData.must_change_password) {
        navigate('/force-change-password', {
          replace: true,
          state: { slug, username, tempPassword: password }
        });
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Sign in error:', err);
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-slate-50 dark:bg-slate-950">
      <div className="relative flex h-full min-h-screen w-full max-w-[480px] flex-col bg-white dark:bg-slate-900 shadow-2xl overflow-x-hidden">
        <div className="sticky top-0 z-10 flex items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md p-4 pb-2 justify-between">
          <div className="text-orange-600 flex size-10 shrink-0 items-center justify-center bg-orange-600/10 rounded-lg">
            <LogIn className="size-6" />
          </div>
          <h2 className="text-slate-900 dark:text-slate-100 text-base font-bold leading-tight tracking-tight flex-1 text-center pr-10">Sign In</h2>
        </div>

        <div className="relative px-4 mt-2">
          <div className="relative w-full h-[240px] overflow-hidden rounded-2xl shadow-inner bg-slate-100 dark:bg-slate-800">
            <img 
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2070&auto=format&fit=crop" 
              alt="Logistics" 
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white dark:from-slate-900 via-transparent to-transparent"></div>
          </div>
        </div>

        <div className="px-6 pt-6 pb-4">
          <h1 className="text-slate-900 dark:text-slate-100 tracking-tight text-3xl font-extrabold leading-tight text-left">Welcome Back</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 font-medium">Sign in to track your packages and manage your deliveries.</p>
        </div>

        <form onSubmit={handleSignIn} className="flex flex-col gap-4 px-6 py-2">
        {/* Success message (e.g. after password change) */}
          {successMsg && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/30 mb-1">
              <span className="text-green-600 text-sm font-bold">✓ {successMsg}</span>
            </div>
          )}
          {error && <p className="text-red-500 text-xs font-bold px-1">{error}</p>}

          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Username</p>
              <div className="relative flex items-center">
                <Mail className="absolute left-4 text-slate-400 group-focus-within:text-orange-600 transition-colors duration-200 size-5" />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="flex w-full min-w-0 flex-1 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-0 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 h-14 placeholder:text-slate-400 pl-12 pr-4 text-[15px] font-normal" 
                  placeholder="e.g. colz@amongiz.com" 
                  required
                />
              </div>
            </label>
          </div>

          <div className="flex flex-col w-full">
            <label className="group flex flex-col flex-1">
              <p className="text-slate-600 dark:text-slate-400 text-xs font-bold uppercase tracking-wider leading-normal pb-2 px-1">Password</p>
              <div className="flex w-full flex-1 items-stretch rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all duration-200">
                <Lock className="flex items-center ml-4 text-slate-400 group-focus-within:text-orange-600 transition-colors size-5 self-center" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="flex w-full min-w-0 flex-1 bg-transparent border-none focus:ring-0 h-14 placeholder:text-slate-400 pl-3 pr-2 text-[15px] font-normal text-slate-900 dark:text-slate-100" 
                  placeholder="Enter your password" 
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-slate-400 flex items-center justify-center px-4 hover:text-orange-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
                </button>
              </div>
            </label>
          </div>

          <div className="flex justify-end -mt-1">
            <button type="button" className="text-orange-600 text-[13px] font-bold hover:text-orange-600/80 transition-colors">Forgot Password?</button>
          </div>

          <div className="py-4">
            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold py-4 rounded-xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              <span>{loading ? 'Signing In...' : 'Sign In'}</span>
              <ArrowRight className="size-5" />
            </button>
          </div>
        </form>

        <div className="flex flex-col items-center justify-center px-6 pb-12 pt-6">
          <p className="text-slate-500 dark:text-slate-400 text-[14px] font-medium">
            Don't have an account?{' '}
            <Link to="/signup" className="text-orange-600 font-bold hover:underline">
              Sign Up
            </Link>
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-[12px] font-medium mt-4">
            Contact support if you cannot sign in to your account.
          </p>
        </div>

        <div className="mt-auto px-6 py-6 text-center border-t border-slate-50 dark:border-slate-800/50">
          <div className="flex justify-center gap-4 mb-3">
            <button className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Support</button>
            <button className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Privacy</button>
            <button className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">Terms</button>
          </div>
          <p className="text-slate-400 dark:text-slate-500 text-[10px] font-medium tracking-wide">© 2024 LogistiHub. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </div>
  );
}
