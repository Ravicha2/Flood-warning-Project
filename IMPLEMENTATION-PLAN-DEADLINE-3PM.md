# Implementation Plan — Deadline 3 PM
## Elastic-First, Mobile-App Ready

**Goal:** By 3 PM, have Elastic Stack running with real data, FastAPI querying Elasticsearch, and APIs that the **mobile app** can call to show flood risk, boundaries, and predictions. Every Elastic component is used by or exposed to the mobile app via the backend.

---

## How Elastic Is Used on the Mobile App

| Mobile app need | Elastic source | API the mobile calls |
|-----------------|----------------|----------------------|
| “Am I in a flood zone?” | `flood-boundaries-*` (geo_shape) | `POST /location/check-location` |
| “Show flood zones on map” | `flood-boundaries-*` | `GET /boundaries/flood-boundaries` |
| “Nearest sensor / risk level” | `flood-sensors-*` (geo_point) | `POST /location/check-location` |
| “Predictions next 4–6 h” | `flood-predictions-*` | `GET /predictions/predictions` |
| “Safe route out” | `flood-boundaries-*` + routing | `GET /evacuation/evacuation-routes` |
| Health / status | Cluster health | `GET /health` |

**Flow:** Mobile → FastAPI → Elasticsearch. No direct ES connection from the app; all Elastic data is consumed via FastAPI.

---

## Maps: Quick go to Queensland, Sumatra, Hat Yai

Use these **preset regions** so users (and the demo) can jump the map to the three focus areas. Same coordinates work in **Kibana Maps** (initial/saved view) and the **mobile app** (quick-go-to buttons).

| Region | Country | Center (lat, lon) | Suggested zoom | Notes |
|--------|---------|-------------------|----------------|--------|
| **Queensland** | Australia | -27.4698, 153.0251 | 8–10 | Brisbane area; seed sensor QLD-001, QLD-002 |
| **Sumatra** | Indonesia | -0.7893, 113.9213 | 6–8 | Central Sumatra; or use 3.5952, 98.6722 (Medan) for seed sensor SUM-001 |
| **Hat Yai** | Thailand | 7.0086, 100.4747 | 10–12 | Hat Yai city; seed sensor HTY-001, boundary BOUND-HTY-001 |

**Implementation:**
- **Kibana:** When building the map, set the default view to one of these (e.g. Queensland); optionally save three map views or document “pan to Queensland / Sumatra / Hat Yai” for the demo.
- **Mobile app:** On the map screen, add three chips or buttons: “Queensland”, “Sumatra”, “Hat Yai”. On tap, set map center and zoom (e.g. `region` or `camera` with `latitude`, `longitude`, `latitudeDelta`/`longitudeDelta` or zoom level) so the map flies to that region. Use the coordinates above; zoom level is map-library specific (e.g. React Native Maps: delta ~0.5–1.5 for region view).

---

## Time Budget (Assume start ~9 AM → 3 PM = 6 hours)

| Block | Duration | Focus |
|-------|----------|--------|
| **Phase 1** | 60 min | Elastic Stack up, indices, seed data |
| **Phase 2** | 60 min | Logstash pipeline → data into Elasticsearch |
| **Phase 3** | 90 min | FastAPI endpoints query Elasticsearch (mobile-ready) |
| **Phase 4** | 45 min | Kibana Maps + dashboard (demo) |
| **Phase 5** | 60 min | Mobile app calls APIs + buffer / polish |
| **Buffer** | 45 min | Fixes, testing, demo run-through |

---

## Phase 1: Elastic Stack Running + Indices + Seed Data (60 min)

**Objective:** Elasticsearch and Kibana running; index templates applied; seed data loaded so the mobile app has something to query.

### 1.1 Start Elastic Stack (10 min)

```bash
cd "c:\Users\GEYE ARDIANSYAH\Downloads\Innovation Hub\Flood-warning-Project"
cp .env.example .env
# Edit .env: set ELASTIC_PASSWORD, OPENWEATHERMAP_API_KEY
docker-compose up -d
```

- Verify Elasticsearch: `http://localhost:9200` (login: `elastic`, password from `.env`).
- Verify Kibana: `http://localhost:5601` (same credentials after Kibana system user setup if prompted).

