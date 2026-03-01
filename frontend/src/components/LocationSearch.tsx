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
      <h2 className="text-xl font-bold mb-5 text-brand-950 dark:text-brand-50 flex items-center tracking-tight">
        <Search className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
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
            className="w-full p-3.5 pl-4 border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/50 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-brand-400"
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
            className="w-full p-3.5 pl-4 border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/50 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-brand-400"
            required
          />
        </div>
        <button
          type="submit"
          disabled={isLoading}
          className="bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3.5 px-8 rounded-xl transition-all shadow-md shadow-brand-500/30 hover:shadow-brand-500/50 active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {isLoading ? 'Scanning...' : 'Verify Need'}
        </button>
      </form>
      
      <div className="mt-6 flex items-center justify-center">
        <button 
          onClick={handleUseCurrentLocation}
          className="text-sm flex items-center text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors font-medium border border-brand-200 dark:border-brand-800/50 rounded-full px-5 py-2.5 hover:bg-brand-100 dark:hover:bg-brand-900/50"
          type="button"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use My GPS Location Instead
        </button>
      </div>
    </div>
  );
}
