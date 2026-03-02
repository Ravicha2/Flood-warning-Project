"use client";

import { useState } from 'react';
import LocationSearch from '@/components/LocationSearch';
import RiskAlert from '@/components/RiskAlert';
import { api, LocationCheckResponse } from '@/lib/api';
import { MapPin, Navigation, Clock } from 'lucide-react';
import Link from 'next/link';

export default function CheckRiskPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<LocationCheckResponse | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (lat: number, lon: number) => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const resp = await api.checkLocation(lat, lon);
      setResult(resp);
    } catch (e: any) {
      setError(e.message || 'Failed to check location');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-3 mb-12">
        <h1 className="text-4xl font-extrabold text-brand-950 dark:text-white tracking-tight">Check Flood Risk</h1>
        <p className="text-lg text-brand-800/80 dark:text-brand-300/80">Enter coordinates or use your location to instantly evaluate flood risks in your area.</p>
      </div>

      <div className="glass-panel rounded-2xl p-1 md:p-2">
        <LocationSearch onSearch={handleSearch} />
      </div>

      {error && (
        <div className="animate-in fade-in zoom-in-95 bg-red-50/80 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-xl border border-red-200 dark:border-red-800/50 backdrop-blur-sm -mt-2">
          {error}
        </div>
      )}

      {loading && (
        <div className="glass-panel p-8 rounded-2xl flex flex-col items-center justify-center space-y-4 animate-pulse">
          <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin dark:border-brand-800 dark:border-t-brand-400" />
          <p className="text-brand-600 dark:text-brand-400 font-bold tracking-widest text-sm uppercase">Analyzing Flood Data...</p>
        </div>
      )}

      {result && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
          <RiskAlert level={result.risk_level} message={result.message} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {result.water_level_m !== undefined && (
              <div className="glass-panel p-5 rounded-2xl flex items-start hover-lift shadow-brand-900/5 dark:shadow-brand-500/10">
                <div className="bg-brand-100 dark:bg-brand-900/50 p-3 rounded-xl mr-4 mt-1 border border-brand-200 dark:border-brand-800 shadow-inner">
                  <MapPin className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-600/70 dark:text-brand-400/70 uppercase tracking-widest mb-1">Water Level</h4>
                  <p className="text-3xl font-extrabold text-brand-950 dark:text-white">{result.water_level_m.toFixed(2)}<span className="text-xl text-brand-600/50 font-medium tracking-normal ml-1">m</span></p>
                </div>
              </div>
            )}
            
            {result.predicted_flood_time && (
              <div className="glass-panel p-5 rounded-2xl flex items-start hover-lift shadow-brand-900/5 dark:shadow-brand-500/10">
                <div className="bg-orange-100 dark:bg-orange-900/50 p-3 rounded-xl mr-4 mt-1 border border-orange-200 dark:border-orange-800 shadow-inner">
                  <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-brand-600/70 dark:text-brand-400/70 uppercase tracking-widest mb-1">Estimated Strike</h4>
                  <p className="text-xl font-bold text-brand-950 dark:text-white">{new Date(result.predicted_flood_time).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </div>

          {result.evacuation_route && result.evacuation_route.length > 0 && (
             <div className="glass-panel p-6 rounded-2xl border-t-4 border-t-indigo-500 shadow-xl shadow-brand-900/10 relative overflow-hidden mt-8">
               <div className="absolute -right-10 -top-10 bg-indigo-500/10 blur-3xl w-40 h-40 rounded-full" />
               <h3 className="text-xl font-bold mb-2 flex items-center text-brand-950 dark:text-white">
                 <Navigation className="w-6 h-6 mr-2 text-indigo-600 dark:text-indigo-400" />
                 Safe Evacuation Route Found
               </h3>
               <p className="text-brand-800/80 dark:text-brand-300/80 mb-6 text-sm font-medium">A secure path avoiding critical flood zones has been calculated and is ready for use.</p>
               <Link href={`/map?lat=${result.latitude}&lon=${result.longitude}&route=1`} className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-0.5">
                 View Interactive Route
               </Link>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
