import { Drawer } from 'expo-router/drawer';
import { Ionicons } from '@expo/vector-icons';
import { FontSize, FontWeight, scale } from '../../constants/Theme';
import { useTheme } from '../../context/ThemeContext';
import { NavBarHeader } from '../../components/NavBarHeader';

export default function DrawerLayout() {
  const { colors } = useTheme();
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
