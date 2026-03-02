/**
 * Theme context: provides colors based on system light/dark preference.
 * Use useTheme() for colors; layout (Spacing, Radius, FontSize) from Theme.ts.
 */
import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
import { LightColors, DarkColors, type ThemeColors } from '../constants/Theme';

type ThemeContextValue = { colors: ThemeColors; colorScheme: 'light' | 'dark' | null };

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const scheme = useColorScheme();
  const colors = scheme === 'dark' ? DarkColors : LightColors;
  const value: ThemeContextValue = { colors, colorScheme: scheme };
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) return { colors: LightColors, colorScheme: 'light' as const };
  return ctx;
}
