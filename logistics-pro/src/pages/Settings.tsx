import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Moon, Sun, Shield, Globe, ChevronRight, Mail, Phone, Lock, ArrowLeft, Check, Eye, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function Settings() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState(() => {
    return localStorage.getItem('notif_enabled') !== 'false';
  });

  // Change password modal
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPw, setShowPw] = useState(false);

  // Language modal
  const [showLangModal, setShowLangModal] = useState(false);
  const [language, setLanguage] = useState(localStorage.getItem('app_lang') || 'en');

  const LANGUAGES = [
    { code: 'en', label: 'English', flag: '🇺🇸' },
    { code: 'fil', label: 'Filipino', flag: '🇵🇭' },
    { code: 'ceb', label: 'Cebuano', flag: '🇵🇭' },
  ];

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

  const handleLanguageChange = (code: string) => {
    setLanguage(code);
    localStorage.setItem('app_lang', code);
    setShowLangModal(false);
  };

  const currentLang = LANGUAGES.find(l => l.code === language) || LANGUAGES[0];

  const sections = [
    {
      title: 'Preferences',
      items: [
        { 
          icon: darkMode ? Moon : Sun, 
          label: 'Dark Mode', 
          type: 'toggle' as const, 
          value: darkMode, 
          action: toggleDarkMode,
          color: 'bg-slate-900 dark:bg-slate-700'
        },
        { 
          icon: Bell, 
          label: 'Notifications', 
          type: 'toggle' as const, 
          value: notifications, 
          action: handleNotificationToggle,
          color: 'bg-orange-600'
        },
        { 
          icon: Globe, 
          label: 'Language', 
          type: 'link' as const, 
          displayValue: `${currentLang.flag} ${currentLang.label}`,
          action: () => setShowLangModal(true),
          color: 'bg-blue-600'
        },
      ]
    },
    {
      title: 'Security',
      items: [
        { 
          icon: Lock, 
          label: 'Change Password', 
          type: 'link' as const, 
          action: () => setShowPasswordModal(true),
          color: 'bg-emerald-600' 
        },
        { 
          icon: Shield, 
          label: 'Privacy Policy', 
          type: 'link' as const,
          action: () => window.open('https://logistichub.ddns.net/privacy', '_blank'),
          color: 'bg-indigo-600' 
        },
      ]
    },
    {
      title: 'Contact Information',
      items: [
        { icon: Mail, label: 'Email', type: 'info' as const, displayValue: profile?.email || '—', color: 'bg-amber-600' },
        { icon: Phone, label: 'Phone', type: 'info' as const, displayValue: profile?.phone || 'Not set', color: 'bg-cyan-600' },
      ]
    }
  ];

  return (
    <div className="px-6 py-4 space-y-8">
      {sections.map((section, sIdx) => (
        <motion.div 
          key={section.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: sIdx * 0.1 }}
          className="space-y-4"
        >
          <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-2">
            {section.title}
          </h3>
          
          <div className="bg-white dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
            {section.items.map((item, iIdx) => (
              <div 
                key={item.label}
                onClick={item.type === 'link' ? item.action : undefined}
                className={cn(
                  "flex items-center justify-between p-4",
                  iIdx !== section.items.length - 1 && 'border-b border-slate-50 dark:border-slate-800/50',
                  item.type === 'link' && 'cursor-pointer active:bg-slate-50 dark:active:bg-slate-800 transition-colors'
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={`size-10 rounded-xl ${item.color} flex items-center justify-center text-white`}>
                    <item.icon className="size-5" />
                  </div>
                  <span className="font-bold text-slate-700 dark:text-slate-200">{item.label}</span>
                </div>

                {item.type === 'toggle' ? (
                  <button 
                    onClick={item.action}
                    className={cn(
                      "relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none",
                      item.value ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
                    )}
                  >
                    <div className={cn(
                      "absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200",
                      item.value ? 'translate-x-6' : 'translate-x-0'
                    )} />
                  </button>
                ) : item.type === 'info' ? (
                  <span className="text-sm font-medium text-slate-400 truncate max-w-[45%] text-right">{item.displayValue}</span>
                ) : (
                  <div className="flex items-center gap-2">
                    {item.displayValue && (
                      <span className="text-sm font-medium text-slate-400">{item.displayValue}</span>
                    )}
                    <ChevronRight className="size-4 text-slate-300" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.div>
      ))}

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
                  <div className={cn("text-xs font-bold px-3 py-2 rounded-xl", pwMsg.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500')}>
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

      {/* ── Language Modal ── */}
      <AnimatePresence>
        {showLangModal && (
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
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Select Language</h3>
                <button onClick={() => setShowLangModal(false)} className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800">
                  <X className="size-5 text-slate-500" />
                </button>
              </div>
              <div className="p-4 space-y-2">
                {LANGUAGES.map(lang => (
                  <button
                    key={lang.code}
                    onClick={() => handleLanguageChange(lang.code)}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-2xl transition-all",
                      language === lang.code
                        ? "bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500"
                        : "bg-slate-50 dark:bg-slate-800 border-2 border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{lang.flag}</span>
                      <span className="font-bold text-slate-900 dark:text-white">{lang.label}</span>
                    </div>
                    {language === lang.code && (
                      <div className="size-6 rounded-full bg-orange-600 flex items-center justify-center">
                        <Check className="size-3.5 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
