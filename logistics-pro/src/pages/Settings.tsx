import React, { useState, useEffect } from 'react';
import { Bell, Moon, Sun, Shield, Smartphone, Globe, ChevronRight, Mail, Phone, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../hooks/useAuth';

export default function Settings() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { profile } = useAuth();
  const [notifications, setNotifications] = useState(() => {
    return 'Notification' in window && Notification.permission === 'granted';
  });

  const handleNotificationToggle = async () => {
    if (!('Notification' in window)) {
      alert('This browser does not support desktop notifications');
      return;
    }

    if (notifications) {
      // We can't actually "revoke" permission via JS, but we can stop sending them
      setNotifications(false);
    } else {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        setNotifications(true);
        new Notification('Notifications Enabled', {
          body: 'You will now receive updates about your shipments.',
          icon: '/favicon.ico'
        });
      } else {
        alert('Notification permission denied. Please enable it in your browser settings.');
      }
    }
  };

  const sections = [
    {
      title: 'Preferences',
      items: [
        { 
          icon: darkMode ? Moon : Sun, 
          label: 'Dark Mode', 
          type: 'toggle', 
          value: darkMode, 
          action: toggleDarkMode,
          color: 'bg-slate-900 dark:bg-slate-800'
        },
        { 
          icon: Bell, 
          label: 'Push Notifications', 
          type: 'toggle', 
          value: notifications, 
          action: handleNotificationToggle,
          color: 'bg-orange-600'
        },
        { 
          icon: Globe, 
          label: 'Language', 
          type: 'link', 
          value: 'English',
          color: 'bg-blue-600'
        },
      ]
    },
    {
      title: 'Security',
      items: [
        { icon: Lock, label: 'Change Password', type: 'link', color: 'bg-emerald-600' },
        { icon: Shield, label: 'Two-Factor Auth', type: 'link', value: 'Off', color: 'bg-indigo-600' },
        { icon: Smartphone, label: 'Linked Devices', type: 'link', value: '2 Active', color: 'bg-violet-600' },
      ]
    },
    {
      title: 'Contact Information',
      items: [
        { icon: Mail, label: 'Email Address', type: 'link', value: profile?.email || 'user@example.com', color: 'bg-amber-600' },
        { icon: Phone, label: 'Phone Number', type: 'link', value: profile?.phone || '+1 (555) 000-0000', color: 'bg-cyan-600' },
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
                className={`flex items-center justify-between p-4 ${
                  iIdx !== section.items.length - 1 ? 'border-b border-slate-50 dark:border-slate-800/50' : ''
                }`}
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
                    className={`relative w-12 h-6 rounded-full transition-colors duration-200 focus:outline-none ${
                      item.value ? 'bg-orange-600' : 'bg-slate-200 dark:bg-slate-700'
                    }`}
                  >
                    <div className={`absolute top-1 left-1 size-4 bg-white rounded-full transition-transform duration-200 ${
                      item.value ? 'translate-x-6' : 'translate-x-0'
                    }`} />
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    {item.value && (
                      <span className="text-sm font-medium text-slate-400">{item.value}</span>
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
          App Version 2.4.1 (Build 1082)<br />
          Logistics Pro Inc.
        </p>
      </div>
    </div>
  );
}
