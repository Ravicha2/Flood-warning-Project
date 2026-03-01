# System prompt
strictly only boilerplate code and instructions. No actual implementation yet
# Context
**Situation**
You are participating in an Elastic hackathon tomorrow focused on building a flood early warning system. The project aims to provide real-time, street-level flood predictions by integrating multiple data sources (sensors, weather APIs, satellite imagery) into Elasticsearch's geospatial capabilities. The system will use machine learning to predict flood boundaries 4-6 hours in advance and deliver personalized, location-specific warnings with evacuation routes. Your tech stack includes ElasticMap, Logstash, Elasticsearch, Kibana, FastAPI, MongoDB, and Next.js.

**Task**
The assistant should provide a curated list of essential Elastic tools, resources, and documentation links that directly support your flood prediction system architecture. Following this, create a detailed execution plan broken down into time-blocked phases that will prepare you to build a functional prototype by tomorrow, including setup steps, data pipeline configuration, API integrations, and frontend deployment.

**Objective**
Enable you to arrive at the hackathon fully prepared with working knowledge of the necessary Elastic tools, a clear implementation roadmap, and a realistic timeline that maximizes your chances of delivering a working demo that showcases real-time geospatial flood prediction and visualization.

**Knowledge**
The system architecture requires:
- Ingesting real-time data from multiple sources (weather APIs, sensor data, satellite imagery)
- Storing and indexing geospatial data in Elasticsearch with polygon/point geometries
- Running geospatial queries to match locations against flood risk polygons
- Visualizing dynamic flood boundaries and evacuation routes on maps
- Providing a user-facing interface for location-based queries
- Machine learning models to predict flood patterns from historical data

Key technical challenges include:
- Configuring Elasticsearch geospatial field mappings (geo_point, geo_shape)
- Setting up Logstash pipelines for real-time data ingestion
- Implementing spatial queries (geo_bounding_box, geo_polygon, geo_distance)
- Creating Kibana dashboards with map visualizations
- Building FastAPI endpoints that query Elasticsearch
- Integrating frontend location services with backend predictions

**Essential Elastic Tools & Resources**

**Core Elastic Stack Components:**

1. **Elasticsearch 8.x**
   - Geospatial data types documentation: https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-point.html
   - Geo-shape queries: https://www.elastic.co/guide/en/elasticsearch/reference/current/geo-shape.html
   - Geospatial aggregations: https://www.elastic.co/guide/en/elasticsearch/reference/current/search-aggregations-bucket-geohashgrid-aggregation.html
   - Install: https://www.elastic.co/downloads/elasticsearch

2. **Kibana 8.x**
   - Maps application: https://www.elastic.co/guide/en/kibana/current/maps.html
   - Creating map layers: https://www.elastic.co/guide/en/kibana/current/maps-getting-started.html
   - Dashboard creation: https://www.elastic.co/guide/en/kibana/current/dashboard.html
   - Install: https://www.elastic.co/downloads/kibana

3. **Logstash 8.x**
   - Input plugins (HTTP, file, beats): https://www.elastic.co/guide/en/logstash/current/input-plugins.html
   - Filter plugins (grok, mutate, geoip): https://www.elastic.co/guide/en/logstash/current/filter-plugins.html
   - Elasticsearch output: https://www.elastic.co/guide/en/logstash/current/plugins-outputs-elasticsearch.html
   - Install: https://www.elastic.co/downloads/logstash

4. **Elasticsearch Python Client**
   - Official client: https://elasticsearch-py.readthedocs.io/
   - Geospatial query examples: https://elasticsearch-py.readthedocs.io/en/latest/api.html
   - Install: `pip install elasticsearch`

**Useful Elastic Tools:**

5. **Elastic Maps Service (EMS)**
   - Basemap layers for Kibana Maps
   - Documentation: https://www.elastic.co/elastic-maps-service

6. **Machine Learning Features**
   - Anomaly detection: https://www.elastic.co/guide/en/machine-learning/current/ml-ad-overview.html
   - Data frame analytics: https://www.elastic.co/guide/en/machine-learning/current/ml-dfa-overview.html

7. **Dev Tools Console (in Kibana)**
   - Test queries directly: http://localhost:5601/app/dev_tools#/console
   - Essential for debugging Elasticsearch queries

**Sample Data Sources:**

