# Real-Time Flood Early Warning System

> **Hackathon Project** — Real-time, street-level flood predictions using Elasticsearch geospatial intelligence.

## Problem Statement

Traditional flood warnings operate at regional scale (district/province level), giving residents little actionable guidance. This system delivers **street-level flood risk** by combining real-time sensor telemetry, weather API data, and satellite-derived boundaries indexed in Elasticsearch — enabling precise geo-queries that match any coordinate against live flood polygons.

## Architecture

```ini
Weather APIs ─┐
Sensor Data  ─┼──► Logstash ──► Elasticsearch ──► FastAPI ──► Next.js
Satellite    ─┘         ▲              │
                        │              └──► Kibana Dashboards
                     MongoDB
                 (users, routes)
```

## Tech Stack

| Layer | Technology |
|---|---|
| Geospatial indexing | Elasticsearch 8.x (`geo_point`, `geo_shape`) |
| Data visualisation | Kibana Maps + Dashboards |
| Data ingestion | Logstash pipelines |
| Backend API | FastAPI (Python) |
| Frontend | Next.js 14 (TypeScript + Tailwind) |
| User data | MongoDB (Motor async driver) |
| ML predictions | scikit-learn / Elasticsearch ML |

## Project Structure

```ini
Flood-warning/
├── docker-compose.yml        ← Elastic Stack + MongoDB
├── .env.example              ← Copy to .env and fill API keys
│
├── elasticsearch/
│   ├── index-templates.ndjson ← Index mappings (run in Dev Tools)
│   └── seed-data.ndjson       ← Sample documents for demo
│
├── logstash/
│   ├── config/logstash.yml
│   └── pipeline/flood-sensors.conf ← Weather + sensor ingestion
│
├── backend/                  ← FastAPI application
│   ├── requirements.txt
│   ├── main.py               ← App entry point
│   └── app/
│       ├── config.py         ← Settings from .env
│       ├── schemas.py        ← Pydantic request/response models
│       ├── db/
│       │   ├── elasticsearch.py
│       │   └── mongodb.py
│       ├── routers/
│       │   ├── location.py   ← POST /check-location
│       │   ├── boundaries.py ← GET /flood-boundaries
│       │   ├── evacuation.py ← GET /evacuation-routes
│       │   ├── predictions.py← GET /predictions
│       │   └── health.py     ← GET /health
│       └── services/
│           └── ml_predictor.py ← Flood prediction model
│
└── frontend/                 ← Next.js application
    ├── .env.example
    └── src/
        ├── app/page.tsx      ← Home page
        ├── components/
        │   ├── FloodMap.tsx
        │   ├── RiskAlert.tsx
        │   └── LocationSearch.tsx
        └── lib/api.ts        ← Typed API client
```

## Quick Start

### Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 18+
- OpenWeatherMap API key (free tier)

### 1. Start the Elastic Stack

```bash
cp .env.example .env
# Edit .env — add your OPENWEATHERMAP_API_KEY
docker-compose up -d
```

Verify:

- Elasticsearch: http://localhost:9200
- Kibana: http://localhost:5601

### 2. Apply Index Templates & Seed Data

Open Kibana Dev Tools (http://localhost:5601/app/dev_tools#/console) and paste the contents of:

- `elasticsearch/index-templates.ndjson`
- `elasticsearch/seed-data.ndjson`

### 3. Start the Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp ../.env.example .env   # or symlink
uvicorn main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### 4. Start the Frontend

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

App: http://localhost:3000

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/location/check-location` | Check flood risk for a coordinate |
| `GET`  | `/boundaries/flood-boundaries` | Active flood boundaries (GeoJSON) |
| `GET`  | `/evacuation/evacuation-routes` | Evacuation route from a point |
| `GET`  | `/predictions/predictions` | ML predictions for next N hours |
| `GET`  | `/health` | Service health check |

**Example — check location:**

```bash
curl -X POST http://localhost:8000/location/check-location \
  -H "Content-Type: application/json" \
  -d '{"latitude": -27.4698, "longitude": 153.0251}'
```

## Key Elasticsearch Queries

### geo_distance — nearest sensors

```json
GET flood-sensors-*/_search
{ "query": { "geo_distance": { "distance": "50km", "location": { "lat": 7.0086, "lon": 100.4747 } } } }
```

### geo_shape intersect — is this point in a flood zone?

```json
GET flood-boundaries-*/_search
{ "query": { "geo_shape": { "flood_boundary": { "shape": { "type": "Point", "coordinates": [153.0251, -27.4698] }, "relation": "intersects" } } } }
```

## Environment Variables

| Variable | Description |
|---|---|
| `ELASTIC_PASSWORD` | Elasticsearch admin password |
| `MONGO_URI` | MongoDB connection string |
| `OPENWEATHERMAP_API_KEY` | OpenWeatherMap free-tier API key |
| `NEXT_PUBLIC_API_URL` | Backend URL (Next.js env) |
| `NEXT_PUBLIC_MAP_PROVIDER` | `leaflet` or `mapbox` |

## Demo Script

1. Open Kibana → Maps → show live sensor data flowing in
2. Enter Brisbane coordinates in frontend → show risk assessment
3. Toggle Hat Yai (critical) → show evacuation route
4. Switch to Kibana → Dashboards → show prediction accuracy over time
5. Show geo_shape query in Dev Tools running in milliseconds

## Hackathon Checklist

- [ ] All Elastic Stack services running
- [ ] Index templates applied, seed data loaded
- [ ] FastAPI routers implemented
- [ ] Logstash pipeline ingesting weather data
- [ ] Kibana map dashboard created
- [ ] Frontend map rendering flood boundaries
- [ ] ML predictions endpoint working
- [ ] End-to-end demo rehearsed

## Team

<!-- TODO: add team members and roles -->

## License

MIT
