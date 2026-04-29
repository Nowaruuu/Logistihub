import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Delivery } from '../types';
import { deliveryService } from '../services/deliveryService';
import { Truck, MapPin, Calendar, Package as PackageIcon, Check, Info, ChevronRight, Phone, MessageSquare, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import Map, { RiderIcon, DestinationIcon } from '../components/Map';

export default function TrackShipment() {
  const { trackingNumber } = useParams();
  const navigate = useNavigate();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!trackingNumber) return;

    const fetchDelivery = async () => {
      try {
        const result = await deliveryService.getDeliveryByTracking(trackingNumber);
        if (result?.shipment) {
          const s = result.shipment;
          const mapped: Delivery = {
            id: s.delivery_number,
            trackingNumber: s.delivery_number || trackingNumber,
            senderUid: s.sender_user_id?.toString() || '',
            senderName: s.client_name || '',
            receiverName: s.receiver_name || '',
            origin: s.pickup_location || '',
            destination: s.dropoff_location || '',
            status: s.status === 'In-Transit' ? 'In Transit' : (s.status === 'Pending' ? 'Processing' : s.status) as any,
            estimatedArrival: s.estimated_arrival,
            weight: s.weight,
            size: s.size || s.item_type_flag,
            shippingMethod: s.shipping_method,
            totalFee: s.total_fee,
            currentLat: s.pickup_lat || 14.5995,
            currentLng: s.pickup_lng || 120.9842,
            destLat: s.dropoff_lat,
            destLng: s.dropoff_lng,
            history: (result.history || []).map((h: any) => ({
              status: h.status,
              location: h.location || '',
              timestamp: h.created_at,
              description: h.description || ''
            })),
            createdAt: s.created_at || new Date().toISOString()
          };
          setDelivery(mapped);
        } else {
          setDelivery(null);
        }
      } catch {
        setDelivery(null);
      } finally {
        setLoading(false);
      }
    };

    fetchDelivery();
    const interval = setInterval(fetchDelivery, 15000);
    return () => clearInterval(interval);
  }, [trackingNumber]);

  if (loading) return <div className="flex items-center justify-center h-full bg-white dark:bg-slate-900"><div className="size-10 rounded-full border-4 border-orange-600 border-t-transparent animate-spin"></div></div>;
  if (!delivery) return <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-white dark:bg-slate-900">
    <PackageIcon className="size-16 text-slate-200 mb-4" />
    <h2 className="text-xl font-bold text-slate-900 dark:text-white">Shipment Not Found</h2>
    <p className="text-slate-500 mt-2">We couldn't find any shipment with tracking number {trackingNumber}</p>
    <button onClick={() => navigate('/')} className="mt-6 text-orange-600 font-bold">Back to Home</button>
  </div>;

  const statusSteps = [
    { status: 'Processing', icon: PackageIcon },
    { status: 'In Transit', icon: Truck },
    { status: 'Out for Delivery', icon: Truck },
    { status: 'Delivered', icon: Check },
  ];

  const currentStatusIndex = statusSteps.findIndex(s => s.status === delivery.status);

  // Default coordinates if not provided (Manila)
  const mapCenter: [number, number] = [
    delivery.currentLat || 14.5995,
    delivery.currentLng || 120.9842
  ];

  return (
    <div className="flex flex-col min-h-full">
      <header className="flex items-center p-4 sticky top-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md z-20 border-b border-slate-100 dark:border-slate-800">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
          <ArrowLeft className="text-slate-700 dark:text-slate-300 size-6" />
        </button>
        <h1 className="text-lg font-bold flex-1 text-center pr-10">Track Shipment</h1>
      </header>

      <div className="px-5 pt-6 pb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{delivery.shippingMethod}</p>
            <h2 className="text-2xl font-black text-slate-800 dark:text-white">{delivery.trackingNumber}</h2>
          </div>
          <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm shadow-orange-600/30">
            {delivery.status.toUpperCase()}
          </div>
        </div>
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <Calendar className="size-3" />
          Estimated arrival: <span className="font-semibold text-slate-700 dark:text-slate-300">{delivery.estimatedArrival}</span>
        </p>
      </div>

      <div className="px-5 mb-8">
        <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800 group">
          <Map 
            center={mapCenter} 
            zoom={14}
            autoBounds={true}
            markers={[
              { 
                position: mapCenter, 
                label: `Rider: ${delivery.trackingNumber}`,
                icon: RiderIcon
              },
              ...(delivery.destLat && delivery.destLng ? [{
                position: [delivery.destLat, delivery.destLng] as [number, number],
                label: `Destination: ${delivery.destination}`,
                icon: DestinationIcon
              }] : [])
            ]}
            polylines={delivery.destLat && delivery.destLng ? [{
              positions: [
                mapCenter,
                [delivery.destLat, delivery.destLng]
              ],
              color: '#ea580c'
            }] : []}
          />
          <div className="absolute top-3 left-3 z-[1000] bg-white/90 dark:bg-slate-800/90 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold shadow-sm border border-slate-200/50 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
            {delivery.origin}
          </div>
        </div>
      </div>

      <div className="px-5 mb-8">
        <div className="bg-slate-50 dark:bg-slate-800/40 p-5 rounded-2xl border border-slate-100 dark:border-slate-800">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs font-bold text-slate-500 uppercase">Delivery Progress</span>
            <span className="text-sm font-black text-orange-600">{((currentStatusIndex + 1) / statusSteps.length * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
            <div 
              className="bg-orange-600 h-full rounded-full shadow-[0_0_10px_rgba(236,91,19,0.3)] transition-all duration-1000" 
              style={{ width: `${((currentStatusIndex + 1) / statusSteps.length * 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-3">
            {statusSteps.map((step, i) => (
              <div key={step.status} className="text-center">
                <p className={cn("text-[9px] font-bold uppercase", i <= currentStatusIndex ? "text-orange-600" : "text-slate-400")}>
                  {step.status === 'Processing' ? 'Picked Up' : step.status === 'Delivered' ? 'Arrival' : step.status}
                </p>
                <p className={cn("text-[10px] font-medium", i <= currentStatusIndex ? "text-orange-600" : "text-slate-400")}>
                  {i === currentStatusIndex ? 'Live' : ''}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-5 mb-8">
        <h3 className="font-black text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
          Tracking History
          <span className="w-1.5 h-1.5 bg-orange-600 rounded-full"></span>
        </h3>
        <div className="space-y-0 relative">
          <div className="absolute left-4 top-4 bottom-4 w-[2px] bg-slate-100 dark:bg-slate-800 z-0"></div>
          
          {delivery.history.slice().reverse().map((item, i) => (
            <div key={i} className="flex gap-6 relative z-10">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-white shrink-0 shadow-lg",
                i === 0 ? "bg-orange-600 shadow-orange-600/20 scale-110 ring-4 ring-orange-600/5" : "bg-green-500 shadow-green-500/20"
              )}>
                {i === 0 ? <Truck className="size-4 fill-current" /> : <Check className="size-4" />}
              </div>
              <div className="pb-8">
                {i === 0 && <div className="inline-block bg-orange-600/10 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded mb-1">CURRENT STATUS</div>}
                <p className={cn("font-bold text-sm", i === 0 ? "text-orange-600" : "text-slate-800 dark:text-slate-200")}>{item.status}</p>
                <p className="text-xs text-slate-500 mt-0.5">{item.location} • {new Date(item.timestamp).toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="px-5 pb-24">
        <div className="bg-slate-900 text-white dark:bg-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-orange-600/10 rounded-full blur-2xl"></div>
          <h3 className="font-bold text-xs uppercase tracking-widest mb-5 text-slate-400 border-b border-white/10 pb-3">Shipment Information</h3>
          <div className="grid grid-cols-2 gap-y-6 gap-x-4">
            <div>
              <p className="text-[9px] text-orange-600 font-black uppercase tracking-tighter mb-1">From</p>
              <p className="text-sm font-bold truncate">{delivery.senderName}</p>
              <p className="text-[10px] text-slate-400">{delivery.origin}</p>
            </div>
            <div>
              <p className="text-[9px] text-orange-600 font-black uppercase tracking-tighter mb-1">To</p>
              <p className="text-sm font-bold truncate">{delivery.receiverName || 'Recipient'}</p>
              <p className="text-[10px] text-slate-400">{delivery.destination}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Total Fee</p>
              <p className="text-lg font-black text-white">₱ {delivery.totalFee?.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-1">Weight</p>
              <p className="text-sm font-bold">{delivery.weight} kg</p>
            </div>
          </div>
          <button className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 transition-colors rounded-xl text-xs font-bold border border-white/5 flex items-center justify-center gap-2">
            <MessageSquare className="size-4" />
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
}
