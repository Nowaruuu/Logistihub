import React, { useState } from 'react';
import { Bell, Moon, Sun, ChevronRight, Mail, Phone, Lock, Eye, EyeOff, X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function Settings() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { profile, refreshProfile } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notif_enabled') !== 'false';
  });

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  // Phone edit modal
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneValue, setPhoneValue] = useState(profile?.phone || '');
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [phoneMsg, setPhoneMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleNotificationToggle = () => {
    const newVal = !notifications;
    setNotifications(newVal);
    localStorage.setItem('notif_enabled', String(newVal));
  };

  const handleChangePassword = async () => {
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'All fields are required.' });
      return;
    }
    if (pwForm.newPw.length < 6) {
      setPwMsg({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    setPwLoading(true);
    setPwMsg(null);
    try {
      const slug = localStorage.getItem('auth_slug') || '';
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`https://logistichub.ddns.net/${slug}/api/mobile/change-password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwForm.current, newPassword: pwForm.newPw })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to change password');
      setPwMsg({ type: 'success', text: 'Password changed successfully!' });
      setPwForm({ current: '', newPw: '', confirm: '' });
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err: any) {
      setPwMsg({ type: 'error', text: err.message || 'Failed to change password.' });
    } finally {
      setPwLoading(false);
    }
  };

  const handleSavePhone = async () => {
    const cleaned = phoneValue.replace(/\s/g, '');
    if (!cleaned) {
      setPhoneMsg({ type: 'error', text: 'Phone number is required.' });
      return;
    }
    if (!/^(09|\+639)\d{9}$/.test(cleaned) && !/^\d{7,15}$/.test(cleaned)) {
      setPhoneMsg({ type: 'error', text: 'Enter a valid phone number.' });
      return;
    }
    setPhoneLoading(true);
    setPhoneMsg(null);
    try {
      const slug = localStorage.getItem('auth_slug') || '';
      const token = localStorage.getItem('auth_token') || '';
      const res = await fetch(`https://logistichub.ddns.net/${slug}/api/mobile/update-phone`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: cleaned })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update phone');
      setPhoneMsg({ type: 'success', text: 'Phone updated!' });
      await refreshProfile();
      setTimeout(() => { setShowPhoneModal(false); setPhoneMsg(null); }, 1200);
    } catch (err: any) {
      setPhoneMsg({ type: 'error', text: err.message || 'Failed to update phone.' });
    } finally {
      setPhoneLoading(false);
    }
  };

  return (
    <div className="px-6 py-4 space-y-8">
      {/* Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-4"
      >
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
          Preferences
        </h3>
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          {/* Dark Mode */}
          <div
            onClick={toggleDarkMode}
            className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/50 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-slate-900 dark:bg-slate-700 flex items-center justify-center text-white">
                {darkMode ? <Moon className="size-5" /> : <Sun className="size-5" />}
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">Dark Mode</span>
            </div>
            <div className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              darkMode ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
            )}>
              <div className={cn(
                "absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200",
                darkMode ? 'translate-x-6' : 'translate-x-0'
              )} />
            </div>
          </div>

          {/* Notifications */}
          <div
            onClick={handleNotificationToggle}
            className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-orange-600 flex items-center justify-center text-white">
                <Bell className="size-5" />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">Notifications</span>
            </div>
            <div className={cn(
              "relative w-12 h-6 rounded-full transition-colors duration-200",
              notifications ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
            )}>
              <div className={cn(
                "absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200",
                notifications ? 'translate-x-6' : 'translate-x-0'
              )} />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Security */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
          Security
        </h3>
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div
            onClick={() => setShowPasswordModal(true)}
            className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <Lock className="size-5" />
              </div>
              <span className="font-bold text-slate-700 dark:text-slate-200">Change Password</span>
            </div>
            <ChevronRight className="size-4 text-slate-300" />
          </div>
        </div>
      </motion.div>

      {/* Contact Info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
          Contact Information
        </h3>
        <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-amber-600 flex items-center justify-center text-white">
                <Mail className="size-5" />
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Email</span>
                <p className="text-xs text-slate-400 mt-0.5">{profile?.email || '—'}</p>
              </div>
            </div>
          </div>
          <div
            onClick={() => { setPhoneValue(profile?.phone || ''); setPhoneMsg(null); setShowPhoneModal(true); }}
            className="flex items-center justify-between p-4 cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="size-10 rounded-xl bg-cyan-600 flex items-center justify-center text-white">
                <Phone className="size-5" />
              </div>
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-200 text-sm">Phone</span>
                <p className="text-xs text-slate-400 mt-0.5">{profile?.phone || 'Not set — tap to edit'}</p>
              </div>
            </div>
            <ChevronRight className="size-4 text-slate-300" />
          </div>
        </div>
      </motion.div>

      <div className="pt-4 px-2">
        <p className="text-center text-[11px] text-slate-400 font-medium">
          LogistiHub v2.5.0<br />
          © 2026 LogistiHub
        </p>
      </div>

      {/* ── Change Password Modal ── */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Change Password</h3>
                <button onClick={() => { setShowPasswordModal(false); setPwMsg(null); }} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current Password</label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={e => setPwForm({ ...pwForm, current: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 pr-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                      placeholder="Enter current password"
                    />
                    <button onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">New Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm.newPw}
                    onChange={e => setPwForm({ ...pwForm, newPw: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Enter new password"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Confirm New Password</label>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={pwForm.confirm}
                    onChange={e => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500"
                    placeholder="Confirm new password"
                  />
                </div>
                {pwMsg && (
                  <div className={cn("text-xs font-bold px-3 py-2 rounded-xl", pwMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500')}>
                    {pwMsg.text}
                  </div>
                )}
                <button
                  onClick={handleChangePassword}
                  disabled={pwLoading}
                  className="w-full h-12 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {pwLoading ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Update Password'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Phone Edit Modal ── */}
      <AnimatePresence>
        {showPhoneModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Edit Phone Number</h3>
                <button onClick={() => setShowPhoneModal(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-5 text-slate-500" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={e => setPhoneValue(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl p-3 pl-10 text-slate-900 dark:text-white focus:ring-2 focus:ring-orange-500 text-lg font-medium tracking-wide"
                      placeholder="09xxxxxxxxx"
                      autoFocus
                    />
                  </div>
                </div>
                {phoneMsg && (
                  <div className={cn("text-xs font-bold px-3 py-2 rounded-xl", phoneMsg.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' : 'bg-red-50 dark:bg-red-900/20 text-red-500')}>
                    {phoneMsg.text}
                  </div>
                )}
                <button
                  onClick={handleSavePhone}
                  disabled={phoneLoading}
                  className="w-full h-12 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {phoneLoading ? <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <><Save className="size-4" /> Save Phone Number</>}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
