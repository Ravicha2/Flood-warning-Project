"use client";

import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Building2, Loader2 } from 'lucide-react';

interface LocationSearchProps {
  onSearch: (lat: number, lon: number) => void;
}

interface CityResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string; // State/Province
}

export default function LocationSearch({ onSearch }: LocationSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CityResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length > 2) {
        setIsSearching(true);
        try {
          // Open-Meteo free geocoding API
          const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=5&language=en&format=json`);
          const data = await res.json();
          if (data.results) {
            setResults(data.results);
            setShowDropdown(true);
          } else {
            setResults([]);
          }
        } catch (err) {
          console.error("Geocoding failed", err);
          setResults([]);
        } finally {
          setIsSearching(false);
        }
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelectCity = (city: CityResult) => {
    setQuery(`${city.name}, ${city.admin1 ? city.admin1 + ', ' : ''}${city.country}`);
    setShowDropdown(false);
    onSearch(city.latitude, city.longitude);
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setQuery("Current GPS Location");
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
    <div className="p-6 md:p-8 relative">
      <h2 className="text-xl font-bold mb-5 text-brand-950 dark:text-brand-50 flex items-center tracking-tight">
        <Building2 className="w-5 h-5 mr-2 text-brand-600 dark:text-brand-400" />
        Search by City
      </h2>
      
      <div className="relative" ref={dropdownRef}>
        <div className="relative flex items-center w-full">
          <Search className="absolute left-4 w-5 h-5 text-brand-400" />
          <input
            type="text"
            placeholder="Type a city name (e.g. Brisbane, Tokyo, Paris)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
            className="w-full p-4 pl-12 pr-12 border border-brand-200 dark:border-brand-700 bg-brand-50 dark:bg-brand-900/50 rounded-2xl focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all dark:text-white placeholder:text-brand-400/70 shadow-inner text-lg font-medium"
          />
          {isSearching && (
            <Loader2 className="absolute right-4 w-5 h-5 text-brand-500 animate-spin" />
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showDropdown && results.length > 0 && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-brand-200 dark:border-brand-700 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
            {results.map((city) => (
              <button
                key={city.id}
                onClick={() => handleSelectCity(city)}
                className="w-full text-left px-5 py-3 hover:bg-brand-50 dark:hover:bg-brand-800/50 flex flex-col transition-colors border-b border-brand-100 dark:border-brand-800/50 last:border-b-0 group"
              >
                <span className="font-bold text-brand-900 dark:text-brand-100 group-hover:text-brand-600 dark:group-hover:text-brand-300 transition-colors">
                  {city.name}
                </span>
                <span className="text-xs text-brand-500 dark:text-brand-400 mt-0.5">
                  {city.admin1 ? `${city.admin1}, ` : ''}{city.country}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-brand-100 dark:border-brand-800/50 pt-6">
        <p className="text-xs text-brand-400/80 font-medium">Or let us find you automatically</p>
        <button 
          onClick={handleUseCurrentLocation}
          className="text-sm flex items-center text-brand-600 dark:text-brand-400 hover:text-brand-800 dark:hover:text-brand-300 transition-colors font-semibold bg-brand-50 dark:bg-brand-900/30 border border-brand-200 dark:border-brand-800/50 rounded-full px-5 py-2.5 hover:bg-brand-100 dark:hover:bg-brand-800"
          type="button"
        >
          <MapPin className="w-4 h-4 mr-2" />
          Use GPS Location
        </button>
      </div>
    </div>
  );
}
