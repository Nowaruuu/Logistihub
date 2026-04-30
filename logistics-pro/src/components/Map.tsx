import React, { useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issue in Leaflet with Vite/Webpack
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icons using SVG strings for better "accuracy" and visual appeal
const createCustomIcon = (color: string, type: 'rider' | 'pin') => {
  const svg = type === 'rider' 
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-2.035-2.544A1 1 0 0 0 17 10h-2v8"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="${color}" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

  return L.divIcon({
    html: `<div style="background: white; border-radius: 50%; padding: 4px; box-shadow: 0 2px 10px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center;">${svg}</div>`,
    className: 'custom-leaflet-icon',
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

export const RiderIcon = createCustomIcon('#ea580c', 'rider'); // orange-600
export const DestinationIcon = createCustomIcon('#2563eb', 'pin'); // blue-600

L.Marker.prototype.options.icon = DefaultIcon;

// Philippines geographic bounds
const PH_BOUNDS: L.LatLngBoundsExpression = [
  [4.5, 114.1],  // SW corner
  [21.1, 126.6], // NE corner
];
const PH_CENTER: [number, number] = [12.8797, 121.7740]; // center of PH

interface MapProps {
  center: [number, number];
  zoom?: number;
  markers?: {
    position: [number, number];
    label?: string;
    icon?: L.Icon | L.DivIcon;
  }[];
  polylines?: {
    positions: [number, number][];
    color?: string;
  }[];
  autoBounds?: boolean;
  onClick?: (lat: number, lng: number) => void;
  className?: string;
}

// Helper component to update map view when center changes or auto-bounds are needed
function MapController({ center, zoom, markers, autoBounds, onClick }: { 
  center: [number, number], 
  zoom: number, 
  markers: any[],
  autoBounds?: boolean,
  onClick?: (lat: number, lng: number) => void
}) {
  const map = useMap();
  
  useEffect(() => {
    if (autoBounds && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => m.position));
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else {
      map.setView(center, zoom);
    }
  }, [center, zoom, markers, autoBounds, map]);

  useEffect(() => {
    if (!onClick) return;
    
    const handleClick = (e: L.LeafletMouseEvent) => {
      onClick(e.latlng.lat, e.latlng.lng);
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, onClick]);
  
  return null;
}

export default function Map({ 
  center, 
  zoom = 13, 
  markers = [], 
  polylines = [],
  autoBounds = false,
  onClick,
  className = "h-full w-full" 
}: MapProps) {
  return (
    <MapContainer 
      center={center} 
      zoom={zoom} 
      className={className}
      scrollWheelZoom={false}
      maxBounds={PH_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={5}
    >
      <MapController 
        center={center} 
        zoom={zoom} 
        markers={markers} 
        autoBounds={autoBounds} 
        onClick={onClick}
      />
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {polylines.map((polyline, idx) => (
        <Polyline 
          key={`poly-${idx}`} 
          positions={polyline.positions} 
          color={polyline.color || '#ea580c'} 
          weight={3}
          opacity={0.6}
          dashArray="5, 10"
        />
      ))}

      {markers.map((marker, idx) => (
        <Marker key={idx} position={marker.position} icon={marker.icon || DefaultIcon}>
          {marker.label && (
            <Popup>
              <div className="font-bold text-slate-900">{marker.label}</div>
            </Popup>
          )}
        </Marker>
      ))}
    </MapContainer>
  );
}
