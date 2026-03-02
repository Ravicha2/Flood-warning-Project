import { Redirect } from 'expo-router';

/**
 * Root path redirects to the Map tab (first tab in (tabs)).
 */
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
