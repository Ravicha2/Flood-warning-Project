import 'react-native-gesture-handler';
import { Stack, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { ThemeProvider } from '../context/ThemeContext';
import { SearchProvider } from '../context/SearchContext';
import { MapThemeProvider } from '../context/MapThemeContext';
import { RegionProvider } from '../context/RegionContext';
import { HealthBanner } from '../components/HealthBanner';

export const unstable_settings = {
  initialRouteName: 'index',
};

function RootStack() {
  const segments = useSegments();
  const isLanding = segments[0] === undefined || (segments.length === 1 && segments[0] === 'index');

  return (
    <>
      <StatusBar style="light" />
      {!isLanding && <HealthBanner />}
      <Stack screenOptions={{ headerShown: false }} initialRouteName="index">
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider>
        <MapThemeProvider>
          <RegionProvider>
          <SearchProvider>
          <SafeAreaProvider>
            <RootStack />
          </SafeAreaProvider>
        </SearchProvider>
          </RegionProvider>
        </MapThemeProvider>
      </ThemeProvider>
    </AppProvider>
  );
}