### 1.2 Apply Index Templates (10 min)

1. Open **Kibana Dev Tools**: `http://localhost:5601/app/dev_tools#/console`
2. Paste and run **each** PUT block from `elasticsearch/index-templates.ndjson`:
   - `PUT _index_template/flood-sensors-template` (lines 13–45)
   - `PUT _index_template/flood-boundaries-template` (lines 52–78)
   - `PUT _index_template/flood-predictions-template` (lines 85–108)
3. Confirm: `GET _index_template/flood-sensors-template` (and same for boundaries, predictions).

### 1.3 Load Seed Data (15 min)

1. In Dev Tools, run each `POST .../_doc` from `elasticsearch/seed-data.ndjson` (sensors, boundaries, one prediction).
2. If the index name uses a date (e.g. `flood-sensors-2024.01.15`), create it first if needed:
   - `POST flood-sensors-2024.01.15/_doc` (x4 sensor docs)
   - `POST flood-boundaries-2024.01.15/_doc` (x2 boundary docs)
   - `POST flood-predictions-2024.01.15/_doc` (x1 prediction doc)
3. Verify: `GET flood-sensors-*/_count`, `GET flood-boundaries-*/_count`, `GET flood-predictions-*/_count`.

### 1.4 Backend Can Talk to Elasticsearch (10 min)

- In `backend`, ensure `.env` or env vars: `ES_HOST=http://localhost:9200`, `ES_USERNAME=elastic`, `ES_PASSWORD=<from .env>`.
- From `backend`: `pip install -r requirements.txt`, then run a one-off script or `uvicorn main:app` and hit `GET /health` once health is implemented (Phase 3). No need for full routers yet.

### 1.5 Checklist Phase 1

- [ ] `docker-compose up -d` — ES and Kibana healthy
- [ ] All three index templates applied in Dev Tools
- [ ] Seed data loaded (sensors, boundaries, predictions)
- [ ] Backend env points to ES; dependency install works

---

## Phase 2: Logstash Pipeline — Data Into Elasticsearch (60 min)

**Objective:** Weather (and optional simulated sensor) data flows into `flood-sensors-*` so the mobile app sees live or refreshed data via the API.

### 2.1 Fix Logstash Filter for Weather (35 min)

In `logstash/pipeline/flood-sensors.conf`, implement the `filter` block for `[type] == "weather"`:

- Map `coord.lat` / `coord.lon` → `location` as geo_point: `{ "lat": ..., "lon": ... }`.
- Map `main.temp` → `temperature_c`, `main.humidity` → `humidity_pct`, `wind.speed` → `wind_speed_ms`.
- Map `rain.1h` or `rain.3h` (if present) → `rainfall_mm`; else set 0 or omit.
- Set `sensor_id` from the URL key (e.g. `queensland` → `QLD-OWM`, `hat_yai` → `HTY-OWM`, `sumatra` → `SUM-OWM`), `station_name` from a static map, `source` = `openweathermap`, `risk_level` from a simple rule (e.g. rainfall &gt; 50 → `medium`, &gt; 100 → `high`), `water_level_unit` = `metres`, `water_level` = 0 or a derived value if you have no gauge.
- Use `date` filter so `timestamp` is set from `dt` (OpenWeatherMap) or `@timestamp`.
- Add field `ingested_at` = `@timestamp`.

Ensure the **output** section indexes to `flood-sensors-%{+YYYY.MM.dd}` and uses `ELASTICSEARCH_HOST`, `ELASTIC_USERNAME`, `ELASTIC_PASSWORD` from the environment.

### 2.2 Restart Logstash and Confirm Data (15 min)

```bash
docker-compose restart logstash
# Wait 1–2 minutes, then in Kibana Dev Tools:
GET flood-sensors-*/_search?size=5&sort=@timestamp:desc
```

- Check that documents have `location` (geo_point), `temperature_c`, `humidity_pct`, `timestamp`, `ingested_at`. If the HTTP poller runs every 5m, you may need to wait or trigger once.

### 2.3 Optional: Simulated Sensor via TCP (10 min)

