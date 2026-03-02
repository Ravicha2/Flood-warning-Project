const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface HealthResponse {
  elasticsearch: string;
  mongodb?: string;
  status?: string;
}

export interface LocationCheckResponse {
  latitude: number;
  longitude: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  nearest_sensor_id?: string;
  water_level_m?: number;
  predicted_flood_time?: string;
  active_boundaries: string[];
  evacuation_route?: { lat: number; lon: number }[];
  message: string;
}

export interface GetBoundariesParams {
  country?: string;
  active_only?: boolean;
  at_time?: string;
  lat?: number;
  lon?: number;
}

export interface Boundary {
  boundary_id: string;
  region_name: string;
  country: string;
  risk_level: string;
  severity: string;
  active: boolean;
  valid_from?: string;
  valid_until?: string;
  geometry: any; // GeoJSON
}

export interface BoundariesResponse {
  total: number;
  boundaries: Boundary[];
}

export interface RouteResponse {
  origin: { lat: number; lon: number };
  destination?: { lat: number; lon: number };
  waypoints: { lat: number; lon: number }[];
  distance_km?: number;
  estimated_minutes?: number;
}

export interface Prediction {
  prediction_id: string;
  sensor_id: string;
  latitude: number;
  longitude: number;
  predicted_water_level: number;
  predicted_risk_level: string;
  prediction_horizon_hours: number;
  confidence_score: number;
  predicted_for: string;
}

export interface PredictionsResponse {
  total: number;
  predictions: Prediction[];
}

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${API_URL}/health`);
    if (!res.ok) throw new Error('Failed to fetch health status');
    return res.json();
  },

  async checkLocation(lat: number, lon: number, radiusKm?: number, atTime?: string): Promise<LocationCheckResponse> {
    const res = await fetch(`${API_URL}/location/check-location`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon, radius_km: radiusKm, at_time: atTime }),
    });
    if (!res.ok) throw new Error('Failed to check location');
    return res.json();
  },

  async getFloodBoundaries(params?: GetBoundariesParams): Promise<BoundariesResponse> {
    const url = new URL(`${API_URL}/boundaries/flood-boundaries`);
    if (params?.country) url.searchParams.append('country', params.country);
    if (params?.active_only !== undefined) url.searchParams.append('active_only', String(params.active_only));
    if (params?.at_time) url.searchParams.append('at_time', params.at_time);
    if (params?.lat) url.searchParams.append('lat', String(params.lat));
    if (params?.lon) url.searchParams.append('lon', String(params.lon));

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch boundaries');
    return res.json();
  },

  async getEvacuationRoutes(lat: number, lon: number, at_time?: string): Promise<RouteResponse> {
    const url = new URL(`${API_URL}/evacuation/evacuation-routes`);
    url.searchParams.append('lat', String(lat));
    url.searchParams.append('lon', String(lon));
    if (at_time) url.searchParams.append('at_time', at_time);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch evacuation routes');
    return res.json();
  },

  async getPredictions(params?: { hours_ahead?: number; lat?: number; lon?: number; radius_km?: number; at_time?: string }): Promise<PredictionsResponse> {
    const url = new URL(`${API_URL}/predictions/predictions`);
    if (params?.hours_ahead) url.searchParams.append('hours_ahead', String(params.hours_ahead));
    if (params?.lat) url.searchParams.append('lat', String(params.lat));
    if (params?.lon) url.searchParams.append('lon', String(params.lon));
    if (params?.radius_km) url.searchParams.append('radius_km', String(params.radius_km));
    if (params?.at_time) url.searchParams.append('at_time', params.at_time);

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error('Failed to fetch predictions');
    return res.json();
  },

  async generateDynamicGrid(lat: number, lon: number): Promise<{ status: string }> {
    const res = await fetch(`${API_URL}/ingest/generate-grid`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude: lat, longitude: lon }),
    });
    // We intentionally don't throw an aggressive error here so map keeps working even if open-meteo fails
    if (!res.ok) {
      console.warn('Failed to dynamically generate grid for location', lat, lon);
      return { status: 'failed' };
    }
    return res.json();
  }
};
