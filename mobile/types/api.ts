/**
 * API types matching backend Pydantic schemas (backend/app/schemas.py).
 */

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export interface GeoPoint {
  lat: number;
  lon: number;
}

export interface LocationCheckRequest {
  latitude: number;
  longitude: number;
  radius_km?: number;
}

export interface LocationCheckResponse {
  latitude: number;
  longitude: number;
  risk_level: RiskLevel;
  nearest_sensor_id: string | null;
  water_level_m: number | null;
  predicted_flood_time: string | null;
  active_boundaries: string[];
  evacuation_route: GeoPoint[];
  message: string;
}

export interface FloodBoundaryItem {
  boundary_id: string;
  region_name: string;
  country: string;
  risk_level: RiskLevel;
  severity: number;
  active: boolean;
  valid_from: string | null;
  valid_until: string | null;
  geometry: GeoJSONGeometry;
}

export interface GeoJSONGeometry {
  type: string;
  coordinates: number[] | number[][] | number[][][];
}

export interface FloodBoundariesResponse {
  total: number;
  boundaries: FloodBoundaryItem[];
}

export interface PredictionItem {
  prediction_id: string;
  sensor_id: string;
  latitude: number;
  longitude: number;
  predicted_water_level: number;
  predicted_risk_level: RiskLevel;
  prediction_horizon_hours: number;
  confidence_score: number;
  predicted_for: string;
}

export interface PredictionsResponse {
  total: number;
  predictions: PredictionItem[];
}

export interface EvacuationRouteResponse {
  origin: GeoPoint;
  destination: GeoPoint | null;
  waypoints: GeoPoint[];
  distance_km: number | null;
  estimated_minutes: number | null;
}

export interface HealthResponse {
  status: string;
  elasticsearch: string;
  mongodb: string;
}

export interface AssistantAskRequest {
  message: string;
  latitude?: number;
  longitude?: number;
}

export interface AssistantAskResponse {
  reply: string;
  suggest_emergency_call?: boolean;
  risk_level?: string;
}

export interface EmergencyNumberResponse {
  number: string;
  country: string | null;
  label: string;
}
