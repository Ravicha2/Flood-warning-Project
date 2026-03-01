# Team Breakdown: 3 Programmers, No Conflicts
## Backend · Next.js · Mobile — Same Project, Parallel Work

**Rule:** Each dev owns **one folder** and **one set of files**. No two people edit the same file. All three use the **same API contract** below.

---

## API contract (single source of truth)

**Base URL (dev):** `http://localhost:8000`  
**Docs:** `http://localhost:8000/docs` (Swagger) and `http://localhost:8000/redoc`

Backend implements these; Next and Mobile **only call** them. If a request/response shape changes, Backend updates `backend/app/schemas.py` and this doc; Next and Mobile copy types from here or from OpenAPI.

---

### 1. GET /health

**Purpose:** Check if backend and Elasticsearch (and optionally MongoDB) are up.

| Item | Type |
|------|------|
| **Response** | `200` body: `{ "elasticsearch": "ok", "mongodb": "ok" }` or 503 if either down |

**Used by:** Next (status banner), Mobile (status on load).

---

### 2. POST /location/check-location

**Purpose:** Get flood risk for a coordinate (and nearest sensor, active boundaries, optional evacuation).

| Item | Type |
|------|------|
| **Request body** | `{ "latitude": number, "longitude": number, "radius_km"?: number }` |
| **Response** | `{ "latitude", "longitude", "risk_level": "low"|"medium"|"high"|"critical", "nearest_sensor_id"?, "water_level_m"?, "predicted_flood_time"?, "active_boundaries": string[], "evacuation_route"?: { "lat", "lon" }[], "message" }` |

**Used by:** Next (check-risk page/form), Mobile (“Check my risk” screen, map tap).

---

### 3. GET /boundaries/flood-boundaries

**Purpose:** List active (and optional historical) flood boundary polygons for the map.

| Item | Type |
|------|------|
| **Query params** | `country?` (e.g. AU, TH, ID), `active_only?` (default true), `at_time?` (ISO8601 optional) |
| **Response** | `{ "total": number, "boundaries": [ { "boundary_id", "region_name", "country", "risk_level", "severity", "active", "valid_from"?, "valid_until"?, "geometry": GeoJSON } ] }` |

**Used by:** Next (map layer), Mobile (map layer; optional time picker).

---

### 4. GET /evacuation/evacuation-routes

**Purpose:** Get safe route from a point (waypoints avoiding flood zones).

| Item | Type |
|------|------|
| **Query params** | `lat` (required), `lon` (required), `at_time?` (optional) |
| **Response** | `{ "origin": { "lat", "lon" }, "destination"?, "waypoints": [ { "lat", "lon" } ], "distance_km"?, "estimated_minutes"? }` |

**Used by:** Next (map route line), Mobile (“Get route” button, map polyline).

---

### 5. GET /predictions/predictions

**Purpose:** List flood predictions for the next N hours (optionally for a location).

| Item | Type |
|------|------|
| **Query params** | `hours_ahead?` (default 6), `lat?`, `lon?`, `radius_km?`, `at_time?` (optional) |
| **Response** | `{ "total": number, "predictions": [ { "prediction_id", "sensor_id", "latitude", "longitude", "predicted_water_level", "predicted_risk_level", "prediction_horizon_hours", "confidence_score", "predicted_for" } ] }` |

**Used by:** Next (predictions panel/list or map), Mobile (predictions tab or map layer).

---

### 6. GET / (root)

**Purpose:** Service info.

| Item | Type |
|------|------|
| **Response** | `{ "service", "version", "status", "docs" }` |

**Used by:** Optional ping from Next/Mobile.

---

## CORS and base URL

- Backend allows origins: `http://localhost:3000` (Next), and a placeholder for mobile (e.g. `http://localhost:8081` for Expo, or your tunnel URL). **Backend dev** adds these in `main.py`; no one else edits `main.py` except to add routers.
- Next uses `NEXT_PUBLIC_API_URL=http://localhost:8000` (or backend URL).
- Mobile uses a configurable API base URL (e.g. env or config: `http://<machine-ip>:8000` for device, or localhost for emulator).

---

# 1. Backend (Dev 1)

**Owner:** Backend dev  
**Folder:** `backend/` only. Do not touch `frontend/` or `mobile/`.

## Files you own (no one else edits)

