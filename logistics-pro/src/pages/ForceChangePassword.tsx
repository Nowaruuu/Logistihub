import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Eye, EyeOff, ShieldCheck, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

const API_BASE = 'https://logistichub.ddns.net';

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();

  // Passed from SignIn after login response
  const { slug, username, tempPassword } = (location.state || {}) as {
    slug: string;
    username: string;
    tempPassword: string;
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Guard — if somehow accessed without state, redirect
  if (!slug || !username) {
    navigate('/signin', { replace: true });
    return null;
  }

  const strength = (() => {
    if (!newPassword) return 0;
    let s = 0;
    if (newPassword.length >= 8) s++;
    if (/[A-Z]/.test(newPassword)) s++;
    if (/[0-9]/.test(newPassword)) s++;
    if (/[^A-Za-z0-9]/.test(newPassword)) s++;
    return s;
  })();

  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-green-500'][strength];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword === tempPassword) {
      setError('New password must be different from your temporary password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/${slug}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          current_password: tempPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password.');

      // Redirect to sign in — they must log in with the new password
      navigate('/signin', {
        replace: true,
        state: { message: 'Password changed! Please sign in with your new password.' }
      });
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-5">
      <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center size-16 rounded-2xl bg-orange-600/10 border border-orange-600/20 mb-4">
            <ShieldCheck className="size-8 text-orange-600" />
          </div>
          <h1 className="text-2xl font-extrabold text-white">Set New Password</h1>
          <p className="text-slate-400 text-sm mt-2 leading-relaxed">
            Your account was created with a temporary password.
            <br />You must set a new one to continue.
          </p>
        </div>

        {/* Warning banner */}
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
          <AlertTriangle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-amber-400">
            This is a <strong>one-time requirement</strong>. After this, use your new password to sign in.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* New password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              New Password
            </label>
            <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/60 focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-600/20 transition-all overflow-hidden">
              <Lock className="absolute left-4 size-5 text-slate-500" />
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="flex-1 bg-transparent h-14 pl-12 pr-12 text-white placeholder:text-slate-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showNew ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>

            {/* Strength bar */}
            {newPassword && (
              <div className="mt-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4].map(i => (
                    <div
                      key={i}
                      className={`flex-1 h-1 rounded-full transition-all ${i <= strength ? strengthColor : 'bg-slate-700'}`}
                    />
                  ))}
                </div>
                <p className={`text-xs mt-1 font-bold ${
                  strength <= 1 ? 'text-red-400' : strength === 2 ? 'text-amber-400' : strength === 3 ? 'text-blue-400' : 'text-green-400'
                }`}>{strengthLabel}</p>
              </div>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              Confirm New Password
            </label>
            <div className="relative flex items-center rounded-xl border border-slate-700 bg-slate-800/60 focus-within:border-orange-600 focus-within:ring-2 focus-within:ring-orange-600/20 transition-all overflow-hidden">
              <Lock className="absolute left-4 size-5 text-slate-500" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="Repeat new password"
                className="flex-1 bg-transparent h-14 pl-12 pr-12 text-white placeholder:text-slate-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-4 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
              </button>
            </div>
            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-400 mt-1 font-medium">Passwords don't match</p>
            )}
          </div>

          {/* Rules */}
          <ul className="text-xs text-slate-500 space-y-1 px-1">
            <li className={newPassword.length >= 8 ? 'text-green-400' : ''}>✓ At least 8 characters</li>
            <li className={/[A-Z]/.test(newPassword) ? 'text-green-400' : ''}>✓ One uppercase letter</li>
            <li className={/[0-9]/.test(newPassword) ? 'text-green-400' : ''}>✓ One number</li>
          </ul>

          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="size-4 text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !newPassword || !confirmPassword || newPassword !== confirmPassword}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl bg-orange-600 text-white font-bold text-[15px] mt-2 active:scale-[0.98] transition-all disabled:opacity-40 shadow-lg shadow-orange-600/20"
          >
            {loading ? (
              <><Loader2 className="size-5 animate-spin" /> Saving...</>
            ) : (
              <>Set New Password <ArrowRight className="size-5" /></>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