- Keep the `tcp { port => 5045 }` input; in filter for `[type] == "sensor_simulated"` add default `location` (e.g. Hat Yai) and `ingested_at`.
- Test: `echo '{"sensor_id":"DEMO-001","water_level":1.5,"rainfall_mm":20}' | nc localhost 5045` (or PowerShell equivalent), then search `flood-sensors-*` again.

### 2.4 Checklist Phase 2

- [ ] Weather filter maps coord, main.*, wind, rain → schema
- [ ] Logstash restarted; `flood-sensors-*` has new docs
- [ ] Mobile will get this data via `GET /location/check-location` and sensors near point (Phase 3)

---

## Phase 3: FastAPI Endpoints — Elasticsearch Queries for Mobile (90 min)

**Objective:** All APIs that the mobile app needs are implemented and query Elasticsearch. Mobile only talks to FastAPI.

### 3.1 Startup and Health (15 min)

- In `main.py` `startup`: call `get_es_client()`, await cluster health (e.g. `GET _cluster/health`), optionally check index templates or indices exist. Connect MongoDB if used.
- Implement **GET /health**: ping Elasticsearch (`GET _cluster/health` or `GET /`) and MongoDB; return `{ "elasticsearch": "ok", "mongodb": "ok" }` or status 503 if either fails.
- Wire the health router: `app.include_router(health.router, prefix="/health", tags=["Health"])`.

**Mobile use:** App can call `GET <API_URL>/health` to show “System operational” or warn if backend/ES is down.

### 3.2 GET /boundaries/flood-boundaries (20 min)

- **Index:** `flood-boundaries-*`
- **Query:** Bool filter: `active == true` (if `active_only=true`), optional `country` term. No geo_shape filter; return all matching boundaries.
- **Response:** For each hit, map `_source` to `FloodBoundaryItem` (include `flood_boundary` as the geometry dict for map overlay). Return `{ "total": N, "boundaries": [ ... ] }`.
- Add optional query params: `at_time` (ISO8601) to filter by `valid_from` ≤ `at_time` ≤ `valid_until` for time-scoped map (Phase 2.2 in main plan).
- Wire router: `app.include_router(boundaries.router, prefix="/boundaries", tags=["Boundaries"])`.

**Mobile use:** Fetch boundaries to draw polygons on the map; optionally pass `at_time` when user picks a date/time.

### 3.3 POST /location/check-location (30 min)

- **Request body:** `latitude`, `longitude`, optional `radius_km`.
- **Elasticsearch:**
  1. **Boundaries:** `geo_shape` query: shape = Point(lon, lat), relation = intersects, index = `flood-boundaries-*`, filter `active: true`. Collect boundary IDs/names.
  2. **Sensors:** `geo_distance` query from (lat, lon), distance = `radius_km` km, index = `flood-sensors-*`; sort by distance; take nearest. Use its `water_level`, `risk_level`, `sensor_id`.
  3. **Predictions (optional):** `geo_distance` + range on `predicted_for` (e.g. now to now+6h); take best match or highest risk.
- **Response:** Build `LocationCheckResponse`: `risk_level` (from boundary overlap or nearest sensor), `nearest_sensor_id`, `water_level_m`, `active_boundaries` (list of IDs/names), optional `predicted_flood_time`, optional `evacuation_route` (can call evacuation logic or leave empty for now).
- Wire router: `app.include_router(location.router, prefix="/location", tags=["Location"])`.

**Mobile use:** “Check my risk” button sends device lat/lon; app shows risk and nearest sensor.

### 3.4 GET /predictions/predictions (15 min)

- **Index:** `flood-predictions-*`
- **Query:** Range on `predicted_for`: from now to now + `hours_ahead`. Optional: if `lat`/`lon` provided, add `geo_distance` filter. Sort by `predicted_for` asc, `confidence_score` desc.
- **Response:** Map hits to `PredictionItem` list; return `{ "total": N, "predictions": [ ... ] }`.
- Optional: support `at_time` so mobile can request “predictions valid at this chosen time”.
- Wire router: `app.include_router(predictions.router, prefix="/predictions", tags=["Predictions"])`.

**Mobile use:** “Predictions” tab or map layer for next 4–6 h; optional time picker.

### 3.5 GET /evacuation/evacuation-routes (10 min)

