/**
 * Map screen — default/fallback (no platform extension).
 * Uses web map (OpenStreetMap) so fallback works in browser; native uses index.native.tsx.
 */
import React from 'react';
import { WebMapView } from '../../components/WebMapView';

export default function MapScreen() {
  return <WebMapView />;
}
