import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Earnings() {
  const navigate = useNavigate();
  const transactions: any[] = []; // Empty transactions

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Earnings & Wallet</h1>
      </div>

      <div className="px-6 space-y-6 max-w-lg mx-auto">
        {/* Wallet Card */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl">
          <div className="absolute -top-10 -right-10 size-40 bg-orange-600 rounded-full blur-[80px] opacity-20"></div>
          
          <div className="flex justify-between items-start mb-10">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Current Balance</p>
              <h2 className="text-4xl font-black mt-2">$0.00</h2>
            </div>
            <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-md">
              <Wallet className="size-6 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">This Week</p>
              <p className="text-xl font-bold mt-1 text-emerald-400">+$0.00</p>
            </div>
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Completed</p>
              <p className="text-xl font-bold mt-1">0 Jobs</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-2 group active:scale-95 transition-all">
            <div className="size-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
              <ArrowUpRight className="size-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">Withdraw</span>
          </button>
          <button className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center gap-2 group active:scale-95 transition-all">
            <div className="size-12 rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="size-6" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">History</span>
          </button>
        </div>

        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4 px-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Recent Activity</h3>
            <TrendingUp className="size-4 text-slate-400" />
          </div>
          <div className="space-y-2">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div 
                  key={tx.id}
                  className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-900 flex items-center gap-4"
                >
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center shrink-0",
                    tx.type === 'delivery' ? "bg-emerald-50 text-emerald-500" : "bg-orange-50 text-orange-600"
                  )}>
                    {tx.type === 'delivery' ? <ArrowDownLeft className="size-5" /> : <ArrowUpRight className="size-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{tx.label}</p>
                    <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{tx.date}</p>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "font-bold",
                      tx.amount > 0 ? "text-emerald-500" : "text-slate-900 dark:text-white"
                    )}>
                      {tx.amount > 0 ? `+$${tx.amount.toFixed(2)}` : `-$${Math.abs(tx.amount).toFixed(2)}`}
                    </p>
                  </div>
                </div>
              ))
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