- **Input:** Query params `lat`, `lon`.
- **Logic:** Fetch active flood polygons from `flood-boundaries-*` (same as boundaries endpoint). Simplify polygons (e.g. Shapely Douglas-Peucker) if you have a routing client that accepts `avoid_polygons`. Call OpenRouteService (or Mapbox/GraphHopper) with origin (lat, lon), optional destination (e.g. nearest low-risk point), and `avoid_polygons` = simplified GeoJSON. Return waypoints and metadata in `EvacuationRouteResponse`.
- If time is short: return a stub (e.g. empty waypoints) and document “integrate OpenRouteService next”; mobile can still call the endpoint.
- Wire router: `app.include_router(evacuation.router, prefix="/evacuation", tags=["Evacuation"])`.

**Mobile use:** “Get safe route” from current location; show route on map.

### 3.6 Checklist Phase 3

- [ ] GET /health returns ES (and Mongo) status
- [ ] GET /boundaries/flood-boundaries returns GeoJSON-style boundaries for map
- [ ] POST /location/check-location returns risk, nearest sensor, active boundaries
- [ ] GET /predictions/predictions returns list of predictions
- [ ] GET /evacuation/evacuation-routes implemented (or stubbed)
- [ ] All routers registered in `main.py`; CORS allows mobile (e.g. allow_origins for app or `*` for dev)

---

## Phase 4: Kibana Maps and Dashboard (45 min)

**Objective:** Demonstrate Elastic data in Kibana for judges; same indices the mobile app uses via API.

### 4.1 Kibana Maps (25 min)

1. Open **Maps**: Kibana → Maps → Create map.
2. Add layer: **Elasticsearch** → Index pattern `flood-sensors-*` → Geospatial field `location` → Symbol or heat map. Save as “Flood sensors”.
3. Add layer: **Elasticsearch** → Index pattern `flood-boundaries-*` → Geospatial field `flood_boundary` (geo_shape). Save as “Flood boundaries”.
4. Add layer: **Elasticsearch** → Index pattern `flood-predictions-*` → Geospatial field `location`. Save as “Predictions”.
5. Add base map (e.g. Road map / EMS if available).
6. **Quick go to regions:** Set the map’s default view to one of the three regions (see **Maps: Quick go to Queensland, Sumatra, Hat Yai**): e.g. center Queensland (-27.4698, 153.0251) at zoom ~8. For the demo, you can manually pan to **Sumatra** (-0.7893, 113.9213) and **Hat Yai** (7.0086, 100.4747) to show seed data there.
7. Save map, add to dashboard.

### 4.2 Dashboard (20 min)

- Create dashboard; add the saved map.
- Add panels: Count of `flood-sensors-*`, count of `flood-boundaries-*`, optional aggregation by `risk_level`.
- Save dashboard. Use it in the demo to show “same data the mobile app is reading via the API”.

### 4.3 Checklist Phase 4

- [ ] Map shows sensors (points), boundaries (polygons), predictions (points)
- [ ] Map default or demo views: Queensland, Sumatra, Hat Yai (quick go to)
- [ ] Dashboard includes map + at least one count/aggregation
- [ ] Ready to show in demo: “Kibana and the mobile app both use Elasticsearch”

---

## Phase 5: Mobile App Uses Elastic (Via API) (60 min)

**Objective:** Mobile app (React Native or Expo) calls FastAPI; every screen that needs flood data uses the endpoints above.

### 5.1 API Base URL and Health (10 min)

- In the mobile app, set API base URL (e.g. `http://<your-machine-ip>:8000` for device on same network, or localhost for emulator).
- On app load or settings, call `GET /health`; show a banner or icon if backend/Elastic is down.

### 5.2 “Check my risk” Screen (20 min)

- Get device location (or allow manual lat/lon input).
- Call `POST /location/check-location` with `{ "latitude": ..., "longitude": ... }`.
- Display: risk level, nearest sensor ID, water level, list of active boundaries, and optional “Get evacuation route” button.

### 5.3 Map Screen (20 min)

