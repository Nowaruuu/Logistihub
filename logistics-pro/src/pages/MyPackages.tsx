import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import { Search, Truck, Package as PackageIcon, ChevronRight, CheckCircle, Clock, CreditCard, Trash2 } from 'lucide-react';
import { createCheckout } from '../lib/api';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

export default function MyPackages() {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const isDriver = profile?.role === 'driver';

  useEffect(() => {
    if (!user) return;

    const fetchDeliveries = async () => {
      try {
        if (isDriver) {
          const docs = await deliveryService.getDriverDeliveries();
          setDeliveries(docs);
        } else {
          const docs = await deliveryService.getAllDeliveries();
          setDeliveries(docs);
        }
      } catch (err) {
        console.error('Failed to fetch deliveries:', err);
      }
    };

    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 30000);
    return () => clearInterval(interval);
  }, [user, isDriver]);

  const handleClearAll = async () => {
    // Not supported in API mode — just refresh
    console.warn('Clear all not supported');
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    // Not supported in API mode
    console.warn('Delete not supported');
  };

  const filteredDeliveries = deliveries.filter(d => {
    const searchLower = searchQuery.toLowerCase();
    return (
      d.trackingNumber.toLowerCase().includes(searchLower) ||
      d.origin.toLowerCase().includes(searchLower) ||
      d.destination.toLowerCase().includes(searchLower)
    );
  });

  const activeDeliveries = filteredDeliveries.filter(d => d.status !== 'Delivered');
  const pastDeliveries = filteredDeliveries.filter(d => d.status === 'Delivered');
  const displayedDeliveries = activeTab === 'active' ? activeDeliveries : pastDeliveries;

  return (
    <div className="flex flex-col min-h-full">
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
                <div className="flex items-center gap-2">
                  {activeDeliveries.length > 0 && (
                    <button 
                      onClick={handleClearAll}
                      className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-600/10 text-red-600 border border-red-600/20 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      Clear All
                    </button>
                  )}
                  <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-orange-600/10 text-orange-600 border border-orange-600/20">
                    {activeDeliveries.length} Shipments
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4 px-4">
              {activeDeliveries.map((delivery) => (
                <motion.div 
                  key={delivery.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  onClick={() => navigate(`/track/${delivery.trackingNumber}`)}
                  className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex flex-col gap-4 cursor-pointer hover:border-orange-600/30 transition-colors"
                >
                  <div className="flex gap-4 items-center">
                    <div className="flex items-center justify-center rounded-xl bg-orange-50 dark:bg-orange-950/30 text-orange-600 shrink-0 size-12">
                      <Truck className="size-6 fill-current" />
                    </div>
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between items-start">
                        <p className="text-slate-900 dark:text-slate-100 text-base font-bold">#{delivery.trackingNumber}</p>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={(e) => handleDelete(e, delivery.id)}
                            className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors rounded-lg"
                          >
                            <Trash2 className="size-4" />
                          </button>
                          <span className={cn(
                            "text-[10px] px-2 py-0.5 rounded font-bold",
                            delivery.status === 'Processing' ? "bg-slate-100 dark:bg-slate-800 text-slate-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                          )}>
                            {delivery.status}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-orange-600 font-bold text-sm">₱{delivery.totalFee?.toFixed(2)}</p>
                        <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                        <p className="text-slate-500 dark:text-slate-400 text-xs">{delivery.destination}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center px-1">
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "size-7 rounded-full flex items-center justify-center transition-colors",
                          ['Processing', 'In Transit', 'Out for Delivery', 'Delivered'].includes(delivery.status) 
                            ? "bg-orange-600 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          <PackageIcon className="size-3.5" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Received</span>
                      </div>
                      <div className="flex-1 h-[2px] bg-slate-100 dark:bg-slate-800 mx-1 -mt-4 relative">
                        <div 
                          className="absolute inset-y-0 left-0 bg-orange-600 transition-all duration-500" 
                          style={{ width: delivery.status === 'Processing' ? '0%' : '100%' }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "size-7 rounded-full flex items-center justify-center transition-colors",
                          ['In Transit', 'Out for Delivery', 'Delivered'].includes(delivery.status) 
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
                          style={{ width: ['Out for Delivery', 'Delivered'].includes(delivery.status) ? '100%' : '0%' }}
                        />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <div className={cn(
                          "size-7 rounded-full flex items-center justify-center transition-colors",
                          ['Out for Delivery', 'Delivered'].includes(delivery.status) 
                            ? "bg-orange-600 text-white" 
                            : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                        )}>
                          <CheckCircle className="size-3.5" />
                        </div>
                        <span className="text-[8px] font-bold uppercase tracking-tighter text-slate-400">Arriving</span>
                      </div>
                    </div>
                  </div>
                  {/* Pay Now Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      createCheckout(delivery.trackingNumber, delivery.totalFee || 0, `Shipment ${delivery.trackingNumber}`)
                        .then(r => { if (r.checkout_url) window.open(r.checkout_url, '_blank'); })
                        .catch(err => console.warn('Payment error:', err));
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-600 text-white text-xs font-bold shadow-sm active:scale-[0.97] transition-all"
                  >
                    <CreditCard className="size-3.5" />
                    Pay Now • ₱{delivery.totalFee?.toFixed(2)}
                  </button>
                </motion.div>
              ))}
            </div>
          </>
        )}

        {activeTab === 'past' && (
          <div className="px-4 space-y-4">
            <div className="px-1 pt-6 pb-3">
              <h3 className="text-slate-800 dark:text-slate-200 text-sm font-bold uppercase tracking-wider">Recently Delivered</h3>
            </div>
            {pastDeliveries.map((delivery) => (
              <motion.div 
                key={delivery.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={() => navigate(`/track/${delivery.trackingNumber}`)}
                className="bg-white/60 dark:bg-slate-900/60 rounded-2xl p-4 shadow-sm border border-slate-100 dark:border-slate-800/50 flex gap-4 items-center cursor-pointer hover:bg-white dark:hover:bg-slate-800 transition-all"
              >
                <div className="flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0 size-12">
                  <CheckCircle className="size-6 fill-current" />
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="text-slate-700 dark:text-slate-300 text-base font-bold">#{delivery.trackingNumber}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-xs">Received {new Date(delivery.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={(e) => handleDelete(e, delivery.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-colors rounded-xl"
                  >
                    <Trash2 className="size-5" />
                  </button>
                  <ChevronRight className="text-slate-400 size-5" />
                </div>
              </motion.div>
            ))}
            {pastDeliveries.length === 0 && (
              <div className="text-center py-12">
                <Clock className="size-12 text-slate-200 mx-auto mb-2" />
                <p className="text-slate-400">No past deliveries yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
