import React, { useState } from 'react';
import { MapPin, Phone, Clock, Navigation, Search, X } from 'lucide-react';
import Map from '../components/Map';

const STATIONS = [
  {
    id: '1',
    name: 'Manila Central Hub',
    address: 'Intramuros, Manila, Metro Manila',
    distance: '1.2 km',
    hours: '8:00 AM - 9:00 PM',
    phone: '(02) 8123-4567',
    status: 'Open',
    position: [14.5906, 120.9758] as [number, number]
  },
  {
    id: '2',
    name: 'Cebu Logistics Center',
    address: 'Mandaue City, Cebu',
    distance: '580 km',
    hours: '24 Hours',
    phone: '(032) 234-5678',
    status: 'Open',
    position: [10.3333, 123.9333] as [number, number]
  },
  {
    id: '3',
    name: 'Davao Gateway',
    address: 'Buhangin, Davao City, Davao del Sur',
    distance: '960 km',
    hours: '9:00 AM - 6:00 PM',
    phone: '(082) 345-6789',
    status: 'Closed',
    position: [7.1283, 125.6308] as [number, number]
  },
  {
    id: '4',
    name: 'Quezon City Drop-off',
    address: 'Cubao, Quezon City, Metro Manila',
    distance: '8.5 km',
    hours: '8:00 AM - 8:00 PM',
    phone: '(02) 8987-6543',
    status: 'Open',
    position: [14.6178, 121.0572] as [number, number]
  }
];

export default function Stations() {
  const [location, setLocation] = useState('Manila, Philippines');
  const [isChangingLocation, setIsChangingLocation] = useState(false);
  const [tempLocation, setTempLocation] = useState(location);
  const [selectedStation, setSelectedStation] = useState(STATIONS[0]);

  const handleSaveLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempLocation.trim()) {
      setLocation(tempLocation);
      setIsChangingLocation(false);
    }
  };

  return (
    <div className="px-6 py-4 space-y-6 relative">
      <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl p-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-full bg-orange-600/10 flex items-center justify-center text-orange-600">
            <Navigation className="size-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Your Location</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{location}</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setTempLocation(location);
            setIsChangingLocation(true);
          }}
          className="text-xs font-bold text-orange-600 hover:bg-orange-600/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          Change
        </button>
      </div>

      {/* Map Section */}
      <div className="relative w-full h-64 rounded-3xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800">
        <Map 
          center={selectedStation.position} 
          zoom={12}
          markers={STATIONS.map(s => ({
            position: s.position,
            label: s.name
          }))}
        />
      </div>

      {/* Change Location Modal */}
      {isChangingLocation && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Change Location</h3>
              <button 
                onClick={() => setIsChangingLocation(false)}
                className="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="size-5 text-slate-500" />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} className="p-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-400" />
                <input 
                  type="text"
                  value={tempLocation}
                  onChange={(e) => setTempLocation(e.target.value)}
                  placeholder="Enter city or zip code"
                  autoFocus
                  className="w-full h-14 pl-12 pr-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-orange-600 transition-all"
                />
              </div>
              <button 
                type="submit"
                className="w-full h-14 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-2xl shadow-lg shadow-orange-600/30 active:scale-[0.98] transition-all"
              >
                Update Location
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Nearby Stations</h2>
        <div className="space-y-4">
          {STATIONS.map((station) => (
            <div 
              key={station.id}
              onClick={() => setSelectedStation(station)}
              className={`bg-white dark:bg-slate-800 border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group ${
                selectedStation.id === station.id ? 'border-orange-600 ring-1 ring-orange-600' : 'border-slate-100 dark:border-slate-700'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex gap-3">
                  <div className={`size-10 rounded-xl flex items-center justify-center transition-colors ${
                    selectedStation.id === station.id ? 'bg-orange-600 text-white' : 'bg-slate-50 dark:bg-slate-700 text-slate-400 group-hover:text-orange-600'
                  }`}>
                    <MapPin className="size-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100">{station.name}</h3>
                    <p className="text-xs text-slate-500">{station.address}</p>
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider ${
                  station.status === 'Open' 
                    ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400' 
                    : 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400'
                }`}>
                  {station.status}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock className="size-4" />
                  <span className="text-xs">{station.hours}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Phone className="size-4" />
                  <span className="text-xs">{station.phone}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-orange-600">{station.distance} away</span>
                <button className="text-xs font-bold text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-4 py-2 rounded-lg hover:bg-orange-600 hover:text-white transition-colors">
                  Get Directions
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

