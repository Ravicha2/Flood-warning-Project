/**
 * Assistant tab — Claude flood bot. Ask a question; optional "use my location" for context.
 * "Call emergency" opens the phone dialer with the number for the user's area.
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import * as Linking from 'expo-linking';
import { askAssistant, getEmergencyNumber, checkLocation } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import {
  Spacing,
  Radius,
  FontSize,
  FontWeight,
  Shadows,
  CONTENT_MAX_WIDTH,
} from '../../constants/Theme';

export default function AssistantScreen() {
  const { colors } = useTheme();
  const [message, setMessage] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);
  const [useLocation, setUseLocation] = useState(true);
  const [emergencyLoading, setEmergencyLoading] = useState(false);
  /** When set, show "Call emergency now" at top (critical times); use this lat/lon for the number */
  const [criticalLocation, setCriticalLocation] = useState<{ lat: number; lon: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({});
          const res = await checkLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (!cancelled && (res.risk_level === 'high' || res.risk_level === 'critical')) {
            setCriticalLocation({ lat: loc.coords.latitude, lon: loc.coords.longitude });
          } else if (!cancelled) {
            setCriticalLocation(null);
          }
        } catch {
          if (!cancelled) setCriticalLocation(null);
        }
      })();
      return () => { cancelled = true; };
    }, [])
  );

  const callEmergency = useCallback(async (latLon?: { lat: number; lon: number }) => {
    setEmergencyLoading(true);
    try {
      let lat: number;
      let lon: number;
      if (latLon) {
        lat = latLon.lat;
        lon = latLon.lon;
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(
            'Location needed',
            'Allow location so we can show the emergency number for your area. You can still dial 112 (international) manually.'
          );
          setEmergencyLoading(false);
          return;
        }
        const loc = await Location.getCurrentPositionAsync({});
        lat = loc.coords.latitude;
        lon = loc.coords.longitude;
      }
      const { number, label } = await getEmergencyNumber(lat, lon);
      const url = `tel:${number}`;
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert('Call emergency', `${label}: ${number}. Open your phone and dial this number.`);
      }
    } catch (e) {
      Alert.alert('Emergency', (e as Error).message);
    } finally {
      setEmergencyLoading(false);
    }
  }, []);

  const send = useCallback(async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      Alert.alert('Message required', 'Type a question for the flood assistant.');
      return;
    }
    setLoading(true);
    setReply('');
    try {
      const body: { message: string; latitude?: number; longitude?: number } = {
        message: trimmed,
      };
      if (useLocation) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          body.latitude = loc.coords.latitude;
          body.longitude = loc.coords.longitude;
        }
      }
      const res = await askAssistant(body);
      setReply(res.reply);
      if (res.suggest_emergency_call && body.latitude != null && body.longitude != null) {
        setCriticalLocation({ lat: body.latitude, lon: body.longitude });
      }
    } catch (e) {
      Alert.alert('Assistant', (e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [message, useLocation]);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, styles.contentResponsive]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {criticalLocation ? (
          <View style={[styles.criticalBanner, { backgroundColor: colors.error }]}>
            <Text style={styles.criticalBannerTitle}>Critical risk — Call emergency now</Text>
            <TouchableOpacity
              style={styles.criticalBannerButton}
              onPress={() => callEmergency(criticalLocation)}
              disabled={emergencyLoading}
              activeOpacity={0.9}
            >
              {emergencyLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.criticalBannerButtonText}>Call emergency</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Flood assistant
          </Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            Ask what to do before or during a flood. Add your location so the
            assistant can use your current risk.
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: colors.border,
                color: colors.text,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="e.g. What should I do? I'm in a flood zone."
            placeholderTextColor={colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={3}
            maxLength={2000}
            editable={!loading}
          />
          <View style={styles.row}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
              onPress={() => setUseLocation((v) => !v)}
              disabled={loading}
              activeOpacity={0.85}
            >
              <View
                style={[
                  styles.checkboxInner,
                  useLocation && { backgroundColor: colors.primary },
                ]}
              />
            </TouchableOpacity>
            <Text style={[styles.checkboxLabel, { color: colors.textSecondary }]}>
              Include my location (for risk context)
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={send}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ask assistant</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonEmergency, { backgroundColor: colors.error }]}
            onPress={() => callEmergency()}
            disabled={emergencyLoading}
            activeOpacity={0.85}
          >
            {emergencyLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Call emergency (by area)</Text>
            )}
          </TouchableOpacity>
        </View>

        {reply ? (
          <View style={[styles.card, styles.replyCard, { backgroundColor: colors.surface }]}>
            <Text style={[styles.replyLabel, { color: colors.textSecondary }]}>
              Assistant
            </Text>
            <Text style={[styles.replyText, { color: colors.text }]}>
              {reply}
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
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
  criticalBanner: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    alignItems: 'center',
  },
  criticalBannerTitle: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  criticalBannerButton: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.lg,
    borderRadius: Radius.md,
    minWidth: 160,
    alignItems: 'center',
  },
  criticalBannerButtonText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    ...Shadows.sm,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
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
    minHeight: 88,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1.5,
    marginRight: Spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxInner: {
    width: 14,
    height: 14,
    borderRadius: 3,
  },
  checkboxLabel: {
    fontSize: FontSize.sm,
    flex: 1,
  },
  button: {
    marginTop: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
  },
  buttonEmergency: {
    marginTop: Spacing.sm,
  },
  replyCard: {
    marginTop: Spacing.sm,
  },
  replyLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
  },
  replyText: {
    fontSize: FontSize.base,
    lineHeight: 22,
  },
});