- Call `GET /boundaries/flood-boundaries` and draw polygons on the map (e.g. React Native Maps / MapLibre).
- Optionally call `GET /predictions/predictions` and show prediction points or a simple list.
- Show user location; optionally a “Check risk here” tap that calls `POST /location/check-location` for that point.
- **Quick go to Queensland, Sumatra, Hat Yai:** Add three buttons or chips above/below the map: “Queensland”, “Sumatra”, “Hat Yai”. On tap, move the map camera to the preset (see **Maps: Quick go to Queensland, Sumatra, Hat Yai**):
  - **Queensland:** center (-27.4698, 153.0251), zoom ~8–10
  - **Sumatra:** center (-0.7893, 113.9213) or (3.5952, 98.6722) for Medan, zoom ~6–8
  - **Hat Yai:** center (7.0086, 100.4747), zoom ~10–12

### 5.4 Evacuation and Predictions (10 min)

- “Get route” button: call `GET /evacuation/evacuation-routes?lat=...&lon=...` and draw the route polyline on the map (or list of waypoints).
- Predictions: either on the map or in a list from `GET /predictions/predictions`.

### 5.5 Checklist Phase 5

- [ ] Mobile app has configurable API base URL
- [ ] Health check called; user sees backend status
- [ ] Check my risk uses POST /location/check-location
- [ ] Map shows boundaries from GET /boundaries/flood-boundaries
- [ ] Quick go to: Queensland, Sumatra, Hat Yai buttons move map to preset regions
- [ ] Predictions and evacuation routes (or stubs) wired to API

---

## AWS deployment: using your access key

You have **AWS access keys**; use them only via **environment variables**, never in code or in git.

### 1. Store AWS credentials in env (do not commit)

Add to your **`.env`** (and ensure `.env` is in `.gitignore`):

```bash
# --- AWS (for deployment) ---
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-southeast-1
```

- **AWS_ACCESS_KEY_ID** and **AWS_SECRET_ACCESS_KEY**: from your AWS access key.
- **AWS_REGION**: e.g. `ap-southeast-1` (Singapore), `us-east-1`, or the region where you deploy.

On the **machine that runs deploy commands** (your laptop or CI), either:

- Export in the shell: `$env:AWS_ACCESS_KEY_ID="AKIA..."; $env:AWS_SECRET_ACCESS_KEY="..."; $env:AWS_REGION="ap-southeast-1"` (PowerShell), or
- Use the same in `.env` and load them in your app/deploy script (e.g. backend reads them only when connecting to S3 or other AWS services).

### 2. Where the keys are used in this project

