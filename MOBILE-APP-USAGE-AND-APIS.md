# Backend APIs & Mobile App — Usage and Claude Bot

## Currently available backend APIs

All endpoints are under base URL `http://localhost:8000` (or your deployed API URL). Mobile uses the same base; set it in **Settings** in the app.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | System health: Elasticsearch + MongoDB. Returns 200 with `status`, `elasticsearch`, `mongodb` (nested objects). Returns **503** if any service is down. |
| POST | `/location/check-location` | Body: `{ "latitude", "longitude", "radius_km"? }`. Returns risk level, nearest sensor, water level, active boundaries, message. |
| GET | `/boundaries/flood-boundaries` | Query: `active_only?`, `country?`. Returns list of flood boundary polygons (GeoJSON) for map overlay. |
| GET | `/predictions/predictions` | Query: `hours_ahead?`, `lat?`, `lon?`, `radius_km?`. Returns predictions for next N hours. |
| GET | `/evacuation/evacuation-routes` | Query: `lat`, `lon`. Returns origin, waypoints, distance_km, estimated_minutes. |
| POST | `/assistant/ask` | **Claude bot (Amazon Bedrock or Anthropic).** Body: `{ "message": "...", "latitude"? , "longitude"? }`. Optional lat/lon: assistant uses your current risk as context. Returns `{ "reply": "..." }`. |
| GET | `/` | Service info and list of endpoints. |

**OpenAPI docs:** `http://localhost:8000/docs` and `http://localhost:8000/redoc`.

---

## Mobile app structure (current)

- **Stack:** Expo (SDK 54), expo-router (file-based tabs), React Native, react-native-maps.
- **Tabs:** Map, Check Risk, Predictions, **Assistant**, Settings.
- **Config:** `mobile/config/api.ts` — `DEFAULT_API_BASE_URL`, `API_ENDPOINTS`.
- **API client:** `mobile/services/api.ts` — `getHealth`, `checkLocation`, `getFloodBoundaries`, `getPredictions`, `getEvacuationRoutes`, **`askAssistant`**.
- **Types:** `mobile/types/api.ts` — matches backend Pydantic schemas + `AssistantAskRequest`, `AssistantAskResponse`.

---

## Claude assistant (implementation summary)

**Backend**

- **Providers:** **Amazon Bedrock** (default) or **Anthropic**. Set `ASSISTANT_PROVIDER=bedrock` and `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_REGION` for Bedrock; or `ASSISTANT_PROVIDER=anthropic` and `ANTHROPIC_API_KEY` for direct Anthropic.
- **Bedrock:** Enable the Claude model in **AWS Console → Bedrock → Model access** for your region. Optional: `ASSISTANT_BEDROCK_MODEL_ID` (default `anthropic.claude-3-5-haiku-20241022-v1:0`).
- **Service:** `backend/app/services/assistant.py` — builds system prompt (normal vs critical mode), context block from risk/sensor/boundaries; calls Bedrock `invoke_model` or Anthropic API.
- **Router:** `backend/app/routers/assistant.py` — `POST /assistant/ask`. If `latitude`/`longitude` are provided, runs same logic as check-location to build context, then calls Claude.
- **Critical mode:** When `risk_level` is high/critical and user is in an active flood zone, the system prompt switches to short, urgent, numbered steps.

**Mobile**

- **Tab:** Assistant tab (chat icon). Text input, “Include my location” toggle, “Ask assistant” button. Reply shown below.
- **API:** `askAssistant({ message, latitude?, longitude? })` in `services/api.ts`; endpoint in `config/api.ts`.

**Possible errors**

- **“Assistant is not configured”** — For Bedrock: set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, and `AWS_REGION` in backend `.env`. For Anthropic: set `ANTHROPIC_API_KEY`. Restart the server.
- **“Bedrock is not available”** — Enable the Claude model in Bedrock → Model access for your region; confirm credentials and region.
- **“Assistant requires the boto3 package”** — Run `pip install boto3` in the backend and restart (Bedrock). For Anthropic: `pip install anthropic`.
- **Network error on mobile** — Ensure device/emulator can reach the API base URL (use your machine IP and port 8000 if on a real device; allow CORS for that origin in backend if needed).

---

## Step-by-step: using the mobile app

### 1. Set up backend and Elastic Stack

