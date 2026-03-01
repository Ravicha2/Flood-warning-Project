"use client";

import Link from 'next/link';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Map as MapIcon, ShieldAlert } from 'lucide-react';

export default function Home() {
  const [health, setHealth] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    api.getHealth()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] text-center space-y-12 relative">
      {/* Decorative Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl h-80 bg-blue-500/20 dark:bg-blue-600/30 blur-[120px] rounded-full pointer-events-none" />

      <div className="space-y-6 max-w-3xl px-4 relative z-10">
        <div className="inline-flex items-center justify-center space-x-2 px-3 py-1 rounded-full border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-sm font-semibold mb-2">
          <Activity className="w-4 h-4" />
          <span>Real-time Early Detection</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-7xl leading-tight">
          Next-Generation <br/>
          <span className="gradient-text">Flood Intelligence</span>
        </h1>
        <p className="text-xl text-slate-600 dark:text-slate-300 leading-relaxed max-w-2xl mx-auto">
          Advanced risk mapping, safe evacuation routing, and predictive modeling during emergencies to keep you safe.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-lg justify-center px-4 relative z-10">
        <Link 
          href="/check" 
          className="group relative flex flex-1 items-center justify-center px-8 py-4 text-base font-semibold rounded-2xl text-white bg-blue-600 hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-105 active:scale-95"
        >
          <div className="absolute inset-0 bg-white/20 blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <ShieldAlert className="w-5 h-5 mr-3" />
          Check My Risk
        </Link>
        <Link 
          href="/map" 
          className="flex flex-1 items-center justify-center px-8 py-4 text-base font-semibold rounded-2xl text-slate-900 dark:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow-md hover:scale-105 active:scale-95"
        >
          <MapIcon className="w-5 h-5 mr-3" />
          Live Map
        </Link>
      </div>

      <div className="pt-12 relative z-10">
        {health === 'loading' && (
          <div className="flex items-center text-slate-500 dark:text-slate-400 glass-panel px-6 py-3 rounded-full text-sm shadow-sm">
            <Activity className="w-4 h-4 mr-2 animate-spin" /> Checking system readiness...
          </div>
        )}
        {health === 'ok' && (
          <div className="flex items-center text-emerald-700 dark:text-emerald-400 bg-emerald-100/50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-6 py-3 rounded-full text-sm font-medium shadow-sm backdrop-blur-md">
            <ShieldCheck className="w-4 h-4 mr-2" /> All Systems Operational
          </div>
        )}
        {health === 'error' && (
          <div className="flex items-center text-red-700 dark:text-red-400 bg-red-100/50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-6 py-3 rounded-full text-sm font-medium shadow-sm backdrop-blur-md animate-pulse">
            <ShieldAlert className="w-4 h-4 mr-2" /> Backend Offline or Unreachable
          </div>
        )}
      </div>
    </div>
  );
}
