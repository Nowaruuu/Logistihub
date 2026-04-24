import React, { useState } from 'react';
import { Calculator, Package, MapPin, ArrowRight, Info, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const REGIONS = [
  { id: 'metro-manila', name: 'Metro Manila', base: 80 },
  { id: 'luzon', name: 'Luzon (Outside MM)', base: 150 },
  { id: 'visayas', name: 'Visayas', base: 200 },
  { id: 'mindanao', name: 'Mindanao', base: 220 },
];

const SIZES = [
  { id: 'small', name: 'Small Pouch', desc: 'Up to 3kg', multiplier: 1 },
  { id: 'medium', name: 'Medium Box', desc: 'Up to 10kg', multiplier: 1.5 },
  { id: 'large', name: 'Large Box', desc: 'Up to 20kg', multiplier: 2.5 },
];

export default function RateCalculator() {
  const [origin, setOrigin] = useState('metro-manila');
  const [destination, setDestination] = useState('metro-manila');
  const [size, setSize] = useState('small');
  const [weight, setWeight] = useState(1);
  const [isExpress, setIsExpress] = useState(false);

  const calculateRate = () => {
    const originRegion = REGIONS.find(r => r.id === origin);
    const destRegion = REGIONS.find(r => r.id === destination);
    const sizeType = SIZES.find(s => s.id === size);

    if (!originRegion || !destRegion || !sizeType) return 0;

    // Logic: Base rate of destination + regional surcharge if cross-region
    let rate = destRegion.base;
    
    // Cross-region surcharge
    if (origin !== destination) {
      rate += 50;
    }

    // Size multiplier
    rate *= sizeType.multiplier;

    // Weight surcharge (above 1kg)
    if (weight > 1) {
      rate += (weight - 1) * 20;
    }

    // Express surcharge
    if (isExpress) {
      rate *= 1.4;
    }

    return Math.round(rate);
  };

  const estimatedRate = calculateRate();

  return (
    <div className="px-6 py-4 space-y-8">
      <div className="flex items-center gap-4">
        <div className="size-12 rounded-2xl bg-orange-600/10 flex items-center justify-center text-orange-600">
          <Calculator className="size-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Rate Calculator</h2>
          <p className="text-sm text-slate-500">Estimate your shipping cost instantly</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Origin & Destination */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Origin</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <select 
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 appearance-none transition-all"
              >
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>

          <div className="flex justify-center -my-2 z-10">
            <div className="size-10 rounded-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center shadow-sm">
              <ArrowRight className="size-5 text-orange-600 rotate-90" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Destination</label>
            <div className="relative">
              <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
              <select 
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 appearance-none transition-all"
              >
                {REGIONS.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Package Details */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Package Size</label>
          <div className="grid grid-cols-1 gap-3">
            {SIZES.map((s) => (
              <button
                key={s.id}
                onClick={() => setSize(s.id)}
                className={cn(
                  "flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left",
                  size === s.id 
                    ? "border-orange-600 bg-orange-600/5" 
                    : "border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900"
                )}
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "size-10 rounded-xl flex items-center justify-center transition-colors",
                    size === s.id ? "bg-orange-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"
                  )}>
                    <Package className="size-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-slate-100">{s.name}</h4>
                    <p className="text-xs text-slate-500">{s.desc}</p>
                  </div>
                </div>
                {size === s.id && <div className="size-5 rounded-full bg-orange-600 flex items-center justify-center text-white"><ChevronRight className="size-3" /></div>}
              </button>
            ))}
          </div>
        </div>

        {/* Weight Slider */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Weight (kg)</label>
            <span className="text-lg font-black text-orange-600">{weight} kg</span>
          </div>
          <input 
            type="range" 
            min="1" 
            max="20" 
            value={weight}
            onChange={(e) => setWeight(parseInt(e.target.value))}
            className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-600"
          />
        </div>

        {/* Service Type */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-center text-orange-600">
              <Info className="size-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-slate-100">Express Delivery</h4>
              <p className="text-[10px] text-slate-500">1-2 days delivery time</p>
            </div>
          </div>
          <button 
            onClick={() => setIsExpress(!isExpress)}
            className={cn(
              "w-12 h-6 rounded-full transition-colors relative",
              isExpress ? "bg-orange-600" : "bg-slate-300 dark:bg-slate-600"
            )}
          >
            <div className={cn(
              "absolute top-1 size-4 bg-white rounded-full transition-all",
              isExpress ? "left-7" : "left-1"
            )} />
          </button>
        </div>
      </div>

      {/* Result Card */}
      <motion.div 
        layout
        className="bg-slate-900 dark:bg-orange-600 rounded-3xl p-8 text-white shadow-2xl shadow-orange-600/20"
      >
        <p className="text-xs font-bold text-white/60 uppercase tracking-[0.2em] mb-2">Estimated Shipping Fee</p>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-white/80">₱</span>
          <span className="text-5xl font-black tracking-tighter">{estimatedRate.toLocaleString()}</span>
        </div>
        <div className="mt-6 pt-6 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-white/80">Prices are subject to change</span>
          </div>
          <button className="text-xs font-bold bg-white text-slate-900 px-6 py-3 rounded-xl hover:bg-orange-50 transition-colors">
            Book Now
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function cn(...classes: any[]) {
  return classes.filter(Boolean).join(' ');
}
