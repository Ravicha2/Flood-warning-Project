import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useApp } from '../context/AppContext';
import { useTheme } from '../context/ThemeContext';
import { Spacing, Radius, FontSize, FontWeight } from '../constants/Theme';

/**
 * Shows backend/Elastic status. On load or settings change, GET /health is called.
 * Green = operational, red = backend/ES down.
 */
export function HealthBanner() {
  const { healthStatus, refreshHealth } = useApp();
  const { colors } = useTheme();

  if (healthStatus === null) return null;

  const isOk = healthStatus === 'ok';
  const isLoading = healthStatus === 'loading';

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: colors.primary },
        isOk && { backgroundColor: colors.success },
        !isOk && !isLoading && { backgroundColor: colors.error },
      ]}
    >
      <View style={styles.content}>
        <View
          style={[
            styles.dot,
            isOk && styles.dotOk,
            !isOk && !isLoading && styles.dotError,
            isLoading && styles.dotLoading,
          ]}
        />
        <Text style={styles.text} numberOfLines={1}>
          {isLoading
            ? 'Checking system…'
            : isOk
            ? 'System operational'
            : 'Backend unavailable — check API URL in Settings'}
        </Text>
      </View>
      {!isLoading && (
        <TouchableOpacity onPress={refreshHealth} style={styles.refresh} activeOpacity={0.8}>
          <Text style={styles.refreshText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dotOk: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dotError: {
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  dotLoading: {
    opacity: 0.7,
  },
  text: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    flex: 1,
  },
  refresh: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    marginLeft: Spacing.xs,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  refreshText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
