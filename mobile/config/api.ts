/**
 * API base URL configuration.
 * For device on same network use http://<your-machine-ip>:8000
 * For emulator use http://localhost:8000 (Android: 10.0.2.2:8000)
 */
export const DEFAULT_API_BASE_URL = __DEV__
  ? 'http://localhost:8000'
  : 'https://your-api.example.com';

export const API_ENDPOINTS = {
  /** Backend may expose GET /health or GET /health/health depending on router mount */
  health: '/health',
  checkLocation: '/location/check-location',
  floodBoundaries: '/boundaries/flood-boundaries',
  predictions: '/predictions/predictions',
  evacuationRoutes: '/evacuation/evacuation-routes',
  assistantAsk: '/assistant/ask',
} as const;
