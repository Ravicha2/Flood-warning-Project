/**
 * App-wide theme: brand palette, light/dark mode, typography, spacing, responsive scaling.
 * Brand colors from CSS theme; background/foreground with dark mode support.
 */

import { Dimensions, PixelRatio } from 'react-native';

// Brand palette (from CSS theme)
export const Brand = {
  50: '#eff6ff',
  100: '#dbeafe',
  200: '#bfdbfe',
  300: '#93c5fd',
  400: '#60a5fa',
  500: '#3b82f6',
  600: '#2563eb',
  700: '#1d4ed8',
  800: '#1e40af',
  900: '#1e3a8a',
  950: '#172554',
} as const;

/** Light theme (default) */
export const LightColors = {
  ...Brand,
  primary: Brand[600],
  primaryLight: Brand[500],
  primaryDark: Brand[700],
  background: '#f8fafc',
  surface: '#ffffff',
  surfaceElevated: '#ffffff',
  text: '#0f172a',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  error: '#dc2626',
  errorLight: '#fef2f2',
  success: '#16a34a',
  successLight: '#f0fdf4',
  warning: '#ea580c',
  warningLight: '#fff7ed',
  low: '#16a34a',
  lowLight: '#f0fdf4',
  medium: '#ca8a04',
  mediumLight: '#fefce8',
  high: '#ea580c',
  highLight: '#fff7ed',
  critical: '#dc2626',
  criticalLight: '#fef2f2',
  border: '#e2e8f0',
  borderLight: '#f1f5f9',
};

/** Dark theme */
export const DarkColors = {
  ...Brand,
  primary: Brand[400],
  primaryLight: Brand[300],
  primaryDark: Brand[500],
  background: '#020617',
  surface: '#0f172a',
  surfaceElevated: '#1e293b',
  text: '#f8fafc',
  textSecondary: '#cbd5e1',
  textMuted: '#94a3b8',
  error: '#ef4444',
  errorLight: '#450a0a',
  success: '#22c55e',
  successLight: '#052e16',
  warning: '#f97316',
  warningLight: '#431407',
  low: '#22c55e',
  lowLight: '#052e16',
  medium: '#eab308',
  mediumLight: '#422006',
  high: '#f97316',
  highLight: '#431407',
  critical: '#ef4444',
  criticalLight: '#450a0a',
  border: '#334155',
  borderLight: '#1e293b',
};

export type ThemeColors = typeof LightColors;

/** Default export for components that don't use color scheme yet */
export const Colors: ThemeColors = LightColors;

export const RiskLevelColors: Record<string, string> = {
  low: Colors.low,
  medium: Colors.medium,
  high: Colors.high,
  critical: Colors.critical,
};

export const RiskLevelBgColors: Record<string, string> = {
  low: Colors.lowLight,
  medium: Colors.mediumLight,
  high: Colors.highLight,
  critical: Colors.criticalLight,
};

// Reference width for scaling (typical phone); clamp for SSR/small screens
const BASE_WIDTH = 390;
const win = Dimensions.get('window');
const SCREEN_WIDTH = win.width > 0 ? win.width : BASE_WIDTH;

/** Scale a number by screen width (responsive to mobile size) */
export function scale(size: number): number {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const newSize = size * Math.min(Math.max(ratio, 0.85), 1.15);
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
}

/** 8px grid — responsive */
export const Spacing = {
  get xs() { return scale(4); },
  get sm() { return scale(8); },
  get md() { return scale(16); },
  get lg() { return scale(24); },
  get xl() { return scale(32); },
  get xxl() { return scale(48); },
};

/** Base values for Spacing (use when you need fixed numbers in StyleSheet) */
export const SpacingBase = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** Border radius — responsive */
export const Radius = {
  get sm() { return scale(8); },
  get md() { return scale(12); },
  get lg() { return scale(16); },
  get xl() { return scale(20); },
  full: 9999,
};

export const RadiusBase = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

/** Typography — responsive font sizes */
export const FontSize = {
  get xs() { return scale(12); },
  get sm() { return scale(14); },
  get base() { return scale(16); },
  get lg() { return scale(18); },
  get xl() { return scale(20); },
  get xxl() { return scale(24); },
};

export const FontSizeBase = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
} as const;

export const FontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

/** Shadows */
export const Shadows = {
  sm: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
};

/** Max content width for readability on large screens */
export const CONTENT_MAX_WIDTH = Math.min(SCREEN_WIDTH * 0.95, 480);
