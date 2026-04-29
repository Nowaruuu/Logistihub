import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import { Search, Truck, Package as PackageIcon, ChevronRight, CheckCircle, Clock, CreditCard, Trash2 } from 'lucide-react';
import { createCheckout } from '../lib/api';
import { cn } from '../lib/utils';

// Error boundary for this page
class PackagesErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, errorMsg: string}> {
  constructor(props: any) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(err: any) { return { hasError: true, errorMsg: String(err) }; }
  componentDidCatch(error: any, info: any) { console.error('MyPackages crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
          <PackageIcon className="size-16 text-slate-300 mb-4" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Page Error</h2>
          <p className="text-slate-500 mt-2 text-sm text-center">{this.state.errorMsg}</p>
          <button
            onClick={() => { this.setState({ hasError: false }); }}
            className="mt-4 px-6 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-sm"
          >
            Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function MyPackagesInner() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const isDriver = profile?.role === 'driver';

  useEffect(() => {
    if (!user) return;

    const fetchDeliveries = async () => {
      try {
        if (isDriver) {
          const docs = await deliveryService.getDriverDeliveries();
          setDeliveries(docs || []);
        } else {
          const docs = await deliveryService.getAllDeliveries();
          setDeliveries(docs || []);
        }
      } catch (err) {
        console.error('Failed to fetch deliveries:', err);
        setDeliveries([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(interval);
  }, [user, isDriver]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    console.warn('Delete not supported');
  };

  // Safe filter
  const filteredDeliveries = deliveries.filter(d => {
    if (!d) return false;
    const searchLower = searchQuery.toLowerCase();
    const tn = (d.trackingNumber || '').toLowerCase();
    const orig = (d.origin || '').toLowerCase();
    const dest = (d.destination || '').toLowerCase();
    return tn.includes(searchLower) || orig.includes(searchLower) || dest.includes(searchLower);
  });

  const activeDeliveries = filteredDeliveries.filter(d => (d.status || '') !== 'Delivered');
  const pastDeliveries = filteredDeliveries.filter(d => d.status === 'Delivered');
  const displayedDeliveries = activeTab === 'active' ? activeDeliveries : pastDeliveries;

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-full bg-white dark:bg-slate-900 p-8">
      <div className="size-12 rounded-full border-4 border-orange-600 border-t-transparent animate-spin mb-4"></div>
      <p className="text-slate-500 text-sm">Loading packages...</p>
    </div>
  );

  return (
    <div className="flex flex-col min-h-full bg-white dark:bg-slate-900">
      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex px-4">
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center pb-3 pt-4 transition-all border-b-2",
              activeTab === 'active' ? "border-orange-600 text-orange-600" : "border-transparent text-slate-400 dark:text-slate-500"
            )}
          >
            <p className="text-sm font-bold">Active</p>
          </button>
          <button 
            onClick={() => setActiveTab('past')}
            className={cn(
              "flex-1 flex flex-col items-center justify-center pb-3 pt-4 transition-all border-b-2",
              activeTab === 'past' ? "border-orange-600 text-orange-600" : "border-transparent text-slate-400 dark:text-slate-500"
            )}
          >
            <p className="text-sm font-bold">Past</p>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-6 pt-6 pb-2">
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
            <Search className="text-slate-400 group-focus-within:text-orange-600 transition-colors size-5" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-12 pr-4 py-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 transition-all" 
            placeholder="Search tracking, origin, or destination..." 
          />
        </div>
      </div>

      <div className="flex-1 pt-2">
        {activeTab === 'active' && (
          <>
            <div className="px-5 pt-6 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="text-slate-800 dark:text-slate-200 text-sm font-bold uppercase tracking-wider">In Transit</h3>
                <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-600/10 text-orange-600 border border-orange-600/20">
                  {activeDeliveries.length} Shipments
                </span>
              </div>
            </div>

            <div className="space-y-4 px-4 pb-24">
              {activeDeliveries.length === 0 && (
                <div className="text-center py-12">
                  <PackageIcon className="size-12 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                  <p className="text-slate-400">No active shipments</p>
                </div>
              )}
              {activeDeliveries.map((delivery, idx) => (
                <div 
                  key={delivery.id || `active-${idx}`}
                  onClick={() => delivery.trackingNumber && navigate(`/track/${delivery.trackingNumber}`)}
                  className="bg-white dark:bg-slate-800/50 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col gap-4 cursor-pointer hover:border-orange-600/30 transition-colors active:scale-[0.98]"
                >
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 shrink-0 size-12">
                      <Truck className="size-6" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between items-start">
                        <p className="text-slate-900 dark:text-slate-100 text-base font-bold">#{delivery.trackingNumber || 'N/A'}</p>
                        <span className={cn(
                          "text-[10px] px-2 py-0.5 rounded font-bold",
                          (delivery.status || '') === 'Processing' ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                        )}>
                          {delivery.status || 'Processing'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-orange-600 font-bold text-sm">₱{Number(delivery.totalFee || 0).toFixed(2)}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <p className="text-slate-500 dark:text-slate-400 text-xs truncate">{delivery.destination || 'N/A'}</p>
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="flex justify-between items-center px-1">
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center transition-colors",
                        "bg-orange-600 text-white"
                      )}>
                        <PackageIcon className="size-3.5" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Received</span>
                    </div>
                    <div className="flex-1 h-[2px] bg-slate-100 dark:bg-slate-800 mx-1 -mt-4 relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-orange-600 transition-all duration-500" 
                        style={{ width: (delivery.status || '') === 'Processing' ? '0%' : '100%' }}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center transition-colors",
                        ['In Transit', 'Out for Delivery', 'Delivered'].includes(delivery.status || '') 
                          ? "bg-orange-600 text-white" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        <Truck className="size-3.5" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Transit</span>
                    </div>
                    <div className="flex-1 h-[2px] bg-slate-100 dark:bg-slate-800 mx-1 -mt-4 relative">
                      <div 
                        className="absolute inset-y-0 left-0 bg-orange-600 transition-all duration-500" 
                        style={{ width: ['Out for Delivery', 'Delivered'].includes(delivery.status || '') ? '100%' : '0%' }}
                      />
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className={cn(
                        "size-7 rounded-full flex items-center justify-center transition-colors",
                        ['Out for Delivery', 'Delivered'].includes(delivery.status || '') 
                          ? "bg-orange-600 text-white" 
                          : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                      )}>
                        <CheckCircle className="size-3.5" />
                      </div>
                      <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Arriving</span>
                    </div>
                  </div>
                  {/* Pay Now Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createCheckout(delivery.trackingNumber || '', delivery.totalFee || 0, `Shipment ${delivery.trackingNumber || ''}`)
                        .then(r => { if (r?.checkout_url) window.open(r.checkout_url, '_blank'); })
                        .catch(err => console.warn('Payment error:', err));
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-sm active:scale-[0.97] transition-all"
                  >
                    <CreditCard className="size-3.5" />
                    Pay Now • ₱{Number(delivery.totalFee || 0).toFixed(2)}
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'past' && (
          <div className="px-4 space-y-4 pb-24">
            <div className="px-1 pt-6 pb-3">
              <h3 className="text-slate-800 dark:text-slate-200 text-sm font-bold uppercase tracking-wider">Recently Delivered</h3>
            </div>
            {pastDeliveries.map((delivery, idx) => (
              <div 
                key={delivery.id || `past-${idx}`}
                onClick={() => delivery.trackingNumber && navigate(`/track/${delivery.trackingNumber}`)}
                className="bg-white/60 dark:bg-slate-800/50 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex gap-4 items-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all active:scale-[0.98]"
              >
                <div className="flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 size-12">
                  <CheckCircle className="size-6" />
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="text-slate-700 dark:text-slate-300 text-base font-bold">#{delivery.trackingNumber || 'N/A'}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Delivered {delivery.createdAt ? new Date(delivery.createdAt).toLocaleDateString() : ''}</p>
                </div>
                <ChevronRight className="text-slate-400 size-5" />
              </div>
            ))}
            {pastDeliveries.length === 0 && (
              <div className="text-center py-12">
                <Clock className="size-12 text-slate-200 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-slate-400">No past deliveries yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyPackages() {
  return (
    <PackagesErrorBoundary>
      <MyPackagesInner />
    </PackagesErrorBoundary>
  );
}
