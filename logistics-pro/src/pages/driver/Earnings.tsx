import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Calendar, RefreshCw } from 'lucide-react';
import { getDriverEarnings } from '../../lib/api';
import { cn } from '../../lib/utils';

export default function Earnings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [weekEarnings, setWeekEarnings] = useState(0);
  const [completedJobs, setCompletedJobs] = useState(0);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [showAll, setShowAll] = useState(false);

  const fetchEarnings = async () => {
    setLoading(true);
    try {
      const data = await getDriverEarnings();
      setTotalEarnings(data.total_earnings || 0);
      setWeekEarnings(data.week_earnings || 0);
      setCompletedJobs(data.completed_jobs || 0);
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch earnings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEarnings(); }, []);

  const formatCurrency = (amount: number) => `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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

  const visibleTransactions = showAll ? transactions : transactions.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white flex-1">Earnings & Wallet</h1>
        <button 
          onClick={fetchEarnings}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <RefreshCw className={cn("size-5 text-slate-600 dark:text-slate-400", loading && "animate-spin")} />
        </button>
      </div>

      <div className="px-6 space-y-6 max-w-lg mx-auto">
        {/* Wallet Card */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute -top-10 -right-10 size-40 bg-orange-600 rounded-full blur-[80px] opacity-20"></div>
          
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Total Earnings</p>
              <h2 className="text-4xl font-black mt-2">{loading ? '...' : formatCurrency(totalEarnings)}</h2>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <Wallet className="size-6 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">This Week</p>
              <p className="text-xl font-bold mt-1 text-emerald-400">{loading ? '...' : `+${formatCurrency(weekEarnings)}`}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed</p>
              <p className="text-xl font-bold mt-1">{loading ? '...' : `${completedJobs} Jobs`}</p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Recent Activity</h3>
            <TrendingUp className="size-4 text-slate-400" />
          </div>
          <div className="space-y-2">
            {loading ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="size-10 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-3"></div>
                <p className="text-slate-400 text-sm">Loading earnings...</p>
              </div>
            ) : visibleTransactions.length > 0 ? (
              <>
                {visibleTransactions.map((tx) => (
                  <div 
                    key={tx.id}
                    className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center gap-4"
                  >
                    <div className="size-10 rounded-xl flex items-center justify-center shrink-0 bg-emerald-50 text-emerald-500">
                      <ArrowDownLeft className="size-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tx.label}</p>
                      <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{getTimeAgo(tx.date)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-emerald-500">+{formatCurrency(tx.amount)}</p>
                    </div>
                  </div>
                ))}
                {transactions.length > 5 && !showAll && (
                  <button 
                    onClick={() => setShowAll(true)}
                    className="w-full py-3 text-sm font-bold text-orange-600 bg-orange-50 dark:bg-orange-950/20 rounded-2xl border border-orange-100 dark:border-orange-900/30 active:scale-[0.98] transition-transform"
                  >
                    View All ({transactions.length} transactions)
                  </button>
                )}
              </>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                  <TrendingUp className="size-6 text-slate-300" />
                </div>
                <p className="text-slate-900 dark:text-white font-bold text-sm">No activity yet</p>
                <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Start delivering to earn</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
