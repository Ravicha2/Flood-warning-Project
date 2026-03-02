/**
 * Check my risk: device location or manual lat/lon, POST /location/check-location,
 * display risk, nearest sensor, water level, active boundaries, "Get evacuation route" button.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import * as Location from 'expo-location';
import { checkLocation, getEvacuationRoutes } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Colors, RiskLevelColors, RiskLevelBgColors, Spacing, Radius, FontSize, FontWeight, Shadows, CONTENT_MAX_WIDTH } from '../../constants/Theme';
import type { LocationCheckResponse } from '../../types/api';

export default function CheckRiskScreen() {
  const { colors } = useTheme();
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [result, setResult] = useState<LocationCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [evacuationWaypoints, setEvacuationWaypoints] = useState<{ lat: number; lon: number }[]>([]);

  const doCheck = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setResult(null);
    setEvacuationWaypoints([]);
    try {
      const res = await checkLocation({
        latitude,
        longitude,
        radius_km: 5,
      });
      setResult(res);
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const useMyLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow location access to check risk at your position.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    setLat(String(latitude));
    setLon(String(longitude));
    await doCheck(latitude, longitude);
  }, [doCheck]);

  const submitManual = useCallback(() => {
    const la = parseFloat(lat);
    const lo = parseFloat(lon);
    if (Number.isNaN(la) || Number.isNaN(lo) || la < -90 || la > 90 || lo < -180 || lo > 180) {
      Alert.alert('Invalid input', 'Enter valid latitude (-90 to 90) and longitude (-180 to 180).');
      return;
    }
    doCheck(la, lo);
  }, [lat, lon, doCheck]);

  const getRoute = useCallback(async () => {
    if (!result) return;
    setRouteLoading(true);
    try {
      const res = await getEvacuationRoutes(result.latitude, result.longitude);
      setEvacuationWaypoints(res.waypoints);
    } catch (e) {
      Alert.alert('Evacuation route', (e as Error).message);
    } finally {
      setRouteLoading(false);
    }
  }, [result]);

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, styles.contentResponsive]} showsVerticalScrollIndicator={false}>
      <View style={[styles.card, styles.section, styles.locationCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
        <Text style={[styles.sectionHint, { color: colors.textSecondary }]}>Enter coordinates or use your current location</Text>
        <View style={styles.row}>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Latitude"
            placeholderTextColor={colors.textMuted}
            value={lat}
            onChangeText={setLat}
            keyboardType="numeric"
          />
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            placeholder="Longitude"
            placeholderTextColor={colors.textMuted}
            value={lon}
            onChangeText={setLon}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.buttonPrimary, { backgroundColor: colors.primary }]} onPress={useMyLocation} disabled={loading} activeOpacity={0.85}>
            <Text style={styles.buttonPrimaryText} numberOfLines={1}>Use my location</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.buttonSecondary, { backgroundColor: colors.surface, borderColor: colors.primary }]} onPress={submitManual} disabled={loading} activeOpacity={0.85}>
            <Text style={[styles.buttonSecondaryText, { color: colors.primary }]} numberOfLines={1}>Check this point</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Checking risk…</Text>
        </View>
      )}

      {result && !loading && (
        <View style={[styles.card, styles.result, { backgroundColor: colors.surface }]}>
          <Text style={[styles.resultTitle, { color: colors.text }]}>Risk assessment</Text>
          <View style={[styles.riskBadge, { backgroundColor: RiskLevelBgColors[result.risk_level] ?? colors.background }]}>
            <View style={[styles.riskBadgeDot, { backgroundColor: RiskLevelColors[result.risk_level] ?? colors.primary }]} />
            <Text style={[styles.riskBadgeText, { color: RiskLevelColors[result.risk_level] ?? colors.primary }]}>
              {result.risk_level.toUpperCase()}
            </Text>
          </View>
          {result.message ? <Text style={[styles.message, { color: colors.text }]}>{result.message}</Text> : null}
          <View style={styles.details}>
            {result.nearest_sensor_id && (
              <Text style={[styles.detail, { color: colors.textSecondary }]}>Nearest sensor: {result.nearest_sensor_id}</Text>
            )}
            {result.water_level_m != null && (
              <Text style={[styles.detail, { color: colors.textSecondary }]}>Water level: {result.water_level_m} m</Text>
            )}
            {result.predicted_flood_time && (
              <Text style={[styles.detail, { color: colors.textSecondary }]}>Predicted flood time: {result.predicted_flood_time}</Text>
            )}
            {result.active_boundaries.length > 0 && (
              <Text style={[styles.detail, { color: colors.textSecondary }]}>Active boundaries: {result.active_boundaries.join(', ')}</Text>
            )}
          </View>

          <TouchableOpacity
            style={[styles.evacButton, { backgroundColor: colors.high }]}
            onPress={getRoute}
            disabled={routeLoading}
            activeOpacity={0.85}
          >
            {routeLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.evacButtonText}>Get evacuation route</Text>
            )}
          </TouchableOpacity>

          {evacuationWaypoints.length > 0 && (
            <View style={[styles.waypoints, { borderTopColor: colors.borderLight }]}>
              <Text style={[styles.waypointsTitle, { color: colors.text }]}>Route waypoints</Text>
              {evacuationWaypoints.slice(0, 10).map((w, i) => (
                <Text key={i} style={[styles.waypoint, { color: colors.textSecondary }]}>
                  {i + 1}. {w.lat.toFixed(5)}, {w.lon.toFixed(5)}
                </Text>
              ))}
              {evacuationWaypoints.length > 10 && (
                <Text style={[styles.waypoint, { color: colors.textSecondary }]}>… and {evacuationWaypoints.length - 10} more</Text>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  contentResponsive: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  locationCard: {
    minWidth: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  sectionHint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    minWidth: 0,
  },
  input: {
    flex: 1,
    minWidth: 120,
    maxWidth: '100%',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.base,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    minWidth: 0,
  },
  buttonPrimary: {
    flex: 1,
    minWidth: 120,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  buttonPrimaryText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  buttonSecondary: {
    flex: 1,
    minWidth: 120,
    borderWidth: 1.5,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  buttonSecondaryText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  loading: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
  },
  result: {
    marginTop: Spacing.sm,
  },
  resultTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    marginBottom: Spacing.md,
  },
  riskBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
  },
  riskBadgeText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
  },
  message: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  details: {
    marginBottom: Spacing.sm,
  },
  detail: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  evacButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  evacButtonText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  waypoints: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
  },
  waypointsTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  waypoint: {
    fontSize: FontSize.xs,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});
