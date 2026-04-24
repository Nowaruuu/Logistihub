import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Navigation, Truck, Bolt, ArrowRight, Info, Map as MapIcon } from 'lucide-react';
import { cn } from '../lib/utils';
import Map, { DestinationIcon } from '../components/Map';
import { deliveryService } from '../services/deliveryService';

export default function SendPackage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('72nd St, BGC, Taguig');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>([14.5489, 121.0486]);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [weight, setWeight] = useState('');
  const [size, setSize] = useState('Small (Box)');
  const [method, setMethod] = useState<'standard' | 'express'>('standard');
  const [loading, setLoading] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showPickupMap, setShowPickupMap] = useState(false);

  const handleConfirm = async () => {
    if (!user || !destination) return;
    setLoading(true);
    try {
      // Use picked coordinates or fallback to mock
      const finalOriginLat = pickupCoords ? pickupCoords[0] : 14.5489;
      const finalOriginLng = pickupCoords ? pickupCoords[1] : 121.0486;
      const finalDestLat = destCoords ? destCoords[0] : 14.5 + Math.random() * 0.2;
      const finalDestLng = destCoords ? destCoords[1] : 120.9 + Math.random() * 0.2;

      await deliveryService.createDelivery({
        senderUid: user.uid,
        senderName: profile?.fullName || user.email,
        origin: pickup,
        destination,
        estimatedArrival: method === 'standard' ? '3-5 business days' : 'Tomorrow, before 5 PM',
        weight: parseFloat(weight) || 0,
        size,
        shippingMethod: method === 'standard' ? 'Standard Delivery' : 'Express Delivery',
        totalFee: method === 'standard' ? 750 : 1440,
        originLat: finalOriginLat,
        originLng: finalOriginLng,
        destLat: finalDestLat,
        destLng: finalDestLng,
      });

      navigate('/packages');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setDestCoords([lat, lng]);
  };

  const handlePickupMapClick = (lat: number, lng: number) => {
    setPickupCoords([lat, lng]);
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Step Indicator */}
      <div className="flex w-full flex-row items-center justify-center gap-2.5 py-5 bg-white dark:bg-slate-900 border-b border-slate-50 dark:border-slate-800/50">
        <div className="h-1.5 w-8 rounded-full bg-orange-600 shadow-sm shadow-orange-600/30"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
        <div className="h-1.5 w-1.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
      </div>

      <div className="px-5 pt-7 pb-4">
        <h2 className="text-2xl font-extrabold tracking-tight mb-1 text-slate-900 dark:text-white">Package Details</h2>
        <p className="text-[15px] text-slate-500 dark:text-slate-400">Where and what are you sending today?</p>
      </div>

      <section className="px-5 space-y-5">
        <div className="group">
          <div className="flex items-center justify-between mb-2 ml-1">
            <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Pickup Address</label>
            <button 
              type="button"
              onClick={() => setShowPickupMap(!showPickupMap)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all",
                showPickupMap ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}
            >
              <MapIcon className="size-3" />
              {showPickupMap ? 'Hide Map' : 'Pin on Map'}
            </button>
          </div>
          <div className="relative flex items-center mb-3">
            <MapPin className="absolute left-4 text-orange-600 size-5" />
            <input 
              type="text"
              value={pickup}
              onChange={(e) => setPickup(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
              placeholder="House no, Street, City" 
            />
          </div>

          {showPickupMap && (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-orange-600/20 shadow-inner mb-4">
              <Map 
                center={pickupCoords || [14.5489, 121.0486]} 
                zoom={14}
                onClick={handlePickupMapClick}
                markers={pickupCoords ? [{
                  position: pickupCoords,
                  label: 'Pickup Pin',
                  icon: DestinationIcon
                }] : []}
              />
              <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="size-2 bg-orange-600 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {pickupCoords ? 'Pickup location pinned!' : 'Tap anywhere to pin exact pickup location'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="group">
          <div className="flex items-center justify-between mb-2 ml-1">
            <label className="block text-[13px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Destination Address</label>
            <button 
              type="button"
              onClick={() => setShowMap(!showMap)}
              className={cn(
                "flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full transition-all",
                showMap ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-500"
              )}
            >
              <MapIcon className="size-3" />
              {showMap ? 'Hide Map' : 'Pin on Map'}
            </button>
          </div>
          <div className="relative flex items-center mb-3">
            <Navigation className="absolute left-4 text-slate-400 size-5" />
            <input 
              type="text"
              required
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
              placeholder="Receiver's address" 
            />
          </div>

          {showMap && (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-orange-600/20 shadow-inner mb-4">
              <Map 
                center={destCoords || [14.5489, 121.0486]} 
                zoom={14}
                onClick={handleMapClick}
                markers={destCoords ? [{
                  position: destCoords,
                  label: 'Delivery Pin',
                  icon: DestinationIcon
                }] : []}
              />
              <div className="absolute top-3 left-3 right-3 z-[1000] pointer-events-none">
                <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-xl shadow-lg border border-slate-100 dark:border-slate-800 flex items-center gap-2">
                  <div className="size-2 bg-orange-600 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-slate-600 dark:text-slate-300">
                    {destCoords ? 'Location pinned!' : 'Tap anywhere to pin exact location'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="mt-10 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Specifications</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 ml-1">Weight</label>
            <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 overflow-hidden focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all">
              <input 
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="flex-1 px-4 py-4 bg-transparent border-none focus:ring-0 outline-none text-[15px] font-medium text-slate-900 dark:text-slate-100" 
                placeholder="0.0" 
              />
              <span className="pr-4 text-slate-400 font-bold text-xs uppercase tracking-widest">KG</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 ml-1">Size</label>
            <div className="relative">
              <select 
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className="w-full px-4 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none appearance-none text-[15px] font-medium transition-all cursor-pointer text-slate-900 dark:text-slate-100"
              >
                <option>Small (Box)</option>
                <option>Medium (Crate)</option>
                <option>Large (Pallet)</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 px-5">
        <h3 className="text-[13px] font-bold mb-4 uppercase tracking-wider text-slate-500 dark:text-slate-400">Shipping Method</h3>
        <div className="space-y-4">
          <button 
            onClick={() => setMethod('standard')}
            className={cn(
              "w-full flex items-center p-4 rounded-2xl border-2 transition-all duration-200 text-left",
              method === 'standard' ? "border-orange-600 bg-orange-600/5" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200"
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", method === 'standard' ? "bg-orange-600/10 text-orange-600" : "bg-slate-100 dark:bg-slate-700 text-slate-400")}>
                  <Truck className="size-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Standard Delivery</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">3-5 business days</p>
                </div>
              </div>
            </div>
            <div className="text-right flex flex-col items-end gap-1">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">₱750.00</span>
              <div className="bg-orange-600/10 text-orange-600 text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wide">Best Value</div>
            </div>
          </button>

          <button 
            onClick={() => setMethod('express')}
            className={cn(
              "w-full flex items-center p-4 rounded-2xl border-2 transition-all duration-200 text-left",
              method === 'express' ? "border-orange-600 bg-orange-600/5" : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 hover:border-slate-200"
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", method === 'express' ? "bg-orange-600/10 text-orange-600" : "bg-slate-100 dark:bg-slate-700 text-slate-400")}>
                  <Bolt className="size-5" />
                </div>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Express Delivery</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Next day before 5 PM</p>
                </div>
              </div>
            </div>
            <div className="text-right">
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">₱1,440.00</span>
            </div>
          </button>
        </div>
      </section>

      <footer className="p-5 mt-auto border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl sticky bottom-0 z-20">
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex flex-col">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Estimated Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₱{method === 'standard' ? '750.00' : '1,440.00'}</span>
          </div>
          <div className="text-[11px] text-right font-medium text-slate-400 dark:text-slate-500">
            Includes taxes & fees
          </div>
        </div>
        <button 
          onClick={handleConfirm}
          disabled={loading || !destination}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-600/25 transition-all active:scale-[0.97] flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          <span>{loading ? 'Processing...' : 'Review & Confirm'}</span>
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
        </button>
      </footer>
    </div>
  );
}
