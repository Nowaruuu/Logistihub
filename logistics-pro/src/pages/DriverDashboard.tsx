import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Delivery, Driver } from '../types';
import { deliveryService } from '../services/deliveryService';
import { getProfile, getChatContact, declineDelivery, updateDriverLocation } from '../lib/api';
import DeliveryChat from '../components/DeliveryChat';
import { 
  Truck, 
  MapPin, 
  Package, 
  Star, 
  ToggleLeft, 
  ToggleRight, 
  ClipboardList,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Camera,
  X,
  Loader2,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import Map, { RiderIcon } from '../components/Map';

export default function DriverDashboard() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [driverInfo, setDriverInfo] = useState<Driver | null>(null);
  const [availableJobs, setAvailableJobs] = useState<Delivery[]>([]);
  const [activeAssignments, setActiveAssignments] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState<'available' | 'active'>('available');
  const [mapCenter, setMapCenter] = useState<[number, number]>([14.5995, 120.9842]);
  const [isOnline, setIsOnline] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [completing, setCompleting] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState<string | null>(null);
  const [proofPhoto, setProofPhoto] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showChat, setShowChat] = useState<string | null>(null);

  const hasActiveJob = activeAssignments.length > 0;

  const fetchData = useCallback(async () => {
    if (!user) return;
    try {
      const jobs = await deliveryService.getAvailableJobs();
      setAvailableJobs(jobs);

      const assigned = await deliveryService.getDriverDeliveries();
      setActiveAssignments(assigned);

      // Auto-switch to Active tab when driver has an active delivery
      if (assigned.length > 0) {
        setActiveTab('active');
        const first = assigned[0];
        setMapCenter([first.currentLat || 14.5995, first.currentLng || 120.9842]);
      }

      const prof = await getProfile();
      if (prof) {
        setDriverInfo({
          uid: user.uid,
          status: 'Available',
          vehicleType: prof.vehicle_type || 'Van',
          plateNumber: prof.plate_number || '',
          rating: prof.rating ?? 0,
          totalDeliveries: prof.total_deliveries ?? 0,
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

  // ── Background GPS tracking: send driver location for active deliveries ──
  const gpsWatchRef = useRef<number | null>(null);
  const latestGPS = useRef<[number, number] | null>(null);

  useEffect(() => {
    // Only track GPS when driver has active (In-Transit / Out for Delivery) assignments
    const trackable = activeAssignments.filter(a =>
      ['In Transit', 'In-Transit', 'Out for Delivery'].includes(a.status)
    );
    if (trackable.length === 0) {
      // No active assignments — stop GPS
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
        gpsWatchRef.current = null;
      }
      return;
    }

    // Start watching GPS if not already
    if (gpsWatchRef.current === null && navigator.geolocation) {
      gpsWatchRef.current = navigator.geolocation.watchPosition(
        (pos) => { latestGPS.current = [pos.coords.latitude, pos.coords.longitude]; },
        () => {},
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }

    // Upload GPS every 10 seconds for each trackable delivery
    const uploadInterval = setInterval(() => {
      if (!latestGPS.current) return;
      const [lat, lng] = latestGPS.current;
      trackable.forEach(a => {
        updateDriverLocation(a.trackingNumber, lat, lng);
      });
    }, 10_000);

    return () => {
      clearInterval(uploadInterval);
      // Don't clear the watch here — we'll clear it when trackable becomes empty
    };
  }, [activeAssignments]);

  // Cleanup GPS watch on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  const handleAcceptJob = async (jobId: string) => {
    if (!user || !profile || hasActiveJob) return;
    setAccepting(jobId);
    try {
      await deliveryService.acceptJob(jobId);
      setActiveTab('active');
      await fetchData();
    } catch (err) {
      console.error('Error accepting job:', err);
    } finally {
      setAccepting(null);
    }
  };

  const handleDeclineJob = async (trackingNumber: string) => {
    const reason = prompt('Reason for declining (optional):');
    if (reason === null) return; // user cancelled the prompt
    try {
      await declineDelivery(trackingNumber, reason);
      await fetchData();
    } catch (err: any) {
      alert(err.message || 'Failed to decline');
    }
  };

  const handleCapturePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX) { h = (h * MAX) / w; w = MAX; }
        canvas.width = w; canvas.height = h;
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h);
        setProofPhoto(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteDelivery = async (deliveryId: string, photo?: string | null) => {
    setCompleting(deliveryId);
    setShowProofModal(null);
    try {
      await deliveryService.updateStatus(deliveryId, 'Delivered', 'Recipient Location', photo || undefined);
      await fetchData();
    } catch (err) {
      console.error('Error completing delivery:', err);
    } finally {
      setCompleting(null);
      setProofPhoto(null);
    }
  };

  return (
    <div className="space-y-5 pb-28">

      {/* Driver Header Card */}
      <div className="px-5 pt-3">
        <div className="bg-slate-900 dark:bg-slate-800 rounded-3xl p-5 text-white shadow-xl">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="size-12 rounded-2xl bg-orange-600 flex items-center justify-center flex-shrink-0">
                <Truck className="size-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{profile?.fullName}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={cn(
                    'text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full',
                    hasActiveJob ? 'bg-blue-500/20 text-blue-400' : isOnline ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                  )}>
                    {hasActiveJob ? '● On Delivery' : isOnline ? '● Online' : '○ Offline'}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOnline(!isOnline)}
              disabled={hasActiveJob}
              className={cn(
                'flex flex-col items-center gap-1 transition-all',
                hasActiveJob ? 'opacity-40 cursor-not-allowed' : !isOnline ? 'text-slate-500' : 'text-green-400'
              )}
            >
              {!isOnline ? <ToggleLeft className="size-8" /> : <ToggleRight className="size-8" />}
              <span className="text-[9px] font-bold uppercase">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-white/5 rounded-2xl p-3">
            <div className="text-center border-r border-white/10">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Rating</p>
              <div className="flex items-center justify-center gap-1">
                <Star className="size-3 text-yellow-400 fill-yellow-400" />
                <span className="font-bold text-sm">{driverInfo?.rating ? driverInfo.rating.toFixed(1) : 'New'}</span>
              </div>
            </div>
            <div className="text-center border-r border-white/10">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Deliveries</p>
              <p className="font-bold text-sm">{driverInfo?.totalDeliveries ?? '—'}</p>
            </div>
            <div className="text-center">
              <p className="text-[9px] text-slate-400 uppercase font-bold mb-1">Today</p>
              <p className="font-bold text-sm text-orange-400">{activeAssignments.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Single-task notice */}
      <AnimatePresence>
        {hasActiveJob && activeTab === 'available' && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-5 flex items-start gap-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20"
          >
            <AlertTriangle className="size-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-amber-400">You have an active delivery</p>
              <p className="text-xs text-amber-500/70 mt-0.5">Complete your current job before accepting a new one.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="px-5">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('available')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
              activeTab === 'available' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500'
            )}
          >
            <ClipboardList className="size-4" />
            Available ({availableJobs.length})
          </button>
          <button
            onClick={() => setActiveTab('active')}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all',
              activeTab === 'active' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500'
            )}
          >
            <Navigation className="size-4" />
            Active {hasActiveJob && <span className="size-5 rounded-full bg-orange-600 text-white text-[10px] flex items-center justify-center font-black">{activeAssignments.length}</span>}
          </button>
        </div>
      </div>

      {/* Map (only in Active tab when there's a delivery) */}
      {activeTab === 'active' && activeAssignments.length > 0 && (
        <div className="px-5">
          <div className="relative w-full h-44 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
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

      {/* Tab Content */}
      <div className="px-5 space-y-4">
        {activeTab === 'available' ? (
          <>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-extrabold flex items-center gap-2">
              <Package className="size-4 text-orange-600" />
              Job Requests
            </h3>

            {availableJobs.length === 0 ? (
              <div className="text-center py-14 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <Package className="size-14 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No available jobs right now</p>
                <p className="text-xs text-slate-400 mt-1">New requests will appear here in real-time</p>
              </div>
            ) : (
              availableJobs.map((job) => (
                <motion.div
                  key={job.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700/50"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="text-xs font-bold text-orange-600 uppercase mb-1">{job.shippingMethod || 'Standard'}</p>
                      <p className="text-base font-bold text-slate-900 dark:text-slate-100">#{job.trackingNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 dark:text-white">₱{Number(job.totalFee || 0).toFixed(2)}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase">Est. Earn</p>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-5">
                    <div className="flex items-start gap-3">
                      <div className="size-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Pickup</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.origin}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="size-2 rounded-full bg-orange-500 mt-1.5 flex-shrink-0" />
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Drop-off</p>
                        <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{job.destination}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => handleDeclineJob(job.trackingNumber)}
                      disabled={!isOnline || hasActiveJob || accepting === job.id}
                      className="py-3.5 font-bold rounded-xl transition-all active:scale-[0.98] text-sm bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:bg-red-50 hover:text-red-500 hover:border-red-200 dark:hover:bg-red-950/20 dark:hover:text-red-400 dark:hover:border-red-900/40 disabled:opacity-40"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleAcceptJob(job.id)}
                      disabled={!isOnline || hasActiveJob || accepting === job.id}
                      className={cn(
                        'py-3.5 font-bold rounded-xl transition-all active:scale-[0.98] text-sm',
                        hasActiveJob
                          ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                          : 'bg-orange-600 text-white shadow-lg shadow-orange-600/20 hover:brightness-110 disabled:opacity-50 disabled:grayscale'
                      )}
                    >
                      {accepting === job.id ? 'Accepting...' : hasActiveJob ? 'Busy' : 'Accept'}
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </>
        ) : (
          <>
            <h3 className="text-slate-900 dark:text-slate-100 text-base font-extrabold flex items-center gap-2">
              <Navigation className="size-4 text-blue-600" />
              Active Assignment
            </h3>

            {activeAssignments.length === 0 ? (
              <div className="text-center py-14 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                <ClipboardList className="size-14 text-slate-200 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-slate-400 font-medium">No active assignment</p>
                <p className="text-xs text-slate-400 mt-1">Accept a job from the Available tab to start</p>
              </div>
            ) : (
              activeAssignments.map((assignment) => (
                <motion.div
                  key={assignment.id}
                  layout
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white dark:bg-slate-800 rounded-2xl border border-blue-100 dark:border-blue-900/30 overflow-hidden shadow-sm"
                >
                  {/* Status bar */}
                  <div className="flex items-center justify-between px-5 py-3 bg-blue-600/5 border-b border-blue-100 dark:border-blue-900/30">
                    <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-wider">
                      {assignment.status}
                    </span>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">#{assignment.trackingNumber}</p>
                  </div>

                  {/* Recipient info */}
                  <div className="p-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="size-9 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                        <MapPin className="size-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">To Recipient</p>
                        <p className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">{assignment.receiverName}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{assignment.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="grid grid-cols-2 gap-3 px-5 pb-3">
                    <button
                      onClick={() => navigate('/driver/navigate', {
                        state: {
                          job: {
                            id: assignment.id,
                            trackingNumber: assignment.trackingNumber,
                            receiverName: assignment.receiverName,
                            receiverPhone: (assignment as any).receiverPhone,
                            destination: assignment.destination,
                            destLat: assignment.destLat,
                            destLng: assignment.destLng,
                            origin: assignment.origin,
                            status: assignment.status,
                          }
                        }
                      })}
                      className="flex items-center justify-center gap-2 py-3.5 bg-slate-900 dark:bg-slate-700 text-white font-bold rounded-xl active:scale-[0.98] transition-all shadow-sm"
                    >
                      <ExternalLink className="size-4" />
                      Navigate
                    </button>
                    {(assignment.status === 'Pending' || assignment.status === 'Processing') ? (
                      <button
                        onClick={async () => {
                          setCompleting(assignment.id);
                          try {
                            await deliveryService.updateStatus(assignment.trackingNumber, 'In-Transit', 'Starting pickup');
                            await fetchData();
                          } catch (err) { console.error(err); }
                          finally { setCompleting(null); }
                        }}
                        disabled={completing === assignment.id}
                        className="flex items-center justify-center gap-2 py-3.5 bg-orange-600 text-white font-bold rounded-xl shadow-lg shadow-orange-600/20 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {completing === assignment.id ? (
                          <><Loader2 className="size-4 animate-spin" /> Starting...</>
                        ) : (
                          <><Truck className="size-4" /> Start Pickup</>
                        )}
                      </button>
                    ) : assignment.status === 'In Transit' ? (
                      <button
                        onClick={async () => {
                          setCompleting(assignment.id);
                          try {
                            await deliveryService.updateStatus(assignment.trackingNumber, 'Out for Delivery', 'Pickup Location');
                            await fetchData();
                          } catch (err) { console.error(err); }
                          finally { setCompleting(null); }
                        }}
                        disabled={completing === assignment.id}
                        className="flex items-center justify-center gap-2 py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {completing === assignment.id ? (
                          <><Loader2 className="size-4 animate-spin" /> Updating...</>
                        ) : (
                          <><Package className="size-4" /> Picked Up</>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setProofPhoto(null); setShowProofModal(assignment.id); }}
                        disabled={completing === assignment.id}
                        className="flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-600/20 active:scale-[0.98] transition-all disabled:opacity-60"
                      >
                        {completing === assignment.id ? (
                          <><Loader2 className="size-4 animate-spin" /> Updating...</>
                        ) : (
                          <><CheckCircle2 className="size-4" /> Delivered</>
                        )}
                      </button>
                    )}
                  </div>
                  {/* Chat & Call customer */}
                  <div className="grid grid-cols-2 gap-3 px-5 pb-5">
                    <button
                      onClick={() => setShowChat(assignment.trackingNumber)}
                      className="flex items-center justify-center gap-2 py-3 bg-orange-50 dark:bg-orange-950/20 text-orange-600 border border-orange-200 dark:border-orange-900/40 font-bold text-xs rounded-xl active:scale-[0.98] transition-all"
                    >
                      <MessageCircle className="size-4" />
                      Chat Customer
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const c = await getChatContact(assignment.trackingNumber);
                          if (c.phone) window.location.href = `tel:${c.phone}`;
                          else alert('Customer phone number is not available.');
                        } catch { alert('Unable to get contact info.'); }
                      }}
                      className="flex items-center justify-center gap-2 py-3 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 border border-emerald-200 dark:border-emerald-900/40 font-bold text-xs rounded-xl active:scale-[0.98] transition-all"
                    >
                      <Phone className="size-4" />
                      Call Customer
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </>
        )}
      </div>

      {/* ── Proof of Delivery Modal ── */}
      {showProofModal && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-700/50 p-6 pb-8">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-slate-900 dark:text-white font-extrabold text-lg">Proof of Delivery</h3>
              <button onClick={() => setShowProofModal(null)} className="size-8 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center">
                <X className="size-4 text-slate-500 dark:text-white" />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleCapturePhoto}
              className="hidden"
            />

            {proofPhoto ? (
              <div className="relative mb-4">
                <img src={proofPhoto} alt="Proof" className="w-full h-48 object-cover rounded-2xl border border-slate-200 dark:border-slate-700" />
                <button
                  onClick={() => { setProofPhoto(null); fileInputRef.current?.click(); }}
                  className="absolute top-2 right-2 px-3 py-1.5 bg-black/60 backdrop-blur text-white text-xs font-bold rounded-full flex items-center gap-1"
                >
                  <Camera className="size-3" /> Retake
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full h-48 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-2xl flex flex-col items-center justify-center gap-3 mb-4 active:bg-slate-50 dark:active:bg-slate-800 transition-colors"
              >
                <div className="size-14 rounded-full bg-orange-600/10 flex items-center justify-center">
                  <Camera className="size-7 text-orange-500" />
                </div>
                <div className="text-center">
                  <p className="text-slate-900 dark:text-white font-bold text-sm">Take Photo</p>
                  <p className="text-slate-400 text-xs mt-0.5">Capture proof of delivery</p>
                </div>
              </button>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => handleCompleteDelivery(showProofModal, proofPhoto)}
                disabled={!proofPhoto}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-green-600 text-white font-bold text-sm rounded-xl disabled:opacity-40 active:scale-[0.98] transition-all"
              >
                <CheckCircle2 className="size-4" /> Confirm Delivery
              </button>
              <button
                onClick={() => { setProofPhoto(null); handleCompleteDelivery(showProofModal); }}
                className="px-4 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs rounded-xl active:scale-[0.98] transition-all"
              >
                Skip
              </button>
            </div>
            <p className="text-slate-400 text-[10px] text-center mt-3">Photo helps verify delivery was completed successfully</p>
          </div>
        </div>
      )}

      {/* Chat overlay */}
      {showChat && (
        <DeliveryChat deliveryNumber={showChat} onClose={() => setShowChat(null)} />
      )}
    </div>
  );
}
