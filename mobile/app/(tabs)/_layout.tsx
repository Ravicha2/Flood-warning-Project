import { useCallback } from 'react';
import { Tabs, useRouter, usePathname, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, scale } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { checkLocation } from '../../services/api';

export default function DrawerLayout() {
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
    <Drawer
      screenOptions={{
        drawerActiveTintColor: colors.primary,
        drawerInactiveTintColor: colors.textSecondary,
        drawerLabelStyle: { fontSize: FontSize.sm, fontWeight: FontWeight.medium },
        drawerStyle: {
          backgroundColor: colors.surface,
          width: scale(280),
        },
        drawerContentStyle: {
          backgroundColor: colors.surface,
        },
        header: () => <NavBarHeader />,
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
        swipeEdgeWidth: 50,
      }}
    >
      <Drawer.Screen
        name="index"
        options={{
          title: 'Map',
          drawerLabel: 'Map',
          drawerIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="map" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="check-risk"
        options={{
          title: 'Check Risk',
          drawerLabel: 'Risk',
          drawerIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="warning" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="predictions"
        options={{
          title: 'Predictions',
          drawerLabel: 'Predictions',
          drawerIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="list" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="assistant"
        options={{
          title: 'Assistant',
          drawerLabel: 'Assistant',
          drawerIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="chatbubble-ellipses" size={size} color={color} />,
        }}
      />
      <Drawer.Screen
        name="settings"
        options={{
          title: 'Settings',
          drawerLabel: 'Settings',
          drawerIcon: ({ color, size }: { color: string; size: number }) => <Ionicons name="settings" size={size} color={color} />,
        }}
      />
    </Drawer>
  );
}
