/**
 * FloodGuard landing page: logo and dark blue background, then navigate to main app.
 */
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

const LANDING_BG = '#0f172a';
const BRAND_LIGHT = '#93c5fd';
const ICON_GRADIENT_DARK = '#1e3a8a';
const ICON_GRADIENT_LIGHT = '#3b82f6';

export default function LandingScreen() {
  const router = useRouter();

  const goToApp = () => {
    router.replace('/(tabs)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <View style={[styles.iconSquare, { backgroundColor: ICON_GRADIENT_LIGHT }]}>
            <Ionicons name="water" size={56} color="#fff" />
          </View>
        </View>
        <Text style={styles.title}>FloodGuard</Text>
        <Text style={styles.tagline}>Flood risk at a glance</Text>
      </View>
      <TouchableOpacity style={styles.button} onPress={goToApp} activeOpacity={0.85}>
        <Text style={styles.buttonText}>Get Started</Text>
        <Ionicons name="arrow-forward" size={20} color={LANDING_BG} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LANDING_BG,
    justifyContent: 'space-between',
    paddingHorizontal: 32,
    paddingTop: 80,
    paddingBottom: 48,
  },
  content: {
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 24,
  },
  iconSquare: {
    width: 100,
    height: 100,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: BRAND_LIGHT,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(147, 197, 253, 0.8)',
    marginTop: 8,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: BRAND_LIGHT,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: LANDING_BG,
  },
});
