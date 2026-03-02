/**
 * Map screen: flood boundaries, user location, quick-go-to regions (Queensland, Sumatra, Hat Yai),
 * optional predictions and "Check risk here" tap. Native only (iOS/Android); see index.web.tsx for web.
 * In Expo Go, react-native-maps is not available — we show a fallback and suggest a development build.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { getFloodBoundaries, getPredictions, checkLocation } from '../../services/api';
import { useRegion } from '../../context/RegionContext';
import { EMS_RASTER_TILE_URL } from '../../constants/ElasticMap';
import { Colors, RiskLevelColors, Spacing, Radius, FontSize, FontWeight, Shadows } from '../../constants/Theme';
import type { FloodBoundaryItem, PredictionItem, LocationCheckResponse } from '../../types/api';

const isExpoGo = Constants.appOwnership === 'expo';

function geometryToCoordinates(geometry: { type: string; coordinates: number[] | number[][] | number[][][] }): { latitude: number; longitude: number }[] {
  const coords = geometry.coordinates;
  if (!coords || coords.length === 0) return [];
  if (geometry.type === 'Polygon' && Array.isArray(coords[0]) && Array.isArray(coords[0][0])) {
    const ring = (coords as number[][][])[0];
    return ring.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  }
  if (geometry.type === 'Polygon' && Array.isArray(coords[0]) && typeof coords[0][0] === 'number') {
    const ring = coords as number[][];
    return ring.map(([lon, lat]) => ({ latitude: lat, longitude: lon }));
  }
  if (geometry.type === 'Point' && Array.isArray(coords) && coords.length >= 2) {
    return [{ latitude: (coords as number[])[1], longitude: (coords as number[])[0] }];
  }
  return [];
}

const INITIAL_REGION = {
  latitude: -27.4698,
  longitude: 153.0251,
  latitudeDelta: 0.8,
  longitudeDelta: 0.8,
};

/** Shown in Expo Go where react-native-maps is not available */
function MapExpoGoFallback() {
  return (
    <View style={styles.container}>
      <View style={styles.expoGoCard}>
        <Text style={styles.expoGoTitle}>Map</Text>
        <Text style={styles.expoGoMessage}>
          The interactive map is not available in Expo Go. To use the full map with flood boundaries and regions (Queensland, Sumatra, Hat Yai), run a development build:
        </Text>
        <Text style={styles.expoGoCode}>npx expo prebuild</Text>
        <Text style={styles.expoGoCode}>npx expo run:ios</Text>
        <Text style={styles.expoGoHint}>Use the Risk and Predictions tabs in the meantime.</Text>
      </View>
    </View>
  );
}

export default function MapScreen() {
  if (isExpoGo) {
    return <MapExpoGoFallback />;
  }
  return <MapScreenWithMaps />;
}

