import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Notification } from '../types';
import { notificationService } from '../services/notificationService';
import { ArrowLeft, Truck, Clock, Package, CheckCircle, Info, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'Shipments' | 'Promotions' | 'Account'>('Shipments');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsubscribe = notificationService.subscribeToNotifications(user.uid, (docs) => {
      setNotifications(docs);
    });

    return unsubscribe;
  }, [user]);

  const filteredNotifications = notifications.filter(n => n.type === activeTab);

  const markAllAsRead = async () => {
    if (!user) return;
    try {
      await notificationService.markAllAsRead(user.uid);
    } catch (err) {
      console.error("Error marking all as read:", err);
    }
  };

  const getIcon = (type: string, title: string) => {
    if (title.includes('Delivery')) return <Truck className="size-6" />;
    if (title.includes('Delayed')) return <Clock className="size-6" />;
    if (title.includes('Picked')) return <Package className="size-6" />;
    if (title.includes('Successfully')) return <CheckCircle className="size-6 fill-current" />;
    return <Info className="size-6" />;
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    try {
      await notificationService.markAsRead(user.uid, id);
    } catch (err) {
      console.error("Error marking as read:", err);
    }
  };

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
        <div className="flex items-center p-4 justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)}
              className="text-slate-900 dark:text-slate-100 flex items-center justify-center cursor-pointer h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="size-6" />
            </button>
            <h2 className="text-xl font-bold tracking-tight">Notifications</h2>
          </div>
          <button 
            onClick={markAllAsRead}
            className="text-orange-600 text-sm font-bold hover:bg-orange-600/5 px-3 py-1.5 rounded-full transition-colors"
          >
            Mark all as read
          </button>
        </div>
        <div className="px-4">
          <div className="flex gap-1 overflow-x-auto no-scrollbar">
            {(['Shipments', 'Promotions', 'Account'] as const).map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "relative flex flex-col items-center justify-center px-4 pb-3 pt-2 whitespace-nowrap group transition-colors",
                  activeTab === tab ? "text-orange-600" : "text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                )}
              >
                <p className="text-sm font-bold">{tab}</p>
                {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-full"></div>}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="space-y-px">
          {filteredNotifications.length > 0 ? (
            filteredNotifications.map((n) => (
              <div 
                key={n.id}
                onClick={() => n.id && !n.read && handleMarkAsRead(n.id)}
                className={cn(
                  "group relative flex gap-4 bg-white dark:bg-slate-900 px-4 py-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-all cursor-pointer",
                  !n.read && "border-l-4 border-orange-600"
                )}
              >
                <div className="flex items-start gap-4 flex-1">
                  <div className={cn(
                    "flex items-center justify-center rounded-2xl shrink-0 w-12 h-12 transition-colors",
                    !n.read ? "bg-orange-600 text-white shadow-lg shadow-orange-600/20" : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                  )}>
                    {getIcon(n.type, n.title)}
                  </div>
                  <div className="flex flex-1 flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <p className={cn("text-[15px]", !n.read ? "text-slate-900 dark:text-slate-100 font-bold" : "text-slate-800 dark:text-slate-200 font-semibold")}>
                          {n.title}
                        </p>
                        {!n.read && <span className="h-2 w-2 rounded-full bg-orange-600 animate-pulse"></span>}
                      </div>
                      <span className="text-slate-400 dark:text-slate-500 text-[11px] font-semibold whitespace-nowrap">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-sm font-normal mt-1.5 leading-relaxed">{n.message}</p>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <Bell className="size-16 text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No {activeTab.toLowerCase()} notifications</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
