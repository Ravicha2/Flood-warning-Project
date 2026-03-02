import { useCallback } from 'react';
import { Tabs, useRouter, usePathname, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, scale } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { checkLocation } from '../../services/api';

export default function TabLayout() {
  const { colors } = useTheme();
  const router = useRouter();
  const pathname = usePathname();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (pathname?.includes('assistant')) return;
        try {
          const { status } = await Location.getForegroundPermissionsAsync();
          if (status !== 'granted') return;
          const loc = await Location.getCurrentPositionAsync({});
          const res = await checkLocation({
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          });
          if (!cancelled && (res.risk_level === 'high' || res.risk_level === 'critical')) {
            router.replace('/(tabs)/assistant');
          }
        } catch {
          // ignore
        }
      })();
      return () => { cancelled = true; };
    }, [pathname, router])
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: { fontSize: FontSize.xs, fontWeight: FontWeight.medium },
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingTop: scale(8),
          minHeight: scale(60),
        },
        headerStyle: {
          backgroundColor: colors.primary,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontSize: FontSize.lg,
          fontWeight: FontWeight.semibold,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarLabel: 'Map',
          tabBarIcon: ({ color, size }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="check-risk"
        options={{
          title: 'Check Risk',
          tabBarLabel: 'Risk',
          tabBarIcon: ({ color, size }) => <Ionicons name="warning" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="predictions"
        options={{
          title: 'Predictions',
          tabBarLabel: 'Predictions',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          tabBarLabel: 'Assistant',
          tabBarIcon: ({ color, size }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarLabel: 'Settings',
          tabBarIcon: ({ color, size }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
