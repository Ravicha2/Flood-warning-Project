import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../context/AppContext';
import { ThemeProvider } from '../context/ThemeContext';
import { HealthBanner } from '../components/HealthBanner';

export default function RootLayout() {
  return (
    <AppProvider>
      <ThemeProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <HealthBanner />
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </SafeAreaProvider>
      </ThemeProvider>
    </AppProvider>
  );
}
