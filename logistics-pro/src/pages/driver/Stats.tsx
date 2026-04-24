import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { userService } from '../../services/userService';
import { ChevronLeft, Star, Activity, Clock, ThumbsUp, PieChart, BarChart3 } from 'lucide-react';
import { Driver } from '../../types';
import { cn } from '../../lib/utils';

export default function Stats() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [driver, setDriver] = useState<Driver | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.uid) {
      fetchDriver();
    }
  }, [profile]);

  const fetchDriver = async () => {
    try {
      const data = await userService.getDriver(profile!.uid);
      setDriver(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const metrics = [
    { label: 'Acceptance Rate', value: '0%', icon: ThumbsUp, color: 'text-slate-400', bg: 'bg-slate-50' },
    { label: 'Avg Speed', value: '0 km/h', icon: Activity, color: 'text-slate-400', bg: 'bg-slate-50' },
    { label: 'On Time', value: '0%', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-50' },
  ];

  if (loading) return null;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Performance Stats</h1>
      </div>

      <div className="px-6 space-y-6 max-w-lg mx-auto">
        {/* Main Rating Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center">
          <div className="size-24 rounded-full bg-orange-600/5 dark:bg-orange-600/10 flex items-center justify-center mb-4 relative">
            <Star className="size-12 text-orange-600 fill-orange-600" />
            <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 p-2 rounded-full border border-slate-100 dark:border-slate-800 shadow-sm">
              <PieChart className="size-4 text-orange-600" />
            </div>
          </div>
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">{driver?.rating?.toFixed(1) || '0.0'}</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-2">Overall Rating</p>
          <div className="flex gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={cn(
                  "size-4",
                  s <= Math.round(driver?.rating || 0) ? "text-orange-600 fill-orange-600" : "text-slate-200 dark:text-slate-800"
                )} 
              />
            ))}
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-900 p-6 rounded-3xl text-white col-span-2 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Deliveries</p>
              <h3 className="text-3xl font-black mt-1">{driver?.totalDeliveries || 0}</h3>
            </div>
            <BarChart3 className="size-10 text-orange-600 opacity-50" />
          </div>
          
          {metrics.map((m) => (
            <div 
              key={m.label}
              className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm"
            >
              <div className={cn("size-10 rounded-xl flex items-center justify-center mb-4", m.bg)}>
                <m.icon className={cn("size-6", m.color)} />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white">{m.value}</h4>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">{m.label}</p>
            </div>
          ))}
        </div>

        {/* Feedback Section */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-4 px-1">Customer Feedback</h3>
          <div className="space-y-3">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                <Star className="size-6 text-slate-300" />
              </div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">No feedback yet</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Complete deliveries to see feedback</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
