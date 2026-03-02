/**
 * Map basemap style (EMS): light, classic, dark, lightBlue, darkBlue.
 * Used by the navbar "map theme" control and by WebMapView / native map.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { EMS_STYLES } from '../constants/ElasticMap';

const MAP_THEME_STORAGE_KEY = '@flood_warning_map_style';

export type MapStyleKey = keyof typeof EMS_STYLES;

const MAP_STYLE_KEYS: MapStyleKey[] = ['light', 'classic', 'dark', 'lightBlue', 'darkBlue'];

type MapThemeContextValue = {
  mapStyleKey: MapStyleKey;
  setMapStyleKey: (key: MapStyleKey) => void;
  cycleMapStyle: () => void;
};

const MapThemeContext = createContext<MapThemeContextValue | null>(null);

async function getStoredMapStyle(): Promise<MapStyleKey> {
  try {
    const stored = await AsyncStorage.getItem(MAP_THEME_STORAGE_KEY);
    if (stored && MAP_STYLE_KEYS.includes(stored as MapStyleKey)) return stored as MapStyleKey;
  } catch (_) {}
  return 'light';
}

async function setStoredMapStyle(key: MapStyleKey): Promise<void> {
  try {
    await AsyncStorage.setItem(MAP_THEME_STORAGE_KEY, key);
  } catch (_) {}
}

export function MapThemeProvider({ children }: { children: React.ReactNode }) {
  const [mapStyleKey, setMapStyleKeyState] = useState<MapStyleKey>('light');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getStoredMapStyle().then((key) => {
      setMapStyleKeyState(key);
      setLoaded(true);
    });
  }, []);

  const setMapStyleKey = useCallback((key: MapStyleKey) => {
    setMapStyleKeyState(key);
    setStoredMapStyle(key);
  }, []);

  const cycleMapStyle = useCallback(() => {
    const idx = MAP_STYLE_KEYS.indexOf(mapStyleKey);
    const next = MAP_STYLE_KEYS[(idx + 1) % MAP_STYLE_KEYS.length];
    setMapStyleKeyState(next);
    setStoredMapStyle(next);
  }, [mapStyleKey]);

  const value: MapThemeContextValue = { mapStyleKey, setMapStyleKey, cycleMapStyle };
  return <MapThemeContext.Provider value={value}>{children}</MapThemeContext.Provider>;
}

export function useMapTheme(): MapThemeContextValue {
  const ctx = useContext(MapThemeContext);
  if (!ctx) {
    return {
      mapStyleKey: 'light',
      setMapStyleKey: () => {},
      cycleMapStyle: () => {},
    };
  }
  return ctx;
}

export { MAP_STYLE_KEYS };
