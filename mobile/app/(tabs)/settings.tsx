/**
 * Settings: configurable API base URL (e.g. http://<machine-ip>:8000 for device on same network).
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useApp } from '../../context/AppContext';
import { useTheme } from '../../context/ThemeContext';
import { getApiBaseUrl } from '../../services/api';
import { Spacing, Radius, FontSize, FontWeight, Shadows, CONTENT_MAX_WIDTH } from '../../constants/Theme';

export default function SettingsScreen() {
  const { apiBaseUrl, setApiBaseUrl, refreshHealth, healthStatus } = useApp();
  const { colors } = useTheme();
  const [url, setUrl] = useState(apiBaseUrl);

  useEffect(() => {
    let cancelled = false;
    getApiBaseUrl().then((stored) => {
      if (!cancelled) setUrl(stored);
    });
    return () => { cancelled = true; };
  }, [apiBaseUrl]);

  const save = async () => {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) {
      Alert.alert('Invalid URL', 'Enter the API base URL (e.g. http://192.168.1.10:8000)');
      return;
    }
    try {
      await setApiBaseUrl(trimmed);
      Alert.alert('Saved', 'API URL updated. Health check will run automatically.');
    } catch (e) {
      Alert.alert('Error', (e as Error).message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView contentContainerStyle={[styles.content, styles.contentResponsive]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={[styles.card, styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>API base URL</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            For device on same network use http://&lt;your-machine-ip&gt;:8000. For emulator use
            localhost (Android: 10.0.2.2:8000).
          </Text>
          <TextInput
            style={[styles.input, { borderColor: colors.border, color: colors.text, backgroundColor: colors.surface }]}
            value={url}
            onChangeText={setUrl}
            placeholder="http://localhost:8000"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
          />
          <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={save} activeOpacity={0.85}>
            <Text style={styles.buttonText}>Save</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.text }]}>Status</Text>
          <View style={styles.statusRow}>
            <Text style={[styles.statusLabel, { color: colors.textSecondary }]}>Backend:</Text>
            <View style={[
              styles.statusPill,
              { backgroundColor: colors.borderLight },
              healthStatus === 'ok' && { backgroundColor: colors.successLight },
              healthStatus === 'error' && { backgroundColor: colors.errorLight },
            ]}>
              <Text
                style={[
                  styles.statusValue,
                  { color: colors.text },
                  healthStatus === 'ok' && { color: colors.success },
                  healthStatus === 'error' && { color: colors.error },
                ]}
              >
                {healthStatus === null ? '—' : healthStatus === 'loading' ? 'Checking…' : healthStatus === 'ok' ? 'OK' : 'Unavailable'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.refreshButton} onPress={refreshHealth} activeOpacity={0.8}>
            <Text style={[styles.refreshButtonText, { color: colors.primary }]}>Refresh health check</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
    marginBottom: Spacing.md,
    ...Shadows.sm,
  },
  section: {},
  label: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  hint: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    fontSize: FontSize.base,
    marginBottom: Spacing.md,
  },
  button: {
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statusLabel: {
    fontSize: FontSize.sm,
    marginRight: Spacing.sm,
  },
  statusPill: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
  },
  statusValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  refreshButton: {
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  refreshButtonText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
});
