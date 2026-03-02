/**
 * Theme context: colors from manual theme (light/dark/system) with persistence.
 * Use useTheme() for colors and setThemeMode() to change theme from the navbar.
 */
import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LightColors, DarkColors, type ThemeColors } from '../constants/Theme';

const THEME_STORAGE_KEY = '@flood_warning_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  colors: ThemeColors;
  colorScheme: 'light' | 'dark' | null;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

async function getStoredThemeMode(): Promise<ThemeMode> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch (_) {}
  return 'system';
}

async function setStoredThemeMode(mode: ThemeMode): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch (_) {}
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('system');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getStoredThemeMode().then((mode) => {
      setThemeModeState(mode);
      setLoaded(true);
    });
  }, []);

  const setThemeMode = React.useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    setStoredThemeMode(mode);
  }, []);

  const effectiveScheme = useMemo(() => {
    if (!loaded) return systemScheme ?? 'light';
    if (themeMode === 'system') return systemScheme ?? 'light';
    return themeMode;
  }, [loaded, themeMode, systemScheme]);

  const colors = effectiveScheme === 'dark' ? DarkColors : LightColors;
  const colorScheme = effectiveScheme;
  const value: ThemeContextValue = { colors, colorScheme, themeMode, setThemeMode };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    return {
      colors: LightColors,
      colorScheme: 'light',
      themeMode: 'system',
      setThemeMode: () => {},
    };
  }
  return ctx;
}
