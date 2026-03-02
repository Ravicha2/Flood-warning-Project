/**
 * API client for Flood Early Warning System backend.
 * All Elastic data is consumed via FastAPI; mobile never talks to Elasticsearch directly.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_API_BASE_URL,
  API_ENDPOINTS,
} from '../config/api';
import type {
  HealthResponse,
  LocationCheckRequest,
  LocationCheckResponse,
  FloodBoundariesResponse,
  PredictionsResponse,
  EvacuationRouteResponse,
  AssistantAskRequest,
  AssistantAskResponse,
} from '../types/api';

const API_BASE_KEY = '@flood_warning_api_base_url';

export async function getApiBaseUrl(): Promise<string> {
  try {
    const stored = await AsyncStorage.getItem(API_BASE_KEY);
    return stored ?? DEFAULT_API_BASE_URL;
  } catch {
    return DEFAULT_API_BASE_URL;
  }
}

export async function setApiBaseUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(API_BASE_KEY, url.trim().replace(/\/$/, ''));
}

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const base = await getApiBaseUrl();
  const url = `${base}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/** GET /health — system operational status for banner */
export async function getHealth(): Promise<HealthResponse> {
  const base = await getApiBaseUrl();
  const url = `${base}${API_ENDPOINTS.health}`;
  const res = await fetch(url, { method: 'GET' });
  if (!res.ok) throw new Error(`Health check failed: ${res.status}`);
  return res.json() as Promise<HealthResponse>;
}

/** POST /location/check-location — risk at a point, nearest sensor, active boundaries */
export async function checkLocation(
  body: LocationCheckRequest
): Promise<LocationCheckResponse> {
  return request<LocationCheckResponse>(API_ENDPOINTS.checkLocation, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

/** GET /boundaries/flood-boundaries — polygons for map overlay */
export async function getFloodBoundaries(params?: {
  active_only?: boolean;
  country?: string;
}): Promise<FloodBoundariesResponse> {
  const q = new URLSearchParams();
  if (params?.active_only !== undefined) q.set('active_only', String(params.active_only));
  if (params?.country) q.set('country', params.country);
  const query = q.toString();
  return request<FloodBoundariesResponse>(
    `${API_ENDPOINTS.floodBoundaries}${query ? `?${query}` : ''}`
  );
}

/** GET /predictions/predictions — next 4–6 h predictions */
export async function getPredictions(params?: {
  hours_ahead?: number;
  lat?: number;
  lon?: number;
  radius_km?: number;
}): Promise<PredictionsResponse> {
  const q = new URLSearchParams();
  if (params?.hours_ahead != null) q.set('hours_ahead', String(params.hours_ahead));
  if (params?.lat != null) q.set('lat', String(params.lat));
  if (params?.lon != null) q.set('lon', String(params.lon));
  if (params?.radius_km != null) q.set('radius_km', String(params.radius_km));
  const query = q.toString();
  return request<PredictionsResponse>(
    `${API_ENDPOINTS.predictions}${query ? `?${query}` : ''}`
  );
}

/** GET /evacuation/evacuation-routes — safe route from current location */
export async function getEvacuationRoutes(lat: number, lon: number): Promise<EvacuationRouteResponse> {
  return request<EvacuationRouteResponse>(
    `${API_ENDPOINTS.evacuationRoutes}?lat=${lat}&lon=${lon}`
  );
}

/** POST /assistant/ask — ask Claude flood assistant (optional lat/lon for context) */
export async function askAssistant(body: AssistantAskRequest): Promise<AssistantAskResponse> {
  return request<AssistantAskResponse>(API_ENDPOINTS.assistantAsk, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}