| Use case | How |
|----------|-----|
| **Elastic Cloud on AWS** | Create deployment at [cloud.elastic.co](https://cloud.elastic.co) or via [AWS Marketplace](https://www.elastic.co/docs/deploy-manage/deploy/elastic-cloud/aws-marketplace). Billing uses your AWS account; you do **not** put AWS keys inside Elastic Cloud. You only need Elastic Cloud credentials (e.g. `ES_HOST`, `ES_USERNAME`, `ES_PASSWORD`) in `.env` for the backend. |
| **Backend / app on EC2, ECS, or Lambda** | The **server** (EC2/ECS/Lambda) that runs FastAPI or Logstash needs AWS credentials to call AWS APIs (S3, Kinesis, etc.). Set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` in the **environment** of that server (e.g. EC2 instance profile, ECS task definition, or Lambda env vars). Prefer **IAM roles** (no keys on the box) when possible. |
| **CLI / deploy from your PC** | When you run `aws` CLI or a deploy script from your machine, it reads from `.env` or from `~/.aws/credentials`. Use the same keys only on your machine; never commit them. |
| **S3 (blue zones, assets)** | Backend or a batch job that reads/writes S3 uses the env vars above (or the IAM role of the EC2/ECS task). |
| **Kinesis / Lambda (ingestion)** | If you add Kinesis Data Firehose or Lambda to push sensor data into Elasticsearch, the Lambda or Firehose execution role (or env vars you set for a custom Lambda) use AWS credentials. |

### 3. Implementation steps (add to your flow)

1. **`.env` (local / server):** Add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`. Keep `.env` out of git.
2. **`.env.example`:** Add placeholders for these (no real values), so the team knows what to set.
3. **Elastic Cloud on AWS:** Sign up or log in at [cloud.elastic.co](https://cloud.elastic.co); create a deployment (choose AWS and your region). After creation, copy the **Elasticsearch endpoint**, **username**, and **password** into `.env` as `ES_HOST`, `ES_USERNAME`, `ES_PASSWORD`. Your AWS access key is **not** stored in Elastic Cloud; billing is linked to your AWS account via Marketplace or billing settings.
4. **Backend:** Point `ES_HOST` (and auth) to the Elastic Cloud URL when deploying. If the backend uses S3 or other AWS services, read `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` from the environment at runtime.
5. **Deploy backend to AWS:** Run FastAPI on EC2, ECS, or Lambda; set env vars (including AWS_* and ES_*) in the task/instance config. Prefer IAM roles for the instance/task so you don’t put keys in config.
6. **Mobile app:** No AWS keys in the app. It only calls your FastAPI URL (e.g. `https://your-api.example.com`). The backend uses AWS/Elastic credentials server-side.

### 4. Security checklist

- [ ] `.env` is in `.gitignore`; no access key in any committed file.
- [ ] `.env.example` has placeholders only (e.g. `AWS_ACCESS_KEY_ID=your_key_here`).
- [ ] Production: prefer IAM roles for EC2/ECS/Lambda instead of long-lived keys in env.
- [ ] Rotate keys if they were ever committed or shared.

---

## Buffer and Demo Run-Through (45 min)

- Fix any failing ES queries (check index names, date patterns, field names).
- Ensure mobile and backend on same network (or use tunnel if needed).
- Run through: Start Stack → Load seed data → Start backend → Open mobile → Check risk → Show map → Show Kibana dashboard. Prepare 2–3 talking points: “Elastic holds all flood data”; “Mobile never talks to Elastic directly—only through our API”; “Logstash keeps sensors up to date in Elastic.”

---

## Quick Reference: Elastic ↔ Mobile

| Elastic component | What it does | Mobile sees it via |
|-------------------|--------------|--------------------|
| **Elasticsearch** | Stores sensors (geo_point), boundaries (geo_shape), predictions (geo_point) | FastAPI queries ES; mobile calls FastAPI |
| **Index templates** | Define geo_point, geo_shape, date fields | Applied once; all new data matches schema |
| **Seed data** | Demo sensors/boundaries/predictions | GET boundaries, GET predictions, POST check-location |
| **Logstash** | Pushes weather → flood-sensors-* | Same APIs return live sensor data |
| **Kibana Maps** | Visualize same indices | Demo only; mobile uses its own map + API data |

---

## File Checklist (Implementation)

- [ ] `docker-compose.yml` — no changes needed if already has ES, Kibana, Logstash, MongoDB
- [ ] `.env` — ELASTIC_PASSWORD, OPENWEATHERMAP_API_KEY, ES_HOST, ES_USERNAME, ES_PASSWORD; **AWS**: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (for deployment; never commit real keys)
- [ ] `elasticsearch/index-templates.ndjson` — apply in Dev Tools
- [ ] `elasticsearch/seed-data.ndjson` — run in Dev Tools
- [ ] `logstash/pipeline/flood-sensors.conf` — complete filter for weather (and optional TCP sensor)
- [ ] `backend/main.py` — startup (ES client, health), wire all routers, CORS
- [ ] `backend/app/routers/health.py` — GET /health (ES + Mongo)
- [ ] `backend/app/routers/boundaries.py` — GET /boundaries/flood-boundaries
- [ ] `backend/app/routers/location.py` — POST /location/check-location (geo_shape + geo_distance)
- [ ] `backend/app/routers/predictions.py` — GET /predictions/predictions
- [ ] `backend/app/routers/evacuation.py` — GET /evacuation/evacuation-routes (or stub)
- [ ] Mobile app: API client, health, check-location, boundaries on map, predictions, evacuation
- [ ] **AWS:** `.env.example` includes AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION; use env vars only for deploy and backend–AWS integration (see **AWS deployment: using your access key**)

---

**End of implementation plan. Focus: Elastic implemented end-to-end and fully used by the mobile app via FastAPI. AWS keys used only via env for deployment and optional S3/Kinesis/Lambda.**
