/**
 * Web map using Elastic Maps Service (EMS) via MapLibre GL.
 * Uses EMS vector basemap styles (Light/Classic/Dark). Same preset regions as native.
 */
import React, { useState, useRef, useEffect, createElement } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { REGION_PRESETS } from '../constants/Regions';
import { EMS_DEFAULT_STYLE, EMS_STYLES, EMS_TOS_PARAMS, EMS_ORIGIN, EMS_STYLE_BASE } from '../constants/ElasticMap';
import { Colors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../constants/Theme';

if (Platform.OS !== 'web') {
  // No-op on native; native map is in index.native.tsx
}

const INITIAL_CENTER: [number, number] = [153.0251, -27.4698];
const INITIAL_ZOOM = 10;

/** Resolve relative URLs in EMS style and append ToS params so tiles/sprite/glyphs load. */
function resolveEmsStyle(style: Record<string, unknown>, styleBase: string): Record<string, unknown> {
  const base = styleBase.endsWith('/') ? styleBase : `${styleBase}/`;
  const addParams = (url: string) => (url.includes('?') ? `${url}&${EMS_TOS_PARAMS}` : `${url}?${EMS_TOS_PARAMS}`);

  const out = { ...style };

  if (typeof style.sprite === 'string' && style.sprite.startsWith('/')) {
    out.sprite = addParams(`${EMS_ORIGIN}${style.sprite}`);
  } else if (typeof style.sprite === 'string' && !style.sprite.startsWith('http')) {
    out.sprite = addParams(new URL(style.sprite, base).href);
  }

  if (typeof style.glyphs === 'string' && style.glyphs.startsWith('/')) {
    out.glyphs = addParams(`${EMS_ORIGIN}${style.glyphs}`);
  } else if (typeof style.glyphs === 'string' && !style.glyphs.startsWith('http')) {
    out.glyphs = addParams(new URL(style.glyphs, base).href);
  }

  if (style.sources && typeof style.sources === 'object') {
    const sources: Record<string, unknown> = {};
    for (const [id, src] of Object.entries(style.sources)) {
      const s = src as Record<string, unknown>;
      if (s?.url && typeof s.url === 'string') {
        const resolved = s.url.startsWith('/') ? `${EMS_ORIGIN}${s.url}` : new URL(s.url, base).href;
        sources[id] = { ...s, url: addParams(resolved) };
      } else {
        sources[id] = s;
      }
    }
    out.sources = sources;
  }

  return out;
}

/** Fallback style when EMS fails (OSM-based, no auth). */
const FALLBACK_STYLE = 'https://demotiles.maplibre.org/styles/osm-bright-gl-style/style.json';

export function WebMapView() {
  const [region, setRegion] = useState(REGION_PRESETS[0]);
  const [styleKey, setStyleKey] = useState<keyof typeof EMS_STYLES>('light');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = containerRef.current;
    if (!el) return;

    // Ensure MapLibre GL CSS is loaded (web only)
    if (typeof document !== 'undefined' && !document.getElementById('maplibre-gl-css')) {
      const link = document.createElement('link');
      link.id = 'maplibre-gl-css';
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css';
      document.head.appendChild(link);
    }

    const { width: winW, height: winH } = Dimensions.get('window');
    const fallbackH = typeof winH === 'number' ? Math.max(400, winH - 200) : 500;
    const fallbackW = typeof winW === 'number' ? winW : 800;
    el.style.width = el.offsetWidth ? `${el.offsetWidth}px` : `${fallbackW}px`;
    el.style.height = el.offsetHeight ? `${el.offsetHeight}px` : `${fallbackH}px`;

    const maplibregl = require('maplibre-gl');

    let mapInstance: InstanceType<typeof maplibregl.Map> | null = null;
    const resizeObs = typeof window !== 'undefined' && window.ResizeObserver
      ? new window.ResizeObserver(() => {
          if (mapRef.current) (mapRef.current as { resize: () => void }).resize();
        })
      : null;
    if (resizeObs && el) resizeObs.observe(el);

    const initMapWithStyle = (style: string | Record<string, unknown>) => {
      mapInstance = new maplibregl.Map({
        container: el,
        style,
        center: INITIAL_CENTER,
        zoom: INITIAL_ZOOM,
        transformRequest: (url: string) => {
          if (url.startsWith(EMS_ORIGIN)) {
            const sep = url.includes('?') ? '&' : '?';
            return { url: `${url}${sep}${EMS_TOS_PARAMS}` };
          }
          return { url };
        },
      });
      mapInstance.addControl(new maplibregl.NavigationControl(), 'top-right');
      mapRef.current = mapInstance;
      mapInstance.on('load', () => mapInstance?.resize());
    };

    fetch(EMS_DEFAULT_STYLE)
      .then((res) => res.json())
      .then((styleJson) => {
        const resolved = resolveEmsStyle(styleJson as Record<string, unknown>, EMS_STYLE_BASE);
        initMapWithStyle(resolved);
      })
      .catch(() => {
        initMapWithStyle(FALLBACK_STYLE);
      });

    return () => {
      if (resizeObs && el) resizeObs.unobserve(el);
      if (mapInstance) {
        mapInstance.remove();
        mapInstance = null;
      }
      mapRef.current = null;
    };
  }, []);

  // Update map style when styleKey changes (fetch + resolve so tiles load)
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;
    const url = EMS_STYLES[styleKey];
    fetch(url)
      .then((res) => res.json())
      .then((styleJson) => {
        const resolved = resolveEmsStyle(styleJson as Record<string, unknown>, EMS_STYLE_BASE);
        (mapRef.current as { setStyle: (s: Record<string, unknown>) => void })?.setStyle(resolved);
      })
      .catch(() => {});
  }, [styleKey]);

  // Fly to preset region
  useEffect(() => {
    if (Platform.OS !== 'web' || !mapRef.current) return;
    const map = mapRef.current as { flyTo: (o: { center: [number, number]; zoom: number; duration?: number }) => void };
    const preset = REGION_PRESETS.find((p) => p.id === region.id) ?? REGION_PRESETS[0];
    const zoom = Math.round(10 - Math.log2(preset.longitudeDelta));
    map.flyTo({ center: [preset.longitude, preset.latitude], zoom: Math.min(14, Math.max(4, zoom)), duration: 800 });
  }, [region.id]);

  if (Platform.OS !== 'web') {
    return null;
  }

  // Explicit dimensions so MapLibre has a non-zero container (flex % can resolve to 0 before layout)
  const { width: winW, height: winH } = Dimensions.get('window');
  const mapHeight = typeof winH === 'number' ? Math.max(400, winH - 200) : 500;
  const mapContainerStyle = {
    width: '100%',
    height: mapHeight,
    minHeight: 400,
  };

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {REGION_PRESETS.map((preset) => (
          <TouchableOpacity
            key={preset.id}
            style={[styles.chip, region.id === preset.id && styles.chipActive]}
            onPress={() => setRegion(preset)}
            activeOpacity={0.85}
          >
            <Text style={[styles.chipText, region.id === preset.id && styles.chipTextActive]}>{preset.name}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.styleChips}>
          {(Object.keys(EMS_STYLES) as Array<keyof typeof EMS_STYLES>).map((key) => (
            <TouchableOpacity
              key={key}
              style={[styles.styleChip, styleKey === key && styles.chipActive]}
              onPress={() => setStyleKey(key)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, styleKey === key && styles.chipTextActive]}>{key}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <View style={styles.mapContainer}>
        {createElement('div', { ref: containerRef, style: mapContainerStyle })}
      </View>
      <Text style={styles.hint}>
        Basemap: Elastic Maps Service. Quick go to: Queensland, Sumatra, Hat Yai. Use the Risk tab to check your location.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.full,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  styleChips: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  styleChip: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.borderLight,
    borderRadius: Radius.sm,
  },
  chipText: {
    color: Colors.text,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  chipTextActive: {
    color: '#fff',
  },
  mapContainer: {
    flex: 1,
    minHeight: 400,
    ...(Platform.OS === 'web' ? { height: '100%' as const } : {}),
  },
  hint: {
    padding: Spacing.sm,
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});
