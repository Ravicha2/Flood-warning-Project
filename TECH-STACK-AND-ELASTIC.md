# Tech Stack — Flood Early Warning System (Elastic-focused)

## All technologies in the project

| Layer | Technology | Purpose |
|-------|------------|--------|
| **Search & geo** | **Elasticsearch 8.x** | Geospatial storage, risk queries, boundaries, sensors, predictions |
| **Observability** | **Kibana 8.x** | Dashboards, Maps, Dev Tools, index inspection |
| **Ingest (optional)** | **Logstash 8.x** | Pipelines for sensor/weather data into Elasticsearch |
| **Backend API** | **FastAPI** (Python 3.x) | REST API; only component that talks to Elasticsearch |
| **Backend runtime** | **Uvicorn** | ASGI server for FastAPI |
| **Database** | **MongoDB** | Optional app data; health check |
| **AI / assistant** | **Amazon Bedrock** (Claude) or **Anthropic API** | Flood assistant chat; critical-mode prompts |
| **ML (optional)** | **scikit-learn**, **pandas**, **numpy** | Rule-based or trained predictor; no training required for demo |
| **Geometry** | **Shapely** | Polygon handling for evacuation routes |
| **Web frontend** | **Next.js 16**, **React 19**, **Leaflet**, **Tailwind** | Map, check risk, dashboards |
| **Mobile app** | **Expo 54**, **React Native**, **expo-router**, **react-native-maps**, **MapLibre** | Map, Check Risk, Predictions, **Assistant**, Settings, emergency call |
| **Deploy / cloud** | **AWS** (Bedrock, optional S3/SES/SNS), **Docker** | Backend and Elastic Stack via docker-compose |

---

## Elastic focus — what runs where

- **Elasticsearch**: single source of truth for flood-related geo and time-series data. No client (web/mobile) talks to Elasticsearch directly; all access goes through the FastAPI backend.
- **Kibana**: operations, debugging, and (optionally) map visualizations; Dev Tools for running and tuning Elasticsearch queries.
- **Logstash**: optional; used to ingest live sensor/weather data into Elasticsearch (e.g. from HTTP, Beats, or files).

---

## Elasticsearch in this project

### 1. Indices and index patterns

All use index **patterns** (e.g. `flood-sensors-*`) so you can have time- or region-based indices. Templates are in [elasticsearch/index-templates.ndjson](elasticsearch/index-templates.ndjson) (apply in Kibana Dev Tools).

| Index pattern | Use | Key field types |
|----------------|-----|------------------|
| **flood-sensors-\*** | Live or historical sensor readings (water level, rain, risk) | `location` (geo_point), `water_level`, `risk_level`, `timestamp` |
| **flood-boundaries-\*** | Flood zone polygons (e.g. Queensland, Sumatra, Hat Yai) | `flood_boundary` (geo_shape), `country`, `active`, `risk_level` |
| **flood-predictions-\*** | Predicted water level / risk for the next hours | `location` (geo_point), `predicted_water_level`, `predicted_risk_level`, `predicted_for` |

### 2. Geospatial features used

- **geo_point** (`location` in sensors and predictions)  
  - **geo_distance**: nearest sensor within N km, sorted by distance.  
  - **geo_bounding_box**: sensors in a rectangle (e.g. Queensland).  
  Used in: **POST /location/check-location** (nearest sensor), **GET /predictions/predictions**, **GET /evacuation/evacuation-routes** (nearest points).

- **geo_shape** (`flood_boundary` in boundaries)  
  - **geo_shape** query with `relation: "intersects"` and a Point: “does this point fall inside any flood polygon?”  
  Used in: **POST /location/check-location** (am I in a flood zone?), **GET /boundaries/flood-boundaries**, **GET /assistant/emergency-number** (country from overlapping boundary), evacuation route logic (fetch active boundaries and avoid them).

### 3. Backend endpoints that use Elasticsearch

| Endpoint | What it does with Elasticsearch |
|----------|---------------------------------|
| **GET /health** | Pings cluster (`cluster.health`) to report Elasticsearch status. |
| **POST /location/check-location** | 1) `geo_shape` on `flood-boundaries-*` (point-in-polygon → risk + country). 2) `geo_distance` on `flood-sensors-*` (nearest sensor, water level, risk). 3) `geo_distance` + time on `flood-predictions-*` (earliest predicted flood time). |
| **GET /boundaries/flood-boundaries** | Search `flood-boundaries-*` with optional `country`, `active_only`, `at_time`; returns GeoJSON polygons for the map. |
| **GET /predictions/predictions** | Search `flood-predictions-*` with optional `lat`, `lon`, `hours_ahead`, `at_time`; returns list of predictions. |
| **GET /evacuation/evacuation-routes** | 1) Search `flood-boundaries-*` for active `geo_shape` polygons. 2) Use Shapely to compute a route that avoids those polygons (plus optional OpenRouteService). |
| **POST /assistant/ask** | Uses the same location logic as check-location (boundaries + sensors + predictions) to build context for Claude/Bedrock. |
| **GET /assistant/emergency-number** | `geo_shape` on `flood-boundaries-*` to get country for the given lat/lon; then map country → emergency number. |

### 4. Client and auth

- **Library**: `elasticsearch` (Python) async client, version **8.12+** ([backend/app/db/elasticsearch.py](backend/app/db/elasticsearch.py)).
- **Auth**: API key (`ELASTICSEARCH_API_KEY`) or basic auth (`ES_USERNAME` / `ES_PASSWORD`); config in [backend/app/config.py](backend/app/config.py).

### 5. Kibana

- **Dev Tools**: run and debug the queries from [elasticsearch/index-templates.ndjson](elasticsearch/index-templates.ndjson) (e.g. geo_distance, geo_shape examples).
- **Maps**: add layers from the `flood-boundaries-*` and `flood-sensors-*` index patterns to visualize zones and sensors.
- **Discover / Dashboards**: inspect indices and build dashboards for sensors and predictions.

### 6. Logstash (optional)

- Referenced in [PROMPT.md](PROMPT.md) and implementation plans for real-time ingestion (weather APIs, sensor feeds) into the same Elasticsearch indices. Not required for the current API or mobile flow; the backend reads from Elasticsearch only.

---

## Data flow (Elastic-centric)

```
[Logstash / manual ingest]  →  Elasticsearch (flood-sensors-*, flood-boundaries-*, flood-predictions-*)
                                        ↑
                                        │ read-only
                                        │
[FastAPI backend]  ←── HTTP ── [Web (Next.js) / Mobile (Expo)]
     │
     ├── geo_shape (boundaries)   →  “Am I in a flood zone?” / country / evacuation avoid zones
     ├── geo_distance (sensors)  →  Nearest sensor, water level, risk
     └── geo_distance + time (predictions) →  Upcoming flood predictions
```

---

## Quick reference

- **Elasticsearch**: all flood geo and time-series data; accessed only by the backend.
- **geo_point**: sensors and predictions; distance and bounding-box queries.
- **geo_shape**: flood zones; point-in-polygon and polygon fetch for maps and evacuation.
- **Kibana**: operations, Maps, and Dev Tools.
- **Logstash**: optional ingest into Elasticsearch; not required for the current app.
