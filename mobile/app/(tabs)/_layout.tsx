import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, scale } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';

export default function TabLayout() {
  const { colors } = useTheme();
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
