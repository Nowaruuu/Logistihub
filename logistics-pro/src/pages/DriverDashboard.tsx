import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Delivery, Driver } from '../types';
import { deliveryService } from '../services/deliveryService';
import { getProfile } from '../lib/api';
import { 
  Truck, 
  MapPin, 
  Package, 
  ChevronRight, 
  Star, 
  ToggleLeft, 
  ToggleRight, 
  ClipboardList,
  Navigation,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Map, { RiderIcon, DestinationIcon } from '../components/Map';

export default function DriverDashboard() {
  const { user, profile } = useAuth();
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Delivery[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.5995, 120.9842]);
  const [isOnline, setIsOnline] = useState(true);

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      // Fetch available jobs
      const jobs = await deliveryService.getAvailableJobs();
      setAvailableJobs(jobs);

      // Fetch driver's active assignments
      const assigned = await deliveryService.getDriverDeliveries();
      setActiveAssignments(assigned);

      if (assigned.length > 0) {
        setMapCenter([assigned[0].currentLat || 14.5995, assigned[0].currentLng || 120.9842]);
      }

      // Fetch driver profile
      const prof = await getProfile();
      if (prof) {
        setDriverInfo({
          uid: user.uid,
          status: 'Available',
          vehicleType: prof.vehicle_type || 'Van',
          plateNumber: prof.plate_number || '',
          rating: prof.rating || 4.8,
          totalDeliveries: prof.total_deliveries || 0,
          verificationStatus: 'Verified'
        } as Driver);
      }
    } catch (err) {
      console.error('Failed to fetch driver data:', err);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const toggleOnline = () => {
    setIsOnline(!isOnline);
  };

  const handleAcceptJob = async (jobId: string) => {
    if (!user || !profile) return;
    try {
      await deliveryService.acceptJob(jobId);
      setActiveTab('active');
      fetchData(); // refresh immediately
    } catch (err) {
      console.error("Error accepting job:", err);
    }
  };

  const handleCompleteDelivery = async (deliveryId: string) => {
    try {
      await deliveryService.updateStatus(deliveryId, 'Delivered', 'Recipient Location');
      fetchData(); // refresh immediately
    } catch (err) {
      console.error("Error completing delivery:", err);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Driver Header Card */}
      <div className="px-6 pt-4">
        <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 text-white shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="size-14 rounded-2xl bg-orange-600 flex items-center justify-center">
                <Truck className="size-8" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{profile?.fullName}</h2>
                <p className="text-slate-400 text-xs font-medium">{driverInfo?.vehicleType} • {driverInfo?.plateNumber}</p>
              </div>
            </div>
            <button 
              onClick={toggleOnline}
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                !isOnline ? "text-slate-500" : "text-green-400"
              )}
            >
              {!isOnline ? <ToggleLeft className="size-8" /> : <ToggleRight className="size-8" />}
              <span className="text-[10px] font-bold uppercase">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-2xl p-4">
            <div className="text-center border-r border-white/10">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Rating</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="size-3 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-sm tracking-tight">{driverInfo?.rating || '0.0'}</span>
              </div>
            </div>
            <div className="text-center border-r border-white/10">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Deliveries</p>
              <p className="font-bold text-sm tracking-tight">{driverInfo?.totalDeliveries || '0'}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-slate-400 uppercase font-bold mb-1">Status</p>
              <p className="font-bold text-[10px] text-green-400 uppercase">{driverInfo?.verificationStatus}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('available')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              activeTab === 'available' ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" : "text-slate-500"
            )}
          >
            <ClipboardList className="size-4" />
            Available Jobs ({availableJobs.length})
          </button>
          <button 
            onClick={() => setActiveTab('active')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-bold transition-all",
              activeTab === 'active' ? "bg-white dark:bg-slate-700 text-orange-600 shadow-sm" : "text-slate-500"
            )}
          >
            <Navigation className="size-4" />
            Active ({activeAssignments.length})
          </button>
        </div>
      </div>

      {/* Map Preview for Active Assignment */}
      {activeTab === 'active' && activeAssignments.length > 0 && (
        <div className="px-6">
          <div className="relative w-full h-48 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
            <Map 
              center={mapCenter} 
              zoom={13}
              markers={activeAssignments.map(d => ({
                position: [d.currentLat || 14.5995, d.currentLng || 120.9842] as [number, number],
                label: `Delivery: ${d.trackingNumber}`,
                icon: RiderIcon
              }))}
            />
          </div>
        </div>
      )}

      {/* List Content */}
      <div className="px-6 space-y-4">
        {activeTab === 'available' ? (
          <>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-extrabold flex items-center gap-2">
              <Package className="size-5 text-orange-600" />
              Job Requests
            </h3>
            {availableJobs.map((job) => (
              <motion.div 
                key={job.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-xs font-bold text-orange-600 uppercase mb-1">{job.shippingMethod}</p>
                    <p className="text-base font-bold text-slate-900 dark:text-slate-100">#{job.trackingNumber}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-black text-slate-900 dark:text-white">₱{job.totalFee?.toFixed(2)}</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase">Estimated Earn</p>
                  </div>
                </div>

                <div className="space-y-3 mb-5">
                  <div className="flex items-start gap-3">
                    <div className="size-2 rounded-full bg-blue-500 mt-1.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Pickup</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.origin}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="size-2 rounded-full bg-orange-500 mt-1.5" />
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Drop-off</p>
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.destination}</p>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => handleAcceptJob(job.id)}
                  disabled={!isOnline}
                  className="w-full py-4 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all hover:brightness-110 disabled:opacity-50 disabled:grayscale"
                >
                  Accept Job
                </button>
              </motion.div>
            ))}
            {availableJobs.length === 0 && (
              <div className="text-center py-12">
                <Package className="size-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Searching for jobs...</p>
                <p className="text-xs text-slate-400 mt-1">New requests will appear here in real-time</p>
              </div>
            )}
          </>
        ) : (
          <>
            <h3 className="text-slate-900 dark:text-slate-100 text-lg font-extrabold flex items-center gap-2">
              <Navigation className="size-5 text-blue-600" />
              Active Assignments
            </h3>
            {activeAssignments.map((assignment) => (
              <motion.div 
                key={assignment.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30"
              >
                <div className="flex justify-between items-center mb-4">
                  <div className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-full">
                    <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{assignment.status}</p>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">#{assignment.trackingNumber}</p>
                </div>
                
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 mb-5 border border-slate-100 dark:border-slate-700 space-y-4">
                   <div className="flex items-center gap-3">
                     <MapPin className="size-5 text-slate-400" />
                     <div>
                       <p className="text-[10px] text-slate-400 font-bold uppercase">To Recipient</p>
                       <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{assignment.receiverName}</p>
                       <p className="text-xs text-slate-500">{assignment.destination}</p>
                     </div>
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button className="flex items-center justify-center gap-2 py-3 bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl border border-slate-200 dark:border-slate-600">
                    <Navigation className="size-4" />
                    Navigate
                  </button>
                  <button 
                    onClick={() => handleCompleteDelivery(assignment.id)}
                    className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all"
                  >
                    <CheckCircle2 className="size-4" />
                    Delivered
                  </button>
                </div>
              </motion.div>
            ))}
            {activeAssignments.length === 0 && (
              <div className="text-center py-12">
                <ClipboardList className="size-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">No active assignments</p>
                <p className="text-xs text-slate-400 mt-1">Accept a job from the Available tab to start</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
