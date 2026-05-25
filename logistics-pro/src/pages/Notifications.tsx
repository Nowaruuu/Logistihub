import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';
import { Truck, Clock, Package, CheckCircle, Info, Bell, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Shipments' | 'Account'>('Shipments');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());

  const fetchNotifications = useCallback(async () => {
    try {
      const docs = await notificationService.getNotifications();
      setNotifications(docs);
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user, fetchNotifications]);

  const filteredNotifications = notifications.filter(n => n.type === activeTab);

  const markAllAsRead = () => {
    setReadIds(new Set(notifications.map(n => n.id || '')));
  };

  const handleMarkAsRead = (id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  };

  const isRead = (n: Notification) => n.read || readIds.has(n.id || '');

  const getIcon = (type: string, title: string) => {
    if (title.includes('Delivered') || title.includes('Completed')) return <CheckCircle className="size-5" />;
    if (title.includes('Transit') || title.includes('Pickup')) return <Truck className="size-5" />;
    if (title.includes('Out for') || title.includes('Route')) return <Package className="size-5" />;
    if (title.includes('Delayed') || title.includes('Processing')) return <Clock className="size-5" />;
    return <Info className="size-5" />;
  };

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-900">
      {/* Tab bar */}
      <div className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
        <div className="flex">
          {(['Shipments', 'Account'] as const).map((tab) => {
            const count = notifications.filter(n => n.type === tab && !isRead(n)).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center py-3 gap-1 border-b-2 transition-all relative",
                  activeTab === tab
                    ? "border-orange-600 text-orange-600"
                    : "border-transparent text-slate-400"
                )}
              >
                <span className="text-xs font-bold">{tab}</span>
                {count > 0 && (
                  <span className="absolute top-1.5 right-1/4 min-w-[14px] h-[14px] rounded-full text-[9px] font-black flex items-center justify-center px-0.5 bg-orange-600 text-white">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-50 dark:border-slate-800">
        <button
          onClick={() => { setLoading(true); fetchNotifications(); }}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 active:text-orange-600"
        >
          <RefreshCw className={cn("size-3", loading && "animate-spin")} />
          Refresh
        </button>
        <button
          onClick={markAllAsRead}
          className="text-xs font-bold text-orange-600 active:opacity-60"
        >
          Mark all as read
        </button>
      </div>

      {/* List */}
      <div className="flex-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-10 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-3" />
            <p className="text-slate-400 text-sm">Loading notifications...</p>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <div className="size-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Bell className="size-7 text-slate-300 dark:text-slate-600" />
            </div>
            <p className="text-slate-400 text-sm font-medium">No {activeTab.toLowerCase()} notifications</p>
            <p className="text-slate-400/60 text-xs">We'll notify you when something happens</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {filteredNotifications.map((n) => {
              const read = isRead(n);
              return (
                <button
                  key={n.id}
                  onClick={() => {
                    if (n.id) handleMarkAsRead(n.id);
                    if (n.relatedTrackingNumber) navigate(`/track/${n.relatedTrackingNumber}`);
                  }}
                  className={cn(
                    "w-full text-left flex gap-3.5 px-5 py-4 transition-all active:bg-slate-50 dark:active:bg-slate-800/40",
                    !read && "bg-orange-50/50 dark:bg-orange-900/5"
                  )}
                >
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                    !read
                      ? "bg-orange-600 text-white shadow-sm shadow-orange-600/20"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    {getIcon(n.type, n.title)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={cn(
                          "text-sm truncate",
                          !read ? "text-slate-900 dark:text-white font-bold" : "text-slate-700 dark:text-slate-300 font-semibold"
                        )}>
                          {n.title}
                        </p>
                        {!read && <span className="size-1.5 rounded-full bg-orange-600 shrink-0" />}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap shrink-0">
                        {getTimeAgo(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed line-clamp-2">
                      {n.message}
                    </p>
                    {n.relatedTrackingNumber && (
                      <span className="inline-block mt-1.5 text-[10px] font-bold text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-2 py-0.5 rounded-full">
                        #{n.relatedTrackingNumber}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