| File | Purpose |
|------|--------|
| `backend/main.py` | App entry, CORS, router registration, startup/shutdown |
| `backend/app/config.py` | Settings from env |
| `backend/app/schemas.py` | Pydantic request/response models (API contract) |
| `backend/app/db/elasticsearch.py` | ES client singleton |
| `backend/app/db/mongodb.py` | Mongo client (if used) |
| `backend/app/routers/health.py` | GET /health |
| `backend/app/routers/location.py` | POST /location/check-location |
| `backend/app/routers/boundaries.py` | GET /boundaries/flood-boundaries |
| `backend/app/routers/evacuation.py` | GET /evacuation/evacuation-routes |
| `backend/app/routers/predictions.py` | GET /predictions/predictions |
| `backend/app/services/ml_predictor.py` | Optional ML; used by predictions if needed |
| `backend/requirements.txt` | Python deps |

## Shared / repo root (coordinate once)

- `.env` at repo root: Backend reads `ES_*`, `MONGO_*`, `OPENWEATHERMAP_*`, etc. Backend dev can add vars; others add only their own (e.g. Next/Mobile don’t change ES_*).
- `docker-compose.yml`: Usually not changed during feature work. If someone needs a new service, agree in chat.

## Endpoints to implement (order)

1. **GET /health** — `health.py`: ping ES (and Mongo), return status.
2. **GET /boundaries/flood-boundaries** — `boundaries.py`: query `flood-boundaries-*`, filter active/country/at_time, return list with geometry.
3. **POST /location/check-location** — `location.py`: geo_shape (point in boundary), geo_distance (nearest sensor), optional predictions; build `LocationCheckResponse`.
4. **GET /predictions/predictions** — `predictions.py`: query `flood-predictions-*` with time range and optional geo.
5. **GET /evacuation/evacuation-routes** — `evacuation.py`: fetch boundaries, call OpenRouteService (or stub), return waypoints.

## Suggested workflow

- Implement and register one router at a time in `main.py`.
- Keep `schemas.py` as-is (already matches the contract above). If you add a query param, add it to this doc and to the schema.
- Run: `uvicorn main:app --reload --port 8000`. Ensure `/docs` shows all five endpoints when done.

## Conflict avoidance

- Only you edit `backend/**`. Next and Mobile devs do not create or edit files under `backend/`.
- If Next or Mobile need a new query param or field, they ask you; you add it in `schemas.py` and the router and update the API contract section above.

---

# 2. Next.js (Dev 2)

**Owner:** Next dev  
**Folder:** `frontend/` only. Do not touch `backend/` or `mobile/`.

## Files you own (create if missing)

| File | Purpose |
|------|--------|
| `frontend/.env.local` | `NEXT_PUBLIC_API_URL=http://localhost:8000`, map token if needed |
| `frontend/package.json` | Dependencies |
| `frontend/src/app/page.tsx` | Home: link to map, check risk, maybe health status |
| `frontend/src/app/layout.tsx` | Root layout |
| `frontend/src/lib/api.ts` | API client: base URL, typed functions for each endpoint |
| `frontend/src/components/FloodMap.tsx` | Map (Leaflet/Mapbox): boundaries layer, optional predictions, quick-go Queensland/Sumatra/Hat Yai |
| `frontend/src/components/RiskAlert.tsx` | Display risk level and message (from check-location) |
| `frontend/src/components/LocationSearch.tsx` | Input lat/lon or address; submit → check-location |
| `frontend/src/app/check/page.tsx` | Optional: dedicated “Check my risk” page |
| `frontend/src/app/map/page.tsx` | Optional: full-screen map page |

## API client (frontend/src/lib/api.ts)

Implement one function per endpoint; use the request/response shapes from the **API contract** above. Example pattern:

- `getHealth()` → GET /health  
- `checkLocation(lat, lon, radiusKm?)` → POST /location/check-location  
- `getFloodBoundaries(params?)` → GET /boundaries/flood-boundaries  
- `getEvacuationRoutes(lat, lon)` → GET /evacuation/evacuation-routes  
- `getPredictions(params?)` → GET /predictions/predictions  

Type the responses (TypeScript interfaces) to match the contract so you don’t depend on editing backend code.

## Endpoints you use

- **GET /health** — Home or header: show “Backend OK” or warning.
- **POST /location/check-location** — Location search or “Check my risk”: show risk, nearest sensor, boundaries, optional route.
- **GET /boundaries/flood-boundaries** — Map: draw polygon layer.
- **GET /evacuation/evacuation-routes** — After check-location or a button: draw route on map.
- **GET /predictions/predictions** — Map or sidebar: show prediction points or list.

## Map quick-go

Use the same coordinates as in the implementation plan: Queensland (-27.4698, 153.0251), Sumatra (-0.7893, 113.9213 or 3.5952, 98.6722), Hat Yai (7.0086, 100.4747). Buttons or chips that set map center/zoom to these.

