"use client";

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import FloodMap from '@/components/FloodMap';
import MapQuickGo from '@/components/MapQuickGo';
import { api, Boundary, Prediction, RouteResponse } from '@/lib/api';
import { Layers, AlertCircle, MapPin } from 'lucide-react';

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
  const [riverData, setRiverData] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = async (lat: number, lon: number, fetchRoute: boolean = false) => {
    setLoading(true);
    try {
      // 1. Trigger dynamic 0.1 deg grid seeding around the requested center point
      await api.generateDynamicGrid(lat, lon);

      // 2. Load globally active boundaries (filtered to 50km around the center so we only pull relevant grids)
      const bRes = await api.getFloodBoundaries({ active_only: true, lat, lon });
      setBoundaries(bRes.boundaries);

      // Load predictions
      const pRes = await api.getPredictions({ hours_ahead: 12 });
      setPredictions(pRes.predictions);

      // Load Open-Meteo river discharge
      try {
        const meteoRes = await fetch(`https://flood-api.open-meteo.com/v1/flood?latitude=${lat}&longitude=${lon}&daily=river_discharge&forecast_days=3`);
        if (meteoRes.ok) {
          const data = await meteoRes.json();
          if (data && data.daily && data.daily.river_discharge) {
            setRiverData({
              latitude: data.latitude,
              longitude: data.longitude,
              time: data.daily.time,
              river_discharge: data.daily.river_discharge,
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch Open-Meteo flood data", err);
      }

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
    // Initial load
    loadData(initialLat, initialLon, getRoute);

    // Set up real-time polling every 30 seconds for dynamic data
    const intervalId = setInterval(async () => {
      try {
        // Dynamic update using the CURRENT center
        await api.generateDynamicGrid(center[0], center[1]);
        const bRes = await api.getFloodBoundaries({ active_only: true, lat: center[0], lon: center[1] });
        setBoundaries(bRes.boundaries);

        const pRes = await api.getPredictions({ hours_ahead: 12 });
        setPredictions(pRes.predictions);
      } catch (e) {
        console.error("Background polling failed", e);
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [initialLat, initialLon, getRoute]);

  const handleQuickGo = (lat: number, lon: number, z?: number) => {
    setCenter([lat, lon]);
    if (z) setZoom(z);
    loadData(lat, lon, false); // Reload meteor data for new center
  };

  return (
    <div className="space-y-4 h-[calc(100vh-140px)] flex flex-col pt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 glass-panel p-4 rounded-2xl mb-2">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-950 dark:text-white flex items-center tracking-tight">
            <Layers className="w-6 h-6 mr-2 text-brand-600 dark:text-brand-400" />
            Live Flood Map
          </h1>
          <p className="text-brand-800/80 dark:text-brand-300/80 text-sm mt-1 font-medium">Real-time situational awareness and predictive routing.</p>
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
            <div className="glass-panel w-full h-full rounded-2xl flex flex-col items-center justify-center border-brand-200 dark:border-brand-800/50">
              <div className="relative">
                <div className="absolute inset-0 bg-brand-400/20 rounded-full blur-xl animate-pulse" />
                <MapPin className="w-12 h-12 text-brand-400/50 dark:text-brand-600/50 animate-bounce relative z-10" />
              </div>
              <p className="mt-4 text-brand-600/70 dark:text-brand-400/80 font-medium tracking-widest text-sm uppercase">Initializing Satellites...</p>
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
          riverDischargeData={riverData}
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
