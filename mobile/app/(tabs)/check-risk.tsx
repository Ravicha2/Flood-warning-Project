/**
 * Check Flood Risk — search by city (Open-Meteo geocoding) or use current location.
 */
import React, { useState, useCallback, useEffect } from 'react';
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
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { checkLocation, getEvacuationRoutes } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { RiskLevelColors, RiskLevelBgColors, Spacing, Radius, FontSize, FontWeight, Shadows, CONTENT_MAX_WIDTH } from '../../constants/Theme';
import type { LocationCheckResponse } from '../../types/api';

const GEOCODING_URL = 'https://geocoding-api.open-meteo.com/v1/search';

interface CityResult {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

const RISK_LABELS: Record<string, string> = {
  low: 'Low Risk Area',
  medium: 'Medium Risk Area',
  high: 'High Risk Warning',
  critical: 'Critical Alert Level',
};

const RISK_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  low: 'checkmark-circle',
  medium: 'information-circle',
  high: 'warning',
  critical: 'alert-circle',
};

export default function CheckRiskScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [cityQuery, setCityQuery] = useState('');
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [citySearching, setCitySearching] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [result, setResult] = useState<LocationCheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [routeLoading, setRouteLoading] = useState(false);
  const [evacuationWaypoints, setEvacuationWaypoints] = useState<{ lat: number; lon: number }[]>([]);

  const doCheck = useCallback(async (latitude: number, longitude: number) => {
    setLoading(true);
    setResult(null);
    setEvacuationWaypoints([]);
    setShowCityDropdown(false);
    Keyboard.dismiss();
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

  // Debounced city search via Open-Meteo geocoding
  useEffect(() => {
    const q = cityQuery.trim();
    if (q.length < 3) {
      setCityResults([]);
      setShowCityDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCitySearching(true);
      try {
        const res = await fetch(
          `${GEOCODING_URL}?name=${encodeURIComponent(q)}&count=8&language=en&format=json`
        );
        const data = (await res.json()) as { results?: CityResult[] };
        setCityResults(data.results ?? []);
        setShowCityDropdown(true);
      } catch {
        setCityResults([]);
      } finally {
        setCitySearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [cityQuery]);

  const onSelectCity = useCallback(
    (city: CityResult) => {
      setCityQuery(`${city.name}${city.admin1 ? `, ${city.admin1}` : ''}, ${city.country}`);
      setShowCityDropdown(false);
      doCheck(city.latitude, city.longitude);
    },
    [doCheck]
  );

  const useMyLocation = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow location access to check risk at your position.');
      return;
    }
    const loc = await Location.getCurrentPositionAsync({});
    const { latitude, longitude } = loc.coords;
    setCityQuery('Current location');
    await doCheck(latitude, longitude);
  }, [doCheck]);

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

  const viewRouteOnMap = useCallback(() => {
    router.replace('/(tabs)');
  }, [router]);

  const hasEvacuation = (result?.evacuation_route?.length ?? 0) > 0 || evacuationWaypoints.length > 0;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={[styles.content, styles.contentResponsive]} showsVerticalScrollIndicator={false}>
      {/* Title block — matches frontend */}
      <View style={styles.titleBlock}>
        <Text style={[styles.pageTitle, { color: colors.text }]}>Check Flood Risk</Text>
        <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
          Search by city or use your location to evaluate flood risks.
        </Text>
      </View>

      {/* Search card — compact and tidy */}
      <View style={[styles.searchCard, { backgroundColor: colors.surface }]}>
        <Text style={[styles.searchLabel, { color: colors.text }]}>Where to check?</Text>
        <Text style={[styles.searchHint, { color: colors.textMuted }]}>City name (e.g. Brisbane, Tokyo)</Text>
        <View style={[styles.searchBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <Ionicons name="search" size={20} color={colors.textMuted} style={styles.searchBoxIcon} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search city…"
            placeholderTextColor={colors.textMuted}
            value={cityQuery}
            onChangeText={setCityQuery}
            onFocus={() => cityResults.length > 0 && setShowCityDropdown(true)}
          />
          {citySearching ? (
            <ActivityIndicator size="small" color={colors.primary} style={styles.searchSpinner} />
          ) : (
            cityQuery.length >= 3 && (
              <TouchableOpacity hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} onPress={() => { setCityQuery(''); setShowCityDropdown(false); }}>
                <Ionicons name="close-circle" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            )
          )}
        </View>
        {showCityDropdown && cityResults.length > 0 && (
          <View style={[styles.dropdown, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {cityResults.map((city) => (
              <TouchableOpacity
                key={city.id}
                style={[styles.dropdownRow, { borderBottomColor: colors.borderLight }]}
                onPress={() => onSelectCity(city)}
                activeOpacity={0.6}
              >
                <Ionicons name="location" size={16} color={colors.textMuted} style={styles.dropdownIcon} />
                <View style={styles.dropdownText}>
                  <Text style={[styles.dropdownName, { color: colors.text }]} numberOfLines={1}>{city.name}</Text>
                  <Text style={[styles.dropdownMeta, { color: colors.textMuted }]} numberOfLines={1}>
                    {[city.admin1, city.country].filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={[styles.gpsRow, { borderTopColor: colors.borderLight }]}
          onPress={useMyLocation}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Ionicons name="locate" size={18} color={colors.primary} />
          <Text style={[styles.gpsLabel, { color: colors.primary }]}>Use my current location</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={[styles.loading, { backgroundColor: colors.surface }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Analyzing flood data…</Text>
        </View>
      )}

      {result && !loading && (
        <>
          {/* RiskAlert-style card — matches frontend */}
          <View
            style={[
              styles.riskAlertCard,
              {
                backgroundColor: RiskLevelBgColors[result.risk_level] ?? colors.surface,
                borderColor: RiskLevelColors[result.risk_level] ?? colors.border,
              },
            ]}
          >
            <View style={[styles.riskAlertIconWrap, { backgroundColor: colors.surface }]}>
              <Ionicons name={RISK_ICONS[result.risk_level] ?? 'information-circle'} size={28} color={RiskLevelColors[result.risk_level] ?? colors.primary} />
            </View>
            <View style={styles.riskAlertText}>
              <Text style={[styles.riskAlertLabel, { color: colors.text }]}>{RISK_LABELS[result.risk_level] ?? result.risk_level}</Text>
              {result.message ? <Text style={[styles.riskAlertMessage, { color: colors.textSecondary }]}>{result.message}</Text> : null}
            </View>
          </View>

          {/* Water Level + Estimated Strike cards — frontend grid layout */}
          <View style={styles.infoGrid}>
            {typeof result.water_level_m === 'number' && (
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.infoCardIconWrap, { backgroundColor: colors.primaryLight + '30' }]}>
                  <Ionicons name="water" size={24} color={colors.primary} />
                </View>
                <View style={styles.infoCardBody}>
                  <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Water level</Text>
                  <Text style={[styles.infoCardValue, { color: colors.text }]}>{result.water_level_m.toFixed(2)}<Text style={[styles.infoCardUnit, { color: colors.textMuted }]}> m</Text></Text>
                </View>
              </View>
            )}
            {result.predicted_flood_time && (
              <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.infoCardIconWrap, { backgroundColor: colors.warningLight }]}>
                  <Ionicons name="time" size={24} color={colors.warning} />
                </View>
                <View style={styles.infoCardBody}>
                  <Text style={[styles.infoCardLabel, { color: colors.textSecondary }]}>Estimated strike</Text>
                  <Text style={[styles.infoCardValue, { color: colors.text }]} numberOfLines={1}>
                    {new Date(result.predicted_flood_time).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Details row */}
          <View style={[styles.detailsCard, { backgroundColor: colors.surface }]}>
            {result.nearest_sensor_id && (
              <Text style={[styles.detail, { color: colors.textSecondary }]}>Nearest sensor: {result.nearest_sensor_id}</Text>
            )}
            {result.active_boundaries.length > 0 && (
              <Text style={[styles.detail, { color: colors.textSecondary }]} numberOfLines={2}>Active boundaries: {result.active_boundaries.join(', ')}</Text>
            )}
          </View>

          {/* Get evacuation route button */}
          <TouchableOpacity
            style={[styles.evacButton, { backgroundColor: colors.high }]}
            onPress={getRoute}
            disabled={routeLoading}
            activeOpacity={0.85}
          >
            {routeLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="navigate" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.evacButtonText}>Get evacuation route</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Safe Evacuation Route Found — matches frontend */}
          {hasEvacuation && (
            <View style={[styles.evacPanel, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <View style={styles.evacPanelHeader}>
                <Ionicons name="navigate-circle" size={24} color={colors.primary} />
                <Text style={[styles.evacPanelTitle, { color: colors.text }]}>Safe Evacuation Route Found</Text>
              </View>
              <Text style={[styles.evacPanelDesc, { color: colors.textSecondary }]}>
                A secure path avoiding critical flood zones has been calculated.
              </Text>
              <TouchableOpacity style={[styles.viewOnMapButton, { backgroundColor: colors.primary }]} onPress={viewRouteOnMap} activeOpacity={0.85}>
                <Text style={styles.viewOnMapText}>View on map</Text>
                <Ionicons name="map" size={18} color="#fff" />
              </TouchableOpacity>
              {evacuationWaypoints.length > 0 && (
                <View style={[styles.waypoints, { borderTopColor: colors.borderLight }]}>
                  <Text style={[styles.waypointsTitle, { color: colors.text }]}>Route waypoints</Text>
                  {evacuationWaypoints.slice(0, 8).map((w, i) => (
                    <Text key={i} style={[styles.waypoint, { color: colors.textMuted }]}>
                      {i + 1}. {w.lat.toFixed(5)}, {w.lon.toFixed(5)}
                    </Text>
                  ))}
                  {evacuationWaypoints.length > 8 && (
                    <Text style={[styles.waypoint, { color: colors.textMuted }]}>… and {evacuationWaypoints.length - 8} more</Text>
                  )}
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  contentResponsive: { maxWidth: CONTENT_MAX_WIDTH, width: '100%', alignSelf: 'center' },
  titleBlock: { marginBottom: Spacing.lg, paddingHorizontal: Spacing.xs },
  pageTitle: { fontSize: FontSize.xxl, fontWeight: FontWeight.bold, marginBottom: Spacing.xs },
  pageSubtitle: { fontSize: FontSize.base, lineHeight: 22 },
  card: { borderRadius: Radius.lg, padding: Spacing.lg, ...Shadows.sm },
  section: { marginBottom: Spacing.lg },
  locationCard: { minWidth: 0, overflow: 'hidden' },
  sectionTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.semibold, marginBottom: Spacing.xs },
  searchCard: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    minWidth: 0,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  searchLabel: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  searchHint: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    minHeight: 48,
  },
  searchBoxIcon: { marginRight: Spacing.sm },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.sm,
    fontSize: FontSize.base,
    ...(Platform.OS === 'web' ? { outlineStyle: 'none' } : {}),
  },
  searchSpinner: { marginLeft: Spacing.xs },
  dropdown: {
    marginTop: Spacing.sm,
    borderRadius: Radius.md,
    borderWidth: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: 1,
  },
  dropdownIcon: { marginRight: Spacing.sm },
  dropdownText: { flex: 1, minWidth: 0 },
  dropdownName: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  dropdownMeta: { fontSize: FontSize.xs, marginTop: 2 },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  gpsLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },
  loading: { alignItems: 'center', paddingVertical: Spacing.xl, borderRadius: Radius.lg, marginBottom: Spacing.lg },
  loadingText: { marginTop: Spacing.sm, fontSize: FontSize.sm },
  riskAlertCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  riskAlertIconWrap: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md },
  riskAlertText: { flex: 1, minWidth: 0 },
  riskAlertLabel: { fontSize: FontSize.base, fontWeight: FontWeight.bold, textTransform: 'uppercase', letterSpacing: 1, marginBottom: Spacing.xs },
  riskAlertMessage: { fontSize: FontSize.sm, lineHeight: 20 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md, marginBottom: Spacing.lg },
  infoCard: {
    flex: 1,
    minWidth: 140,
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1,
    ...Shadows.sm,
  },
  infoCardIconWrap: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm },
  infoCardBody: { flex: 1, minWidth: 0 },
  infoCardLabel: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, textTransform: 'uppercase', marginBottom: 2 },
  infoCardValue: { fontSize: FontSize.xl, fontWeight: FontWeight.bold },
  infoCardUnit: { fontSize: FontSize.base, fontWeight: FontWeight.normal },
  detailsCard: { padding: Spacing.md, borderRadius: Radius.md, marginBottom: Spacing.md },
  detail: { fontSize: FontSize.sm, marginBottom: Spacing.xs },
  evacButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
  },
  evacButtonText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  evacPanel: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderLeftWidth: 4,
    marginBottom: Spacing.lg,
    ...Shadows.sm,
  },
  evacPanelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  evacPanelTitle: { fontSize: FontSize.lg, fontWeight: FontWeight.bold, marginLeft: Spacing.sm },
  evacPanelDesc: { fontSize: FontSize.sm, marginBottom: Spacing.md, color: '#475569' },
  viewOnMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    alignSelf: 'flex-start',
  },
  viewOnMapText: { color: '#fff', fontSize: FontSize.base, fontWeight: FontWeight.semibold },
  waypoints: { marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1 },
  waypointsTitle: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, marginBottom: Spacing.sm },
  waypoint: { fontSize: FontSize.xs, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginBottom: 2 },
});
