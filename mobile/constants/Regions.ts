/**
 * Preset map regions (Queensland, Sumatra, Hat Yai) per implementation plan.
 * Same coordinates work in Kibana Maps and the mobile app.
 */
export interface RegionPreset {
  id: string;
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'queensland',
    name: 'Queensland',
    country: 'Australia',
    latitude: -27.4698,
    longitude: 153.0251,
    latitudeDelta: 0.5,
    longitudeDelta: 0.5,
  },
  {
    id: 'sumatra',
    name: 'Sumatra',
    country: 'Indonesia',
    latitude: -0.5,
    longitude: 101.0,
    latitudeDelta: 1.2,
    longitudeDelta: 1.2,
  },
  {
    id: 'hat_yai',
    name: 'Hat Yai',
    country: 'Thailand',
    latitude: 7.0086,
    longitude: 100.4747,
    latitudeDelta: 0.15,
    longitudeDelta: 0.15,
  },
];
