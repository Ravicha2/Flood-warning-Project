"use client";

import Link from 'next/link';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';
import { Activity, ShieldCheck, Map as MapIcon, ShieldAlert, ArrowRight } from 'lucide-react';
import { TypewriterText } from '@/components/TypewriterText';

export default function Home() {
  const [health, setHealth] = useState<'loading' | 'ok' | 'error'>('loading');

  useEffect(() => {
    api.getHealth()
      .then(() => setHealth('ok'))
      .catch(() => setHealth('error'));
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-12 relative overflow-hidden">
      {/* Decorative Brand Glow */}
      <div className="absolute top-[40%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-4xl h-96 bg-brand-500/15 dark:bg-brand-600/20 blur-[130px] rounded-full pointer-events-none" />

      <div className="space-y-6 max-w-4xl px-4 relative z-10 pt-8">
        <div className="inline-flex items-center justify-center space-x-2 px-4 py-1.5 rounded-full border border-brand-300 dark:border-brand-700 bg-brand-50/80 dark:bg-brand-900/40 text-brand-700 dark:text-brand-300 text-sm font-bold shadow-sm backdrop-blur-sm">
          <Activity className="w-4 h-4" />
          <span>Real-time Sentinel AI Technology</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-brand-950 dark:text-brand-50 sm:text-7xl leading-tight">
          Next-Generation <br/>
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600 dark:from-brand-400 dark:to-indigo-400">
             Flood Intelligence
          </span>
        </h1>
        <div className="text-xl md:text-2xl text-brand-800/80 dark:text-brand-200/80 leading-relaxed max-w-3xl mx-auto font-medium h-20 md:h-12">
          We empower communities with <TypewriterText 
            texts={[
              "real-time risk assessments.",
              "safe evacuation routing.",
              "predictive disaster modeling.",
              "AI-driven survival insights."
            ]}
            className="text-brand-700 dark:text-brand-300 border-b-2 border-brand-400 border-dashed pb-0.5"
          />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 w-full max-w-2xl justify-center px-4 relative z-10 mt-8">
        <Link 
          href="/check" 
          className="group relative flex flex-1 items-center justify-center px-8 py-5 text-lg font-bold rounded-2xl text-white bg-brand-600 hover:bg-brand-700 transition-all shadow-xl shadow-brand-600/20 hover:shadow-brand-600/40 hover:-translate-y-1"
        >
          <div className="absolute inset-0 bg-white/20 blur-sm rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <ShieldAlert className="w-6 h-6 mr-3" />
          Start Risk Assessment
          <ArrowRight className="w-5 h-5 ml-2 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
        </Link>
        <Link 
          href="/map" 
          className="group flex flex-1 items-center justify-center px-8 py-5 text-lg font-bold rounded-2xl text-brand-900 dark:text-brand-50 bg-white/80 dark:bg-brand-900/80 backdrop-blur-md border border-brand-200 dark:border-brand-700/50 hover:bg-brand-50 dark:hover:bg-brand-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-1"
        >
          <MapIcon className="w-6 h-6 mr-3 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform" />
          Open Command Center
        </Link>
      </div>

      <div className="pt-16 relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center">
        <p className="text-sm font-semibold text-brand-500/80 dark:text-brand-400/80 uppercase tracking-widest mb-6">System Status Panel</p>
        {health === 'loading' && (
          <div className="flex items-center text-brand-600 dark:text-brand-300 glass-panel px-6 py-3 rounded-full text-sm font-medium shadow-md">
            <Activity className="w-4 h-4 mr-2 animate-spin" /> Initializing global sensor grid...
          </div>
        )}
        {health === 'ok' && (
          <div className="flex items-center text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-900/40 border border-emerald-300/50 dark:border-emerald-700/50 px-8 py-4 rounded-full text-sm font-bold shadow-lg backdrop-blur-md">
            <ShieldCheck className="w-5 h-5 mr-2" /> Global Datacenters Online & Operational
          </div>
        )}
        {health === 'error' && (
          <div className="flex items-center text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-900/40 border border-rose-300/50 dark:border-rose-700/50 px-8 py-4 rounded-full text-sm font-bold shadow-lg backdrop-blur-md animate-pulse">
            <ShieldAlert className="w-5 h-5 mr-2" /> Connection to Mainframe Severed
          </div>
        )}
      </div>
    </div>
  );
}
