import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, FileText, CheckCircle2, Clock, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function Documents() {
  const navigate = useNavigate();
  const documents: any[] = []; // Empty documents

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-24">
      <div className="p-6 flex items-center gap-4">
        <button 
          onClick={() => navigate(-1)}
          className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
        >
          <ChevronLeft className="size-5 text-slate-600 dark:text-slate-400" />
        </button>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">Driver Documents</h1>
      </div>

      <div className="px-6 space-y-6 max-w-lg mx-auto">
        {/* Verification Status Header */}
        <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-xl shadow-slate-900/20 relative overflow-hidden">
          <div className="relative z-10 flex flex-col items-center text-center">
            <div className="bg-white/20 p-4 rounded-full backdrop-blur-md mb-4">
              <Clock className="size-10 text-white" />
            </div>
            <h2 className="text-2xl font-black">Verification Pending</h2>
            <p className="text-slate-400 text-sm mt-1 opacity-80">Upload your documents to get started.</p>
          </div>
        </div>

        {/* Documents List */}
        <div className="space-y-3">
          <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-400 px-1">Required Documents</h3>
          {documents.length > 0 ? (
            documents.map((doc) => (
              <div 
                key={doc.title}
                className="bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 flex items-center gap-4 shadow-sm group active:scale-[0.98] transition-all"
              >
                <div className={cn("size-14 rounded-2xl flex items-center justify-center shrink-0", doc.bg)}>
                  <doc.icon className={cn("size-7", doc.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-900 dark:text-white font-bold">{doc.title}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">{doc.date}</p>
                </div>
                <div className={cn(
                  "px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest",
                  doc.status === 'Verified' ? "bg-emerald-500/10 text-emerald-600" : "bg-orange-500/10 text-orange-600"
                )}>
                  {doc.status}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
              <div className="size-12 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center mb-3">
                <FileText className="size-6 text-slate-300" />
              </div>
              <p className="text-slate-900 dark:text-white font-bold text-sm">No documents yet</p>
              <p className="text-slate-400 text-[10px] uppercase font-bold tracking-widest mt-1">Upload files for verification</p>
            </div>
          )}
        </div>

        {/* Warning/Info Box */}
        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-2xl p-4 border border-blue-100 dark:border-blue-900/30 flex gap-3">
          <AlertCircle className="size-5 text-blue-500 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-900/70 dark:text-blue-400/70 leading-relaxed">
            Please ensure your documents are up to date to avoid service interruptions. Expiry notifications will be sent 30 days in advance.
          </p>
        </div>

        <button className="w-full bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white rounded-2xl py-4 font-bold border border-slate-200 dark:border-slate-700 hover:bg-slate-200 transition-colors">
          Upload New Document
        </button>
      </div>
    </div>
  );
}
