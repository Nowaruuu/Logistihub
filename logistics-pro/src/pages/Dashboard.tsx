import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import { Search, Calendar, Truck, Package as PackageIcon, ChevronRight, MapPin, Send, Book, Star, ClipboardList, Wallet, FileText, Navigation, Car } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import Map, { RiderIcon, DestinationIcon } from '../components/Map';
import { getDriverEarnings, getProfile } from '../lib/api';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [trackingNumber, setTrackingNumber] = useState('');
  const [activeDeliveries, setActiveDeliveries] = useState<Delivery[]>([]);
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.5995, 120.9842]);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchDeliveries = useCallback(async () => {
    if (!user || profile?.role === 'driver') return;
    try {
      const docs = await deliveryService.getActiveDeliveries();
      setActiveDeliveries(docs);

      if (docs.length > 0 && !selectedDeliveryId) {
        const first = docs[0];
        setMapCenter([first.currentLat || 14.5995, first.currentLng || 120.9842]);
        setSelectedDeliveryId(first.id || null);
      }
    } catch (err) {
      console.error('Failed to fetch deliveries:', err);
    }
  }, [user, profile, selectedDeliveryId]);

  useEffect(() => {
    fetchDeliveries();
    const interval = setInterval(fetchDeliveries, 30000); // poll every 30s
    return () => clearInterval(interval);
  }, [fetchDeliveries]);

  const handleTrack = (e: React.FormEvent) => {
    e.preventDefault();
    if (trackingNumber) {
      navigate(`/track/${trackingNumber}`);
    }
  };

  const handleDeliveryClick = (delivery: Delivery) => {
    setMapCenter([delivery.currentLat || 14.5995, delivery.currentLng || 120.9842]);
    setSelectedDeliveryId(delivery.id || null);

    const mapSection = document.getElementById('live-status-map');
    if (mapSection) {
      mapSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const selectedDelivery = activeDeliveries.find(d => d.id === selectedDeliveryId) || activeDeliveries[0];

  const [driverStats, setDriverStats] = useState<{ rating: number; totalDeliveries: number; weekEarnings: number } | null>(null);
  const [activeAssignments, setActiveAssignments] = useState<Delivery[]>([]);

  useEffect(() => {
    if (!user || profile?.role !== 'driver') return;
    Promise.all([
      getDriverEarnings().catch(() => null),
      getProfile().catch(() => null),
      deliveryService.getDriverDeliveries().catch(() => []),
    ]).then(([earnings, prof, active]) => {
      setDriverStats({
        rating: prof?.rating ?? 0,
        totalDeliveries: prof?.total_deliveries ?? 0,
        weekEarnings: earnings?.week_earnings ?? 0,
      });
      setActiveAssignments(active || []);
    });
  }, [user, profile]);

  if (profile?.role === 'driver') {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const firstName = profile.fullName?.split(' ')[0] || 'Driver';
    const hasActive = activeAssignments.length > 0;

    return (
      <div className="space-y-5 pb-28">
        {/* Greeting Banner */}
        <div className="px-5 pt-3">
          <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-5 text-white shadow-xl">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">{greeting}</p>
            <h2 className="text-2xl font-black mb-4">{firstName} 👋</h2>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-2xl p-3">
              <div className="text-center border-r border-white/10">
                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Rating</p>
                <div className="flex items-center justify-center gap-1">
                  <Star className="size-3 text-yellow-400 fill-yellow-400" />
                  <span className="font-bold text-sm">{driverStats?.rating ? driverStats.rating.toFixed(1) : 'New'}</span>
                </div>
              </div>
              <div className="text-center border-r border-white/10">
                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Deliveries</p>
                <p className="font-bold text-sm">{driverStats?.totalDeliveries ?? '—'}</p>
              </div>
              <div className="text-center">
                <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">This Week</p>
                <p className="font-bold text-sm text-orange-400">₱{(driverStats?.weekEarnings ?? 0).toFixed(0)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Active Assignment Preview */}
        {hasActive && (
          <div className="px-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-slate-900 dark:text-slate-100 text-sm font-extrabold flex items-center gap-2">
                <Navigation className="size-4 text-blue-600" /> Active Assignment
              </h3>
              <Link to="/driver/jobs" className="text-xs font-bold text-orange-600">View →</Link>
            </div>
            {activeAssignments.slice(0, 1).map(a => (
              <div key={a.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-blue-900/30 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase">{a.status}</span>
                  <span className="text-sm font-bold text-slate-700 dark:text-slate-300">#{a.trackingNumber}</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{a.destination}</p>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="px-5">
          <h3 className="text-slate-900 dark:text-slate-100 text-sm font-extrabold mb-3">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => navigate('/driver/jobs')}
              className="p-4 flex flex-col items-start gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 active:scale-95 transition-all group">
              <div className="size-10 rounded-xl bg-orange-600/10 flex items-center justify-center text-orange-600 group-active:bg-orange-600 group-active:text-white transition-all">
                <ClipboardList className="size-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Available Jobs</p>
                <p className="text-[10px] text-slate-500">Browse & accept</p>
              </div>
            </button>
            <button onClick={() => navigate('/driver/earnings')}
              className="p-4 flex flex-col items-start gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 active:scale-95 transition-all group">
              <div className="size-10 rounded-xl bg-green-600/10 flex items-center justify-center text-green-600 group-active:bg-green-600 group-active:text-white transition-all">
                <Wallet className="size-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">My Earnings</p>
                <p className="text-[10px] text-slate-500">View history</p>
              </div>
            </button>
            <button onClick={() => navigate('/driver/documents')}
              className="p-4 flex flex-col items-start gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 active:scale-95 transition-all group">
              <div className="size-10 rounded-xl bg-blue-600/10 flex items-center justify-center text-blue-600 group-active:bg-blue-600 group-active:text-white transition-all">
                <FileText className="size-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">Documents</p>
                <p className="text-[10px] text-slate-500">License & ID</p>
              </div>
            </button>
            <button onClick={() => navigate('/driver/vehicle')}
              className="p-4 flex flex-col items-start gap-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50 active:scale-95 transition-all group">
              <div className="size-10 rounded-xl bg-purple-600/10 flex items-center justify-center text-purple-600 group-active:bg-purple-600 group-active:text-white transition-all">
                <Car className="size-5" />
              </div>
              <div>
                <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">My Vehicle</p>
                <p className="text-[10px] text-slate-500">Info & requests</p>
              </div>
            </button>
          </div>
        </div>

        {/* Nearby Stations */}
        <div className="px-5">
          <button onClick={() => navigate('/stations')}
            className="w-full p-4 flex items-center justify-between bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/10 active:scale-[0.98] transition-all">
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-xl bg-white/10 flex items-center justify-center">
                <MapPin className="size-5" />
              </div>
              <div className="text-left">
                <p className="font-bold">Nearby Pickups</p>
                <p className="text-xs text-slate-400">View stations on map</p>
              </div>
            </div>
            <ChevronRight className="size-5 text-slate-400" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Track a Package Section */}
      <div className="px-6 py-4">
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-6 border border-slate-100 dark:border-slate-700/50">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Track a Package</h2>
          <form onSubmit={handleTrack} className="flex flex-col gap-4">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <Search className="text-slate-400 group-focus-within:text-orange-600 transition-colors size-5" />
              </div>
              <input 
                type="text"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="block w-full pl-12 pr-4 py-4 rounded-xl border-none bg-white dark:bg-slate-800 shadow-sm focus:ring-2 focus:ring-orange-600 text-base placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
                placeholder="Enter tracking number..." 
              />
            </div>
            <button 
              type="submit"
              className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all hover:brightness-110"
            >
              Track Now
            </button>
          </form>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="px-6 py-2">
        <div className="grid grid-cols-2 gap-4">
          <button 
            onClick={() => navigate('/send')}
            className="p-5 flex flex-col items-start gap-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 active:scale-95 transition-all group"
          >
            <div className="size-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
              <Send className="size-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-slate-100">Send Package</p>
              <p className="text-[10px] text-slate-500">Ship & get rates</p>
            </div>
          </button>
          <button 
            onClick={() => navigate('/address-book')}
            className="p-5 flex flex-col items-start gap-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700/50 active:scale-95 transition-all group"
          >
            <div className="size-12 rounded-2xl bg-blue-600/10 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
              <Book className="size-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-slate-900 dark:text-slate-100">Address Book</p>
              <p className="text-[10px] text-slate-500">Saved contacts</p>
            </div>
          </button>
        </div>
      </div>

      {/* Schedule a Pickup Quick Action */}
      <div className="px-6 py-2">
        <button 
          onClick={() => navigate('/send')}
          className="w-full p-5 flex items-center justify-between bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl shadow-slate-900/10 group active:scale-[0.98] transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="size-12 rounded-xl bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
              <Calendar className="size-6" />
            </div>
            <div className="text-left">
              <p className="font-bold text-lg">Schedule a Pickup</p>
              <p className="text-sm text-slate-400">Doorstep service</p>
            </div>
          </div>
          <ChevronRight className="group-hover:translate-x-1 transition-transform size-6" />
        </button>
      </div>

      {/* Active Deliveries Section */}
      <div className="px-6 py-2">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-slate-900 dark:text-slate-100 text-xl font-extrabold">Active Deliveries</h3>
          <Link to="/packages" className="text-orange-600 text-sm font-bold flex items-center gap-1 hover:opacity-80">
            See All
            <ChevronRight className="size-4" />
          </Link>
        </div>
        
        <div className="space-y-4">
          {activeDeliveries.length > 0 ? (
            activeDeliveries.map((delivery) => (
              <motion.div 
                key={delivery.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                onClick={() => handleDeliveryClick(delivery)}
                className={cn(
                  "flex flex-col p-5 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border transition-all cursor-pointer",
                  selectedDeliveryId === delivery.id 
                    ? "border-orange-600 ring-1 ring-orange-600/20" 
                    : "border-slate-100 dark:border-slate-700/50 hover:border-orange-600/30"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "size-12 rounded-xl flex items-center justify-center transition-colors",
                      selectedDeliveryId === delivery.id 
                        ? "bg-orange-600 text-white" 
                        : "bg-orange-50 dark:bg-orange-600/10 text-orange-600"
                    )}>
                      <Truck className="size-7" />
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">{delivery.trackingNumber}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{delivery.origin} → {delivery.destination}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-900/30 px-3 py-1 text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-tight">
                      {delivery.status}
                    </span>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/track/${delivery.trackingNumber}`);
                      }}
                      className="text-[10px] font-bold text-orange-600 hover:underline flex items-center gap-0.5"
                    >
                      Details <ChevronRight className="size-3" />
                    </button>
                  </div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Estimated arrival</span>
                  <span className="text-slate-900 dark:text-white font-bold text-sm">{delivery.estimatedArrival || 'TBD'}</span>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <PackageIcon className="size-12 text-slate-300 mx-auto mb-2" />
              <p className="text-slate-500 dark:text-slate-400 font-medium">No active deliveries</p>
              <Link to="/send" className="text-orange-600 text-sm font-bold mt-2 inline-block">Send your first package</Link>
            </div>
          )}
        </div>
      </div>

      {/* Live Status Map Section */}
      <div id="live-status-map" className="px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-slate-900 dark:text-slate-100 text-xl font-extrabold">Live Status</h3>
        </div>
        <div className="relative w-full h-72 rounded-2xl overflow-hidden shadow-inner bg-slate-200 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
          <Map 
            center={mapCenter} 
            zoom={12}
            autoBounds={true}
            markers={[
              ...activeDeliveries.map(d => ({
                position: [d.currentLat || 14.5995, d.currentLng || 120.9842] as [number, number],
                label: `Rider: ${d.trackingNumber}`,
                icon: RiderIcon
              })),
              ...activeDeliveries.filter(d => d.destLat && d.destLng).map(d => ({
                position: [d.destLat!, d.destLng!] as [number, number],
                label: `Destination: ${d.destination}`,
                icon: DestinationIcon
              }))
            ]}
            polylines={activeDeliveries.filter(d => d.destLat && d.destLng).map(d => ({
              positions: [
                [d.currentLat || 14.5995, d.currentLng || 120.9842],
                [d.destLat!, d.destLng!]
              ],
              color: '#ea580c'
            }))}
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-[90%] z-[1000] bg-white/95 dark:bg-slate-900/95 backdrop-blur px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-slate-100 dark:border-slate-800">
            <div className="size-8 rounded-full bg-green-500 flex items-center justify-center">
              <Truck className="text-white size-4 fill-current" />
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Status</p>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white">
                {selectedDelivery ? `${selectedDelivery.status} - ${selectedDelivery.trackingNumber}` : 'No active shipments'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
