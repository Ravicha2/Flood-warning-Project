# Flood Early Warning System — Hackathon Task Checklist

## Phase 1: Environment Setup
- [ ] Start Elastic Stack via Docker Compose
- [ ] Verify Elasticsearch at http://localhost:9200
- [ ] Verify Kibana at http://localhost:5601
- [ ] Install backend Python dependencies
- [ ] Install frontend Node dependencies
- [ ] Set up .env files in backend and frontend

## Phase 2: Elasticsearch Configuration
- [ ] Apply index template for sensor data (geo_point, geo_shape)
- [ ] Apply index template for flood boundaries
- [ ] Apply index template for predictions
- [ ] Index sample sensor documents (20–30 records)
- [ ] Index sample flood boundary polygons (Queensland, Sumatra, Hat Yai)
- [ ] Test queries in Kibana Dev Tools Console

## Phase 3: Data Pipeline (Logstash)
- [ ] Configure Logstash HTTP poller for OpenWeatherMap API
- [ ] Configure Logstash filter to parse/enrich JSON
- [ ] Configure Logstash output to Elasticsearch
- [ ] Verify data flow in Kibana

## Phase 4: Backend (FastAPI)
- [ ] Implement POST /check-location endpoint
- [ ] Implement GET /flood-boundaries endpoint
- [ ] Implement GET /evacuation-routes endpoint
- [ ] Implement GET /predictions endpoint
- [ ] Implement GET /health endpoint
- [ ] Connect Elasticsearch client
- [ ] Connect MongoDB client

## Phase 5: Machine Learning
- [ ] Load historical water level data into Elasticsearch ML
- [ ] Train anomaly detection job
- [ ] Implement /predictions endpoint consuming ML results

## Phase 6: Frontend (Next.js)
- [ ] Create home page with location search input
- [ ] Integrate Leaflet / Mapbox map component
- [ ] Display flood boundary polygons on map
- [ ] Display sensor point data on map
- [ ] Display alert banners based on risk level
- [ ] Connect to FastAPI backend

## Phase 7: Kibana Dashboards
- [ ] Create Maps layer for sensor geo_point data
- [ ] Create Maps layer for flood boundary polygons
- [ ] Add heatmap layer for risk concentration
- [ ] Add time slider
- [ ] Save and export dashboard

## Phase 8: Integration & QA
- [ ] End-to-end flow test: location input → API → Elasticsearch → response
- [ ] Verify Logstash continuous ingestion
- [ ] Verify fallback cached data strategy

## Phase 9: Docs & Demo Prep
- [ ] Write README.md
- [ ] Prepare architecture diagram (Mermaid)
- [ ] Write API endpoint documentation
- [ ] Write demo script
- [ ] Record backup demo video
- [ ] Prepare 3-minute pitch