function MapScreenWithMaps() {
  const MapView = require('react-native-maps').default;
  const UrlTile = require('react-native-maps').UrlTile;
  const Polygon = require('react-native-maps').Polygon;
  const Circle = require('react-native-maps').Circle;
  const PROVIDER_DEFAULT = require('react-native-maps').PROVIDER_DEFAULT;

  const [boundaries, setBoundaries] = useState<FloodBoundaryItem[]>([]);
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [riskResult, setRiskResult] = useState<LocationCheckResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingRisk, setLoadingRisk] = useState(false);
  const [mapRef, setMapRef] = useState<unknown>(null);
  const { presets, selectedPresetId } = useRegion();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [boundRes, predRes] = await Promise.all([
        getFloodBoundaries({ active_only: true }),
        getPredictions({ hours_ahead: 6 }),
      ]);
      setBoundaries(boundRes.boundaries);
      setPredictions(predRes.predictions);
    } catch (e) {
      console.warn('Map data load failed:', e);
      setBoundaries([]);
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({});
      setUserLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    })();
  }, []);

  // Fly to region when user selects a location from navbar search
  useEffect(() => {
    if (!mapRef || !selectedPresetId) return;
    const preset = presets.find((p) => p.id === selectedPresetId);
    if (!preset) return;
    (mapRef as { animateToRegion: (r: object) => void }).animateToRegion({
      latitude: preset.latitude,
      longitude: preset.longitude,
      latitudeDelta: preset.latitudeDelta,
      longitudeDelta: preset.longitudeDelta,
    });
  }, [selectedPresetId, presets, mapRef]);

  const checkRiskHere = useCallback(async (lat: number, lon: number) => {
    setLoadingRisk(true);
    try {
      const res = await checkLocation({ latitude: lat, longitude: lon });
      setRiskResult(res);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoadingRisk(false);
    }
  }, []);

  return (
    <View style={styles.container}>
      <MapView
        ref={setMapRef}
        style={styles.map}
        provider={PROVIDER_DEFAULT}
        initialRegion={INITIAL_REGION}
        showsUserLocation
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          checkRiskHere(latitude, longitude);
        }}
      >
        <UrlTile urlTemplate={EMS_RASTER_TILE_URL} maximumZ={10} />
        {boundaries.map((b) => {
          const coords = geometryToCoordinates(b.geometry);
          if (coords.length < 3) return null;
          return (
            <Polygon
              key={b.boundary_id}
              coordinates={coords}
              fillColor={RiskLevelColors[b.risk_level] ?? Colors.primary}
              strokeColor={Colors.primaryDark}
              strokeWidth={1}
            />
          );
        })}
        {predictions.slice(0, 50).map((p) => (
          <Circle
            key={p.prediction_id}
            center={{ latitude: p.latitude, longitude: p.longitude }}
            radius={800}
            fillColor={`${RiskLevelColors[p.predicted_risk_level] ?? Colors.primary}40`}
            strokeColor={RiskLevelColors[p.predicted_risk_level] ?? Colors.primary}
            strokeWidth={2}
          />
        ))}
      </MapView>

      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.overlayText}>Loading boundaries…</Text>
        </View>
      )}

      {loadingRisk && (
        <View style={styles.riskLoading}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.riskLoadingText}>Checking risk…</Text>
        </View>
      )}

      {riskResult && !loadingRisk && (
        <View style={styles.riskCard}>
          <Text style={styles.riskTitle}>Risk at tapped point</Text>
          <Text style={[styles.riskLevel, { color: RiskLevelColors[riskResult.risk_level] }]}>
            {riskResult.risk_level.toUpperCase()}
          </Text>
          {riskResult.nearest_sensor_id && (
            <Text style={styles.riskDetail}>Nearest sensor: {riskResult.nearest_sensor_id}</Text>
          )}
          {riskResult.water_level_m != null && (
            <Text style={styles.riskDetail}>Water level: {riskResult.water_level_m} m</Text>
          )}
          <TouchableOpacity
            style={styles.dismissRisk}
            onPress={() => setRiskResult(null)}
          >
            <Text style={styles.dismissRiskText}>Dismiss</Text>
          </TouchableOpacity>
        </View>
      )}

      <Text style={styles.hint}>Long-press map to check risk at that point</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  expoGoCard: {
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.lg,
    margin: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 0,
    ...Shadows.md,
  },
  expoGoTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text,
    marginBottom: Spacing.sm,
  },
  expoGoMessage: {
    fontSize: FontSize.base,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  expoGoCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: FontSize.sm,
    backgroundColor: Colors.background,
    padding: Spacing.sm + 2,
    borderRadius: Radius.sm,
    marginBottom: Spacing.sm,
    color: Colors.text,
  },
  expoGoHint: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
  },
  map: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
    color: Colors.text,
  },
  riskLoading: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  riskLoadingText: {
    color: '#fff',
    fontSize: FontSize.sm,
  },
  riskCard: {
    position: 'absolute',
    bottom: Spacing.lg,
    left: Spacing.md,
    right: Spacing.md,
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    ...Shadows.lg,
  },
  riskTitle: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  riskLevel: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  riskDetail: {
    fontSize: FontSize.sm,
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  dismissRisk: {
    marginTop: Spacing.sm,
    alignSelf: 'flex-end',
  },
  dismissRiskText: {
    color: Colors.primary,
    fontWeight: FontWeight.semibold,
  },
  hint: {
    position: 'absolute',
    bottom: Spacing.sm,
    alignSelf: 'center',
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
  },
});
