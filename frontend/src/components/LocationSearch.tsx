"use client";

import { useState } from 'react';
import { Search, MapPin } from 'lucide-react';

interface LocationSearchProps {
  onSearch: (lat: number, lon: number) => void;
  isLoading?: boolean;
}

export default function LocationSearch({ onSearch, isLoading }: LocationSearchProps) {
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (!isNaN(latNum) && !isNaN(lonNum)) {
      onSearch(latNum, lonNum);
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLat(position.coords.latitude.toString());
          setLon(position.coords.longitude.toString());
          onSearch(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          console.error("Error getting location", error);
          alert("Could not get your current location.");
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="p-6 md:p-8">
      <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-slate-100 flex items-center tracking-tight">
        <Search className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
        Search by Coordinate
      </h2>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            placeholder="Latitude (e.g. -27.46)"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full p-3.5 pl-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
            required
          />
        </div>
        <div className="relative flex-1">
          <input
            type="number"
            step="any"
            placeholder="Longitude (e.g. 153.02)"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            className="w-full p-3.5 pl-4 border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-slate-400"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 px-8 rounded-xl transition-all shadow-md shadow-blue-500/30 hover:shadow-blue-500/50 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoading ? 'Scanning...' : 'Verify Need'}
        </button>
      </form>
      
      <div className="mt-6 flex items-center justify-center">
        <button 
          onClick={handleUseCurrentLocation}
          className="text-sm flex items-center text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors font-medium border border-blue-200 dark:border-blue-800/50 rounded-full px-5 py-2.5 hover:bg-blue-50 dark:hover:bg-blue-900/30"
          type="button"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use My GPS Location Instead
        </button>
      </div>
    </div>
  );
}
