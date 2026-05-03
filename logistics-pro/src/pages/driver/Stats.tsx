import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Star, Activity, Clock, ThumbsUp, PieChart, BarChart3, RefreshCw } from 'lucide-react';
import { getDriverStats } from '../../lib/api';
import { cn } from '../../lib/utils';

export default function Stats() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});

  const fetchStats = async () => {
    setLoading(true);
    try {
      const data = await getDriverStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  const metrics = [
    { label: 'Acceptance Rate', value: `${stats.acceptance_rate || 0}%`, icon: ThumbsUp, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'On Time', value: `${stats.on_time_rate || 0}%`, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  ];

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
      <div className="size-10 rounded-full border-4 border-orange-600 border-t-transparent animate-spin"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex-1">Performance Stats</h1>
        <button 
          onClick={fetchStats}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <RefreshCw className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
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
          <h2 className="text-4xl font-black text-slate-900 dark:text-white">{(stats.rating || 0).toFixed(1)}</h2>
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mt-2">
            Overall Rating{stats.rating_count > 0 ? ` (${stats.rating_count} reviews)` : ''}
          </p>
          <div className="flex gap-1 mt-4">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star 
                key={s} 
                className={cn(
                  "size-4",
                  s <= Math.round(stats.rating || 0) ? "text-orange-600 fill-orange-600" : "text-slate-200 dark:text-slate-800"
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
              <h3 className="text-3xl font-black mt-1">{stats.total_deliveries || 0}</h3>
              {stats.total_assigned > 0 && stats.total_assigned !== stats.total_deliveries && (
                <p className="text-[10px] text-slate-500 mt-1">{stats.total_assigned} assigned total</p>
              )}
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
            {(stats.feedback || []).length > 0 ? (
              stats.feedback.map((fb: any, idx: number) => (
                <div key={idx} className="bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-orange-50 dark:bg-orange-950/30 flex items-center justify-center">
                        <span className="text-xs font-bold text-orange-600">{(fb.customer_name || 'C')[0]}</span>
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-white">{fb.customer_name}</span>
                    </div>
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} className={cn("size-3", s <= fb.rating ? "text-orange-600 fill-orange-600" : "text-slate-200")} />
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{fb.comment}</p>
                  <p className="text-[10px] text-slate-400 mt-2 uppercase font-bold tracking-widest">{getTimeAgo(fb.date)}</p>
                </div>
              ))
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <Star className="size-6 text-slate-300" />
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">No feedback yet</p>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Complete deliveries to see feedback</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
