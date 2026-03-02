/**
 * Predictions tab: list from GET /predictions/predictions (next 4–6 h).
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { getPredictions } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { Colors, RiskLevelColors, RiskLevelBgColors, Spacing, Radius, FontSize, FontWeight, Shadows, CONTENT_MAX_WIDTH } from '../../constants/Theme';
import type { PredictionItem } from '../../types/api';

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function PredictionRow({ item, colors }: { item: PredictionItem; colors: ReturnType<typeof useTheme>['colors'] }) {
  const bg = RiskLevelBgColors[item.predicted_risk_level] ?? colors.background;
  const fg = RiskLevelColors[item.predicted_risk_level] ?? colors.primary;
  return (
    <View style={[styles.row, { backgroundColor: colors.surface }]}>
      <View style={[styles.badge, { backgroundColor: bg }]}>
        <View style={[styles.badgeDot, { backgroundColor: fg }]} />
        <Text style={[styles.badgeText, { color: fg }]}>{item.predicted_risk_level}</Text>
      </View>
      <View style={styles.body}>
        <Text style={[styles.sensor, { color: colors.text }]}>Sensor {item.sensor_id}</Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]}>
          Water level: {item.predicted_water_level} m · Confidence: {(item.confidence_score * 100).toFixed(0)}%
        </Text>
        <Text style={[styles.time, { color: colors.textMuted }]}>Predicted for: {formatTime(item.predicted_for)}</Text>
      </View>
    </View>
  );
}

export default function PredictionsScreen() {
  const { colors } = useTheme();
  const [predictions, setPredictions] = useState<PredictionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const res = await getPredictions({ hours_ahead: 6 });
      setPredictions(res.predictions);
    } catch (e) {
      setError((e as Error).message);
      setPredictions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  if (loading && predictions.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.centeredText, { color: colors.textSecondary }]}>Loading predictions…</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {error && (
        <View style={[styles.errorBanner, { backgroundColor: colors.error }]}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      <FlatList
        data={predictions}
        keyExtractor={(item) => item.prediction_id}
        renderItem={({ item }) => <PredictionRow item={item} colors={colors} />}
        contentContainerStyle={[styles.list, styles.listResponsive]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.empty}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No predictions in the next 6 hours</Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  centeredText: {
    marginTop: Spacing.sm,
    fontSize: FontSize.sm,
  },
  errorBanner: {
    padding: Spacing.md,
  },
  errorText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  list: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
  },
  listResponsive: {
    maxWidth: CONTENT_MAX_WIDTH,
    width: '100%',
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderWidth: 0,
    ...Shadows.sm,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs + 2,
    borderRadius: Radius.full,
    alignSelf: 'flex-start',
    marginRight: Spacing.md,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: Spacing.xs,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.bold,
    textTransform: 'capitalize',
  },
  body: {
    flex: 1,
  },
  sensor: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  meta: {
    fontSize: FontSize.sm,
    marginBottom: 2,
  },
  time: {
    fontSize: FontSize.xs,
  },
  empty: {
    padding: Spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: FontSize.sm,
  },
});