## Conflict avoidance

- Only you edit `frontend/**`. Backend and Mobile devs do not create or edit files under `frontend/`.
- If the API response shape changes, Backend will say so; update your types in `api.ts` and components. Don’t change `backend/` or `schemas.py`.

---

# 3. Mobile (Dev 3)

**Owner:** Mobile dev  
**Folder:** `mobile/` only. Do not touch `backend/` or `frontend/`.

## Files you own (create if missing)

| File | Purpose |
|------|--------|
| `mobile/.env` or `mobile/app.config.js` | `API_BASE_URL=http://<ip>:8000` or similar (no secrets; URL only) |
| `mobile/package.json` | Dependencies (React Native / Expo) |
| `mobile/src/lib/api.ts` (or `api.js`) | API client: same endpoints as Next, typed or JSDoc to match contract |
| `mobile/src/screens/HomeScreen.tsx` | Home: health status, “Check my risk”, “Map”, “Predictions” |
| `mobile/src/screens/MapScreen.tsx` | Map: boundaries, predictions, user location, quick-go Queensland/Sumatra/Hat Yai |
| `mobile/src/screens/CheckRiskScreen.tsx` | “Check my risk”: get location or input, call check-location, show RiskAlert |
| `mobile/src/screens/PredictionsScreen.tsx` | List or cards from GET /predictions/predictions |
| `mobile/src/components/RiskAlert.tsx` | Display risk level and message |
| `mobile/src/components/MapQuickGo.tsx` | Buttons: Queensland, Sumatra, Hat Yai (same coords as doc) |

## API client (mobile/src/lib/api.ts)

Same as Next: one function per endpoint, same request/response shapes as the **API contract**. Base URL from env/config.

- `getHealth()`  
- `checkLocation(lat, lon, radiusKm?)`  
- `getFloodBoundaries(params?)`  
- `getEvacuationRoutes(lat, lon)`  
- `getPredictions(params?)`  

## Endpoints you use

- **GET /health** — On app load or Home: show backend status.
- **POST /location/check-location** — CheckRiskScreen and/or MapScreen (“Check risk here”).
- **GET /boundaries/flood-boundaries** — MapScreen: draw boundaries layer.
- **GET /evacuation/evacuation-routes** — “Get safe route” on Map or CheckRisk: draw route.
- **GET /predictions/predictions** — PredictionsScreen and/or MapScreen.

## Map quick-go

Same presets: Queensland, Sumatra, Hat Yai (coordinates in Maps section of IMPLEMENTATION-PLAN-DEADLINE-3PM.md). Chips or buttons that move the map camera to each region.

## Conflict avoidance

- Only you edit `mobile/**`. Backend and Next devs do not create or edit files under `mobile/`.
- If the API changes, Backend updates the contract; you update `api.ts` and screens. Don’t change `backend/` or `frontend/`.

---

# Conflict-free workflow summary

| Person | Owns | Does not touch |
|--------|------|----------------|
| **Backend** | `backend/`, root `.env` (backend vars) | `frontend/`, `mobile/` |
| **Next** | `frontend/` | `backend/`, `mobile/` |
| **Mobile** | `mobile/` | `backend/`, `frontend/` |

- **Merge order:** Backend first (so API is stable), then Next and Mobile in any order. Next and Mobile don’t depend on each other’s code.
- **Contract:** All three rely on the **API contract** in this doc (and on `backend/app/schemas.py` for the backend). Backend is the source of truth for request/response shapes; Next and Mobile mirror types in their own `api.ts`.
- **Running together:** Backend on :8000, Next on :3000, Mobile on Expo/React Native port. Mobile points at backend URL (same network or tunnel). No one needs to run another person’s app to do their work.

---

# Checklist: all endpoints created

| # | Endpoint | Backend | Next uses | Mobile uses |
|---|----------|---------|-----------|-------------|
| 1 | GET /health | ✓ health.py | ✓ status | ✓ status |
| 2 | POST /location/check-location | ✓ location.py | ✓ LocationSearch / check page | ✓ CheckRiskScreen |
| 3 | GET /boundaries/flood-boundaries | ✓ boundaries.py | ✓ FloodMap | ✓ MapScreen |
| 4 | GET /evacuation/evacuation-routes | ✓ evacuation.py | ✓ FloodMap route | ✓ MapScreen route |
| 5 | GET /predictions/predictions | ✓ predictions.py | ✓ map or list | ✓ PredictionsScreen / MapScreen |
| 6 | GET / | ✓ main.py | optional | optional |

When all six rows are done, the three parts integrate: Backend serves, Next and Mobile call the same API and stay in sync with this contract.