8. **Weather APIs**
   - OpenWeatherMap API: https://openweathermap.org/api
   - Weather.gov API: https://www.weather.gov/documentation/services-web-api
   - NOAA API: https://www.ncdc.noaa.gov/cdo-web/webservices/v2

9. **Geospatial Test Data**
   - Natural Earth Data: https://www.naturalearthdata.com/
   - OpenStreetMap: https://www.openstreetmap.org/
   - Sample flood boundaries (GeoJSON): https://github.com/openwaterfoundation/owf-data-us-flood-zones

**Execution Plan for Tomorrow**

**Tonight (3-4 hours preparation):**

**Phase 1: Environment Setup (60 minutes)**
- Install Elasticsearch, Kibana, and Logstash locally using Docker Compose for faster setup
- Create `docker-compose.yml` with all Elastic Stack services
- Verify all services are running: Elasticsearch (localhost:9200), Kibana (localhost:5601)
- Install Python dependencies: `pip install elasticsearch fastapi uvicorn pymongo python-multipart`
- Initialize Next.js project: `npx create-next-app@latest flood-warning-frontend`
- Set up MongoDB locally or use MongoDB Atlas free tier

**Phase 2: Elasticsearch Configuration (45 minutes)**
- Create index template for flood sensor data with geospatial mappings:
  ```json
  {
    "mappings": {
      "properties": {
        "location": { "type": "geo_point" },
        "flood_boundary": { "type": "geo_shape" },
        "water_level": { "type": "float" },
        "timestamp": { "type": "date" },
        "risk_level": { "type": "keyword" }
      }
    }
  }
  ```
- Test geo_point and geo_shape queries in Dev Tools Console
- Create sample flood boundary polygons (GeoJSON format) for Queensland, Sumatra, Hat Yai
- Index 20-30 sample documents with realistic coordinates

**Phase 3: Data Pipeline Prototype (45 minutes)**
- Create Logstash configuration file for ingesting weather API data:
  - Input: HTTP poller for weather API
  - Filter: Parse JSON, extract coordinates, enrich with geoip
  - Output: Elasticsearch index
- Test pipeline with OpenWeatherMap API (free tier)
- Verify data appears in Elasticsearch using Kibana Dev Tools

**Phase 4: Learn Key Geospatial Queries (30 minutes)**
- Practice these essential queries in Dev Tools:
  - `geo_bounding_box`: Find all sensors in a rectangular area
  - `geo_distance`: Find sensors within X km of a point
  - `geo_shape`: Check if a location intersects with flood polygons
- Save working query examples for tomorrow
- Document query syntax in a cheat sheet

**Phase 5: Kibana Visualization Setup (30 minutes)**
- Create a Maps visualization with:
  - Base layer (OpenStreetMap or EMS)
  - Document layer showing sensor locations (geo_point)
  - Polygon layer showing flood boundaries (geo_shape)
  - Heat map layer for risk concentration
- Add time slider for temporal analysis
- Save visualization to a dashboard
- Export dashboard configuration for quick recreation tomorrow

**Phase 6: API & Frontend Skeleton (30 minutes)**
- Create FastAPI endpoints:
  - `POST /check-location`: Accept lat/lon, return flood risk
  - `GET /flood-boundaries`: Return active flood polygons
  - `GET /evacuation-routes`: Calculate safe routes
- Implement basic Elasticsearch query in `/check-location` endpoint
- Create Next.js pages:
  - Home page with location input
  - Map view component (use Mapbox GL JS or Leaflet)
  - Alert display component
- Test API connectivity between frontend and backend

**Tomorrow Morning (Before Hackathon - 2 hours):**

**Phase 7: Integration Testing (45 minutes)**
- Connect FastAPI to Elasticsearch and MongoDB
- Test end-to-end flow: User enters location → API queries Elasticsearch → Returns risk assessment
- Verify Logstash is continuously ingesting data
- Check Kibana dashboard updates in real-time

**Phase 8: ML Model Preparation (45 minutes)**
- Create simple time-series prediction model using Elasticsearch ML or scikit-learn
- Train on historical water level data (use sample data if real data unavailable)
- Implement prediction endpoint in FastAPI that forecasts water levels 4-6 hours ahead
- Store predictions back into Elasticsearch with future timestamps

