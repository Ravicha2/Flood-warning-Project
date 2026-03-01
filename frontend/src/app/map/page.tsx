"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FloodMap from '@/components/FloodMap';
import MapQuickGo from '@/components/MapQuickGo';
import { api, Boundary, Prediction, RouteResponse } from '@/lib/api';
import { Layers, AlertCircle } from 'lucide-react';

function MapContent() {
  const searchParams = useSearchParams();
  const initialLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')!) : -27.4698;
  const initialLon = searchParams.get('lon') ? parseFloat(searchParams.get('lon')!) : 153.0251;
  const getRoute = searchParams.get('route') === '1';

  const [center, setCenter] = useState<[number, number]>([initialLat, initialLon]);
  const [zoom, setZoom] = useState(10);
  
  const [boundaries, setBoundaries] = useState<Boundary[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [route, setRoute] = useState<RouteResponse | undefined>(undefined);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async (lat: number, lon: number, fetchRoute: boolean = false) => {
    setLoading(true);
    try {
      // Load boundaries globally (or we could pass country)
      const bRes = await api.getFloodBoundaries({ active_only: true });
      setBoundaries(bRes.boundaries);

      // Load predictions
      const pRes = await api.getPredictions({ hours_ahead: 12 });
      setPredictions(pRes.predictions);

      if (fetchRoute) {
        try {
          const rRes = await api.getEvacuationRoutes(lat, lon);
          setRoute(rRes);
        } catch (e) {
          console.error("Could not fetch route", e);
        }
      } else {
        setRoute(undefined);
      }
    } catch (e: any) {
      setError('Failed to load map data from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(center[0], center[1], getRoute);
  }, []);

  const handleQuickGo = (lat: number, lon: number, z?: number) => {
    setCenter([lat, lon]);
    if (z) setZoom(z);
  };

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 glass-panel p-4 rounded-2xl mb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center tracking-tight">
            <Layers className="w-6 h-6 mr-2 text-blue-600 dark:text-blue-400" />
            Live Flood Map
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-medium">Real-time boundaries, sensor predictions, and routing.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Quick view</span>
          <MapQuickGo onSelect={handleQuickGo} />
        </div>
      </div>

      {error && (
        <div className="bg-red-50/80 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-3 rounded-xl border border-red-200 dark:border-red-800/50 flex items-center text-sm backdrop-blur-sm -mt-2">
          <AlertCircle className="w-4 h-4 mr-2" />
          {error}
        </div>
      )}

      <div className="flex-1 relative mt-2 rounded-2xl overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800 shadow-2xl">
        {loading && (
          <div className="absolute inset-0 z-10 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md flex items-center justify-center">
            <div className="bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl flex items-center space-x-4 border border-slate-200 dark:border-slate-700">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">Loading Map Data...</span>
            </div>
          </div>
        )}
        <FloodMap 
          center={center} 
          zoom={zoom} 
          boundaries={boundaries} 
          predictions={predictions}
          route={route}
          userLocation={getRoute ? [initialLat, initialLon] : undefined}
        />
      </div>
    </div>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500 animate-pulse font-medium">Loading map...</div>}>
      <MapContent />
    </Suspense>
  );
}
