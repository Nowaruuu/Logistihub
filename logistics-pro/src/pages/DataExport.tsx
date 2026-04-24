import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { exportService } from '../services/exportService';
import { ArrowLeft, Download, Database, ShieldAlert, CheckCircle, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

export default function DataExport() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = user?.email === 'shaunl1567@gmail.com' || profile?.role === 'admin';

  const handleExport = async () => {
    if (!isAdmin) {
      setError("Unauthorized. Admin access required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const allData = await exportService.exportAllData();
      setData(allData);
    } catch (err: any) {
      console.error("Export failed:", err);
      setError(err.message || "Failed to fetch data. Check your permissions.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logistics_app_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <ShieldAlert className="size-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Access Denied</h2>
        <p className="text-slate-500 mt-2">Only administrators can export database data.</p>
        <button 
          onClick={() => navigate('/')}
          className="mt-6 px-6 py-3 bg-slate-900 dark:bg-slate-800 text-white rounded-xl font-bold"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60 p-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => navigate(-1)}
            className="text-slate-900 dark:text-slate-100 flex items-center justify-center h-10 w-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="size-6" />
          </button>
          <h2 className="text-xl font-bold tracking-tight">Database Export</h2>
        </div>
      </header>

      <main className="flex-1 p-6 space-y-6">
        <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-4 mb-6">
            <div className="size-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600">
              <Database className="size-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Full Data Dump</h3>
              <p className="text-sm text-slate-500">Export all users, drivers, deliveries, and notifications as JSON.</p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {!data ? (
              <button 
                onClick={handleExport}
                disabled={loading}
                className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="size-5 animate-spin" /> : <Database className="size-5" />}
                {loading ? 'Fetching Data...' : 'Fetch All Data'}
              </button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 p-4 rounded-xl border border-green-100 dark:border-green-800/30">
                  <CheckCircle className="size-5" />
                  <p className="text-sm font-bold">Data fetched successfully!</p>
                </div>
                <button 
                  onClick={handleDownload}
                  className="w-full py-4 bg-slate-900 dark:bg-slate-800 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                  <Download className="size-5" />
                  Download JSON File
                </button>
                <button 
                  onClick={() => setData(null)}
                  className="w-full py-3 text-slate-500 text-sm font-bold hover:underline"
                >
                  Clear and Refresh
                </button>
              </div>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-xl border border-red-100 dark:border-red-800/30 text-sm font-medium">
              {error}
            </div>
          )}
        </div>

        {data && (
          <div className="bg-slate-900 rounded-3xl p-6 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-white font-bold text-sm uppercase tracking-widest">Preview (Truncated)</h4>
              <span className="text-[10px] bg-white/10 text-white/60 px-2 py-0.5 rounded uppercase font-bold">JSON</span>
            </div>
            <div className="max-h-96 overflow-y-auto custom-scrollbar">
              <pre className="text-orange-400 text-xs font-mono leading-relaxed">
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-800/30">
          <h4 className="text-blue-900 dark:text-blue-100 font-bold mb-2">Migration Instructions</h4>
          <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-2 list-disc pl-4">
            <li>This JSON contains all documents from your current Firebase project.</li>
            <li>You can use this to seed your new AWS DynamoDB or RDS database.</li>
            <li>Ensure you map the IDs and timestamps correctly in your new schema.</li>
            <li>Sensitive data like user emails are included; handle this file securely.</li>
          </ul>
        </div>
      </main>
    </div>
  );
}