1. Start Elasticsearch, Kibana, Logstash, MongoDB: from project root run `docker-compose up -d`.
2. In Kibana Dev Tools, apply index templates and seed data from `elasticsearch/index-templates.ndjson` and `elasticsearch/seed-data.ndjson`.
3. Copy `.env.example` to `.env` and set at least: `ELASTIC_PASSWORD`, `OPENWEATHERMAP_API_KEY`. For the assistant: **Bedrock** — set `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` (and enable the model in Bedrock → Model access); or **Anthropic** — set `ANTHROPIC_API_KEY` and `ASSISTANT_PROVIDER=anthropic`.
4. From `backend`: `pip install -r requirements.txt`, then `uvicorn main:app --reload --port 8000`. Confirm `http://localhost:8000/docs` loads.

### 2. Set up and run the mobile app

1. From project root: `cd mobile`, then `npm install`.
2. **API URL:** On a **physical device**, the app must talk to your computer’s IP (e.g. `http://192.168.1.10:8000`). On **emulator**, `http://localhost:8000` or Android `http://10.0.2.2:8000` often works. Set this in the app under **Settings** (stored in AsyncStorage).
3. Start the app: `npx expo start` (or `npm start`). Use “Run on Android/iOS” or scan QR with Expo Go; for web use “Run in web browser”.

### 3. Using the app (step by step)

1. **Settings (first time)**  
   Open the **Settings** tab. Enter the backend base URL (e.g. `http://<your-ip>:8000`). Save. This is used for all API calls.

2. **Health**  
   The app may show backend status on load or in Settings. If health fails (503 or network error), check that the backend is running and the URL is correct.

3. **Map**  
   Open the **Map** tab. You see flood boundaries and sensors (if data is loaded). Use quick-go buttons if implemented (Queensland, Sumatra, Hat Yai).

4. **Check Risk**  
   Open **Check Risk**. Either tap **“Use my location”** (grants location permission and sends your GPS to `POST /location/check-location`) or enter **latitude/longitude** and tap **“Check this point”**. Risk level, nearest sensor, water level, and active boundaries appear. Tap **“Get evacuation route”** to load waypoints from `GET /evacuation/evacuation-routes`.

5. **Predictions**  
   Open **Predictions**. The list loads from `GET /predictions/predictions` (default 6 hours ahead). Pull to refresh.

6. **Assistant (Claude bot)**  
   Open the **Assistant** tab. Type a question (e.g. “What should I do? I’m in a flood zone.”). Leave **“Include my location”** on to send your GPS so the assistant can use your current risk. Tap **“Ask assistant”**. The reply appears below. In critical situations (high/critical risk + in flood zone), the assistant replies with short, urgent steps.

7. **Settings**  
   Change API base URL anytime. Other options (if present) can be configured here.

---

## Possible upgrades and fixes

| Area | Current | Possible upgrade |
|------|---------|------------------|
| **Health response type (mobile)** | `HealthResponse` types `elasticsearch` and `mongodb` as `string` | Backend returns nested objects. Use `elasticsearch: object; mongodb: object` or a more specific type so TypeScript matches. |
| **Health on 503** | Backend returns 503 with body | Mobile `getHealth()` throws on `!res.ok`. Consider parsing 503 body and showing “Backend degraded” instead of generic error. |
| **Assistant critical UI** | Same Assistant screen for all risk levels | When risk is high/critical, auto-open Assistant tab or show a full-screen “Emergency assistant” with a pre-filled “What do I do now?” and critical-mode styling. |
| **CORS** | Backend `cors_origins` from env (e.g. localhost:3000, 8081) | For physical device, add your machine IP (e.g. `http://192.168.1.10:8081` for Expo) to `CORS_ORIGINS` so the app can call the API. |
| **ANTHROPIC_API_KEY** | Read from `.env` | Ensure `.env` is in `.gitignore` and never committed. Use a secrets manager in production. |

---

## Quick checklist before demo

- [ ] Backend running on port 8000; `/docs` shows all endpoints including `POST /assistant/ask`.
- [ ] Assistant: **Bedrock** — `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION` set; model enabled in Bedrock → Model access. **Or** **Anthropic** — `ANTHROPIC_API_KEY` and `ASSISTANT_PROVIDER=anthropic`.
- [ ] Elasticsearch has seed data (sensors, boundaries, predictions).
- [ ] Mobile API base URL set in Settings to the correct host (IP or localhost/10.0.2.2 for emulator).
- [ ] Map shows boundaries; Check Risk returns a result; Assistant returns a reply when message is sent (with or without location).
