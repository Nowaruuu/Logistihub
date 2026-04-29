import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { MapPin, Navigation, Truck, Bolt, ArrowRight, Info, Map as MapIcon, User, Phone, Package, Car, UtensilsCrossed, FileText, Boxes, Search, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import Map, { DestinationIcon } from '../components/Map';
import { deliveryService } from '../services/deliveryService';
import { createCheckout } from '../lib/api';

// Category types matching database item_type_flag
const PACKAGE_CATEGORIES = [
  { id: 'PACKAGE', label: 'Standard Package', icon: Package, desc: 'Boxes, parcels, envelopes' },
  { id: 'VEHICLE', label: 'Vehicle', icon: Car, desc: 'Cars, motorcycles, heavy equipment' },
  { id: 'FOOD', label: 'Food', icon: UtensilsCrossed, desc: 'Perishable goods, catering' },
  { id: 'DOC', label: 'Document', icon: FileText, desc: 'Legal papers, contracts, IDs' },
  { id: 'BULK', label: 'Bulk Freight', icon: Boxes, desc: 'Pallets, wholesale cargo' },
] as const;

// Nominatim address search (free, no API key)
async function searchAddress(query: string): Promise<Array<{ display_name: string; lat: string; lon: string }>> {
  if (!query || query.length < 3) return [];
  const res = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ph&limit=5`,
    { headers: { 'Accept-Language': 'en' } }
  );
  return res.json();
}

export default function SendPackage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('');
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>([14.5489, 121.0486]);
  const [destination, setDestination] = useState('');
  const [destCoords, setDestCoords] = useState<[number, number] | null>(null);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [weight, setWeight] = useState('');
  const [category, setCategory] = useState('PACKAGE');
  const [method, setMethod] = useState<'standard' | 'express'>('standard');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [showMap, setShowMap] = useState(false);
  const [showPickupMap, setShowPickupMap] = useState(false);

  // Address search state
  const [pickupResults, setPickupResults] = useState<any[]>([]);
  const [destResults, setDestResults] = useState<any[]>([]);
  const [searchingPickup, setSearchingPickup] = useState(false);
  const [searchingDest, setSearchingDest] = useState(false);
  const pickupTimer = useRef<ReturnType<typeof setTimeout>>();
  const destTimer = useRef<ReturnType<typeof setTimeout>>();

  // Calculate distance in km using Haversine
  function calcDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }

  // Dynamic pricing: Base ₱50 + ₱15/km + ₱8/kg. Express = 1.8x. Category surcharge for Vehicle/Bulk.
  const distKm = (pickupCoords && destCoords) ? calcDistanceKm(pickupCoords[0], pickupCoords[1], destCoords[0], destCoords[1]) : 0;
  const weightKg = parseFloat(weight) || 1;
  const categorySurcharge = category === 'VEHICLE' ? 500 : category === 'BULK' ? 300 : category === 'FOOD' ? 50 : 0;
  const baseFee = 50 + (distKm * 15) + (weightKg * 8) + categorySurcharge;
  const totalFee = Math.round(method === 'standard' ? baseFee : baseFee * 1.8);

  // Debounced address search for pickup
  const handlePickupChange = (val: string) => {
    setPickup(val);
    if (pickupTimer.current) clearTimeout(pickupTimer.current);
    if (val.length >= 3) {
      setSearchingPickup(true);
      pickupTimer.current = setTimeout(async () => {
        const results = await searchAddress(val);
        setPickupResults(results);
        setSearchingPickup(false);
      }, 500);
    } else {
      setPickupResults([]);
      setSearchingPickup(false);
    }
  };

  // Debounced address search for destination
  const handleDestChange = (val: string) => {
    setDestination(val);
    if (destTimer.current) clearTimeout(destTimer.current);
    if (val.length >= 3) {
      setSearchingDest(true);
      destTimer.current = setTimeout(async () => {
        const results = await searchAddress(val);
        setDestResults(results);
        setSearchingDest(false);
      }, 500);
    } else {
      setDestResults([]);
      setSearchingDest(false);
    }
  };

  const selectPickup = (result: any) => {
    setPickup(result.display_name);
    setPickupCoords([parseFloat(result.lat), parseFloat(result.lon)]);
    setPickupResults([]);
    setShowPickupMap(true);
  };

  const selectDest = (result: any) => {
    setDestination(result.display_name);
    setDestCoords([parseFloat(result.lat), parseFloat(result.lon)]);
    setDestResults([]);
    setShowMap(true);
  };

  const handleConfirm = async () => {
    if (!user || !destination || !pickup) return;
    setLoading(true);
    setError('');
    try {
      const finalOriginLat = pickupCoords ? pickupCoords[0] : 14.5489;
      const finalOriginLng = pickupCoords ? pickupCoords[1] : 121.0486;
      const finalDestLat = destCoords ? destCoords[0] : 14.5 + Math.random() * 0.2;
      const finalDestLng = destCoords ? destCoords[1] : 120.9 + Math.random() * 0.2;

      const deliveryNumber = await deliveryService.createDelivery({
        senderUid: user.uid,
        senderName: profile?.fullName || user.email,
        receiverName,
        receiverPhone,
        origin: pickup,
        destination,
        estimatedArrival: method === 'standard' ? '3-5 business days' : 'Tomorrow, before 5 PM',
        weight: parseFloat(weight) || 0,
        size: PACKAGE_CATEGORIES.find(c => c.id === category)?.label || 'Standard Package',
        shippingMethod: method === 'standard' ? 'Standard Delivery' : 'Express Delivery',
        totalFee,
        originLat: finalOriginLat,
        originLng: finalOriginLng,
        destLat: finalDestLat,
        destLng: finalDestLng,
        item_type_flag: category,
      });

      // Show success state
      setSubmitted(true);

      // Redirect to PayMongo checkout for payment
      try {
        const checkout = await createCheckout(deliveryNumber, totalFee, `Shipping: ${pickup} → ${destination}`);
        if (checkout.checkout_url) {
          window.open(checkout.checkout_url, '_blank');
        }
      } catch (payErr) {
        console.warn('Payment checkout skipped:', payErr);
      }

      // Navigate after 3 seconds
      setTimeout(() => navigate('/packages'), 3000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create shipment');
      setLoading(false);
    }
  };

  const handleMapClick = (lat: number, lng: number) => {
    setDestCoords([lat, lng]);
  };

  const handlePickupMapClick = (lat: number, lng: number) => {
    setPickupCoords([lat, lng]);
  };

  // ── Submitted Success Screen ──
  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-8 py-20 text-center bg-white dark:bg-slate-900">
        <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mb-6 animate-bounce">
          <CheckCircle2 className="size-10 text-green-500" />
        </div>
        <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white mb-3">Shipment Created!</h2>
        <p className="text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed mb-4">
          Your shipment has been submitted and is now <strong className="text-orange-500">Processing</strong>. 
          Our team will review the details and assign a driver shortly.
        </p>
        <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 w-full max-w-sm border border-slate-100 dark:border-slate-700 space-y-2 text-left">
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Status</span>
            <span className="font-bold text-orange-500">Pending Review</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Category</span>
            <span className="font-semibold text-slate-700 dark:text-slate-200">{PACKAGE_CATEGORIES.find(c => c.id === category)?.label}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-slate-400">Estimated Fee</span>
            <span className="font-bold text-slate-900 dark:text-white">₱{totalFee.toLocaleString()}.00</span>
          </div>
        </div>
        <p className="text-xs text-slate-400 mt-6">Redirecting to My Packages...</p>
      </div>
    );
  }

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
        {/* ── Pickup Address with Auto-search ── */}
        <div className="group relative">
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
          <div className="relative flex items-center mb-1">
            <MapPin className="absolute left-4 text-orange-600 size-5" />
            {searchingPickup && <Loader2 className="absolute right-4 text-orange-600 size-4 animate-spin" />}
            {!searchingPickup && pickup.length >= 3 && <Search className="absolute right-4 text-slate-300 size-4" />}
            <input 
              type="text"
              value={pickup}
              onChange={(e) => handlePickupChange(e.target.value)}
              className="w-full pl-12 pr-10 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
              placeholder="Search address or type manually" 
            />
          </div>
          {/* Pickup address suggestions */}
          {pickupResults.length > 0 && (
            <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1">
              {pickupResults.map((r, i) => (
                <button key={i} onClick={() => selectPickup(r)} className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 transition-colors">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{r.display_name}</p>
                </button>
              ))}
            </div>
          )}

          {showPickupMap && (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-orange-600/20 shadow-inner mb-4 mt-2">
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

        {/* ── Destination Address with Auto-search ── */}
        <div className="group relative">
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
          <div className="relative flex items-center mb-1">
            <Navigation className="absolute left-4 text-slate-400 size-5" />
            {searchingDest && <Loader2 className="absolute right-4 text-orange-600 size-4 animate-spin" />}
            {!searchingDest && destination.length >= 3 && <Search className="absolute right-4 text-slate-300 size-4" />}
            <input 
              type="text"
              required
              value={destination}
              onChange={(e) => handleDestChange(e.target.value)}
              className="w-full pl-12 pr-10 py-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 outline-none transition-all placeholder:text-slate-400 text-slate-900 dark:text-slate-100" 
              placeholder="Search receiver's address" 
            />
          </div>
          {/* Destination address suggestions */}
          {destResults.length > 0 && (
            <div className="absolute z-50 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto mt-1">
              {destResults.map((r, i) => (
                <button key={i} onClick={() => selectDest(r)} className="w-full text-left px-4 py-3 hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 transition-colors">
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200 line-clamp-2">{r.display_name}</p>
                </button>
              ))}
            </div>
          )}

          {showMap && (
            <div className="relative w-full h-64 rounded-2xl overflow-hidden border-2 border-orange-600/20 shadow-inner mb-4 mt-2">
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

        {/* ── Receiver Info ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input type="text" value={receiverName} onChange={e => setReceiverName(e.target.value)}
              className="w-full pl-10 pr-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Receiver name" />
          </div>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 size-4" />
            <input type="tel" value={receiverPhone} onChange={e => setReceiverPhone(e.target.value)}
              className="w-full pl-10 pr-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 outline-none text-sm placeholder:text-slate-400 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600/20 focus:border-orange-600 transition-all"
              placeholder="Phone number" />
          </div>
        </div>
      </section>

      {/* ── Package Category (Issue #3) ── */}
      <section className="mt-8 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Package Category</h3>
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {PACKAGE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const active = category === cat.id;
            return (
              <button key={cat.id} onClick={() => setCategory(cat.id)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-4 py-3 rounded-xl border-2 transition-all min-w-[90px] flex-shrink-0",
                  active ? "border-orange-600 bg-orange-600/5 text-orange-600" : "border-slate-100 dark:border-slate-800 text-slate-400 hover:border-slate-200"
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-bold whitespace-nowrap">{cat.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-400 mt-2 ml-1">
          {PACKAGE_CATEGORIES.find(c => c.id === category)?.desc}
        </p>
      </section>

      {/* ── Weight & Specifications (Issue #6 — clearly shows KG) ── */}
      <section className="mt-6 px-5">
        <h3 className="text-[13px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-4">Specifications</h3>
        <div className="flex flex-col gap-2">
          <label className="text-[13px] font-semibold text-slate-600 dark:text-slate-400 ml-1">Weight (Kilograms)</label>
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 overflow-hidden focus-within:ring-2 focus-within:ring-orange-600/20 focus-within:border-orange-600 transition-all">
            <input 
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="flex-1 px-4 py-4 bg-transparent border-none focus:ring-0 outline-none text-[15px] font-medium text-slate-900 dark:text-slate-100" 
              placeholder="e.g. 5.5" 
            />
            <span className="pr-4 text-orange-500 font-bold text-sm uppercase tracking-widest">KG</span>
          </div>
        </div>
      </section>

      {/* ── Shipping Method ── */}
      <section className="mt-8 px-5">
        <h3 className="text-[13px] font-bold mb-4 uppercase tracking-wider text-slate-500 dark:text-slate-400">Shipping Method</h3>
        {distKm > 0 && (
          <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3 mb-4 border border-slate-100 dark:border-slate-700 space-y-1">
            <div className="flex justify-between text-xs"><span className="text-slate-400">Distance</span><span className="font-semibold text-slate-700 dark:text-slate-200">{distKm.toFixed(1)} km</span></div>
            <div className="flex justify-between text-xs"><span className="text-slate-400">Weight</span><span className="font-semibold text-slate-700 dark:text-slate-200">{weightKg} kg</span></div>
            {categorySurcharge > 0 && <div className="flex justify-between text-xs"><span className="text-slate-400">Category Surcharge</span><span className="font-semibold text-orange-500">+₱{categorySurcharge}</span></div>}
          </div>
        )}
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
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">₱{Math.round(baseFee).toLocaleString()}.00</span>
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
              <span className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">₱{Math.round(baseFee * 1.8).toLocaleString()}.00</span>
            </div>
          </button>
        </div>
      </section>

      {error && (
        <div className="mx-5 mt-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
        </div>
      )}

      {/* ── Footer with Submit ── */}
      <footer className="p-5 mt-auto border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl sticky bottom-0 z-20">
        <div className="flex items-center justify-between mb-5 px-1">
          <div className="flex flex-col">
            <span className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">Estimated Total</span>
            <span className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">₱{totalFee.toLocaleString()}.00</span>
          </div>
          <div className="text-[11px] text-right font-medium text-slate-400 dark:text-slate-500">
            Includes taxes & fees
          </div>
        </div>
        <button 
          onClick={handleConfirm}
          disabled={loading || !destination || !pickup}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-orange-600/25 transition-all active:scale-[0.97] flex items-center justify-center gap-2 group disabled:opacity-50"
        >
          {loading ? (
            <>
              <Loader2 className="size-5 animate-spin" />
              <span>Creating Shipment...</span>
            </>
          ) : (
            <>
              <span>Review & Confirm</span>
              <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