**Phase 9: Documentation & README (30 minutes)**
- Write comprehensive README.md with:
  - Project overview and problem statement
  - Architecture diagram (use draw.io or Mermaid)
  - Setup instructions (Docker commands, environment variables)
  - API endpoint documentation
  - Sample queries and responses
  - Demo script for presentation
  - Known limitations and future improvements
  - Team member responsibilities

**During Hackathon - Execution Strategy:**

**Hour 1-2: Core Infrastructure**
- Deploy Elastic Stack on cloud (Elastic Cloud trial or AWS)
- Configure production-ready indices with proper mappings
- Set up continuous data ingestion from at least 2 real data sources
- Verify data is flowing correctly

**Hour 3-4: Geospatial Intelligence**
- Implement all geospatial query endpoints
- Create flood boundary prediction algorithm
- Build evacuation route calculation (use Elasticsearch geo_distance aggregations)
- Test with real coordinates from Queensland, Sumatra, Hat Yai

**Hour 5-6: User Interface**
- Complete map-based frontend with real-time updates
- Implement location search and autocomplete
- Add alert notification system
- Create mobile-responsive design

**Hour 7-8: ML & Predictions**
- Integrate ML model for 4-6 hour predictions
- Display prediction confidence levels
- Show historical accuracy metrics
- Implement adaptive learning feedback loop

**Hour 9-10: Polish & Demo Prep**
- Create compelling Kibana dashboards for judges
- Prepare demo script showing:
  1. Real-time data ingestion
  2. Street-level flood prediction
  3. Personalized location query
  4. Evacuation route calculation
  5. ML prediction accuracy
- Record backup demo video
- Prepare 3-minute pitch emphasizing SDG impact

**Critical Success Factors:**
- Focus on demonstrating real-time geospatial queries (this is your differentiator)
- Show street-level precision vs. regional warnings
- Emphasize Elasticsearch's cost advantage over traditional GIS systems
- Have working demo with real coordinates from mentioned regions
- Prepare fallback plan if live APIs fail (use cached data)

**README.md Structure:**

```markdown
# Real-Time Flood Early Warning System

## Problem Statement
[Copy your problem statement]

## Solution Architecture
[Include architecture diagram showing data flow: Sources → Logstash → Elasticsearch → FastAPI → Next.js]

## Tech Stack
- Elasticsearch 8.x - Geospatial indexing and querying
- Kibana 8.x - Data visualization and monitoring
- Logstash 8.x - Real-time data ingestion
- FastAPI - Backend API
- Next.js - Frontend application
- MongoDB - User data and historical records

## Setup Instructions

### Prerequisites
- Docker & Docker Compose
- Python 3.9+
- Node.js 18+
- OpenWeatherMap API key

### Quick Start
1. Clone repository
2. Start Elastic Stack: `docker-compose up -d`
3. Install backend dependencies: `pip install -r requirements.txt`
4. Start FastAPI: `uvicorn main:app --reload`
5. Install frontend dependencies: `cd frontend && npm install`
6. Start Next.js: `npm run dev`

### Environment Variables
[List all required API keys and configuration]

## API Endpoints

### POST /check-location
Check flood risk for specific coordinates
**Request:** `{"latitude": -27.4698, "longitude": 153.0251}`
**Response:** `{"risk_level": "high", "predicted_flood_time": "2024-01-15T14:30:00Z", "evacuation_route": [...]}`

[Document all endpoints]

## Elasticsearch Index Mappings
[Include your geo_point and geo_shape mappings]

## Sample Queries
[Include 5-10 working Elasticsearch queries]

## Demo Script
1. Show real-time sensor data ingestion in Kibana
2. Query flood risk for specific address
3. Display predicted flood boundaries on map
4. Calculate evacuation route
5. Show ML prediction accuracy

## Future Improvements
- Integration with emergency services
- SMS/push notification system
- Multi-language support
- Offline mobile app

## Team
[List team members and roles]

## License
MIT
```

**Final Checklist for Tomorrow:**
- [ ] All Elastic Stack services running
- [ ] Sample data indexed with geospatial fields
- [ ] At least 3 working API endpoints
- [ ] Kibana dashboard with map visualization
- [ ] Frontend displays map with location search
- [ ] ML prediction model trained and integrated
- [ ] README.md complete with setup instructions
- [ ] Demo script practiced
- [ ] Backup demo video recorded
- [ ] Pitch deck ready (3 minutes max)