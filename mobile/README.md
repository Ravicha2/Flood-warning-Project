# Flood Warning — Mobile App

React Native (Expo) mobile application for the Flood Early Warning System. It consumes all data via the FastAPI backend; the app never talks to Elasticsearch directly.

## Features

- **Map**: Flood boundaries (polygons from `GET /boundaries/flood-boundaries`), prediction points, user location. Quick-go-to regions: **Queensland**, **Sumatra**, **Hat Yai**. Long-press to check risk at a point.
- **Check Risk**: Use device location or enter lat/lon; calls `POST /location/check-location`. Shows risk level, nearest sensor, water level, active boundaries, and “Get evacuation route” (calls `GET /evacuation/evacuation-routes`).
- **Predictions**: List from `GET /predictions/predictions` (next 6 hours); pull-to-refresh.
- **Settings**: Configurable API base URL (e.g. `http://<your-machine-ip>:8000` for device on same network). Health check status and refresh.
- **Health banner**: On load and when API URL changes, the app calls `GET /health` and shows “System operational” or “Backend unavailable”.

## Requirements

- Node.js 18+
- npm or yarn
- Expo CLI (optional; `npx expo` is enough)
- iOS Simulator / Xcode (macOS) or Android Studio / emulator for running the app

## Setup

```bash
cd mobile
npm install
```

## Running

```bash
npm start
```

Then press `i` for iOS simulator or `a` for Android emulator, or scan the QR code with Expo Go on a physical device.

### iOS: “Problem running the requested app”

The app uses **react-native-maps**, which is not included in **Expo Go**. So:

- **In Expo Go** (e.g. pressing `i` or scanning the QR code): The app runs, but the **Map** tab shows a message that the full map needs a development build. The **Risk**, **Predictions**, and **Settings** tabs work as usual.
- **Full map on iOS**: Use a development build so the native map is available:
  ```bash
  npx expo prebuild
  npx expo run:ios
  ```
  This generates the native `ios/` project (requires Xcode and CocoaPods) and runs the app with the interactive map, boundaries, and region chips.

### iOS: `SDK "iphoneos" cannot be located` / `C compiler cannot create executables`

This means the **full Xcode app** (with the iOS SDK) is missing or not selected. The Command Line Tools alone are not enough for `pod install`.

1. **Install Xcode** from the App Store (Xcode, not just “Command Line Tools”). Wait for it to finish installing.
2. **Open Xcode once**, accept the license, and let it install any extra components.
3. **Point the active developer directory to Xcode:**
   ```bash
   sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
   ```
4. **Confirm the iOS SDK is found:**
   ```bash
   xcrun --sdk iphoneos --show-sdk-path
   ```
   You should see a path like `/Applications/Xcode.app/Contents/Developer/Platforms/iPhoneOS.platform/Developer/SDKs/iPhoneOS.sdk`.
5. **Clean and reinstall pods**, then run the app:
   ```bash
   cd mobile/ios
   rm -rf Pods Podfile.lock build
   pod install --repo-update
   cd ..
   npx expo run:ios
   ```

### API base URL

- **Emulator**: Default is `http://localhost:8000`. On Android emulator use `http://10.0.2.2:8000` if the backend runs on the host.
- **Physical device**: In **Settings**, set the API base URL to `http://<your-machine-ip>:8000` (machine and phone must be on the same network). Example: `http://192.168.1.10:8000`.

Ensure the FastAPI backend has CORS enabled for the app (e.g. `allow_origins=["*"]` in dev).

## Backend endpoints used

| App feature           | Method + path                         |
|-----------------------|----------------------------------------|
| Health banner         | `GET /health`                          |
| Check my risk         | `POST /location/check-location`        |
| Map boundaries        | `GET /boundaries/flood-boundaries`     |
| Predictions list      | `GET /predictions/predictions`         |
| Evacuation route      | `GET /evacuation/evacuation-routes`    |

If your backend mounts the health router with prefix `/health` and route `/health`, the full path is `GET /health/health`; either expose `GET /health` at the root or set the app’s base URL to include the path (e.g. `http://host:8000` and add a redirect from `/health` to `/health/health` if needed).

## Preset map regions

Same coordinates as in the implementation plan (and Kibana Maps):

| Region     | Center (lat, lon)      | Notes        |
|-----------|------------------------|-------------|
| Queensland| -27.4698, 153.0251     | Brisbane area|
| Sumatra   | -0.7893, 113.9213      | Central Sumatra |
| Hat Yai   | 7.0086, 100.4747       | Hat Yai city |

## Project structure

```
mobile/
├── app/
│   ├── _layout.tsx          # Root layout, health banner, safe area
│   ├── index.tsx            # Redirect to /(tabs)
│   └── (tabs)/
│       ├── _layout.tsx     # Bottom tabs
│       ├── index.tsx       # Map screen
│       ├── check-risk.tsx  # Check risk + evacuation
│       ├── predictions.tsx # Predictions list
│       └── settings.tsx    # API URL, health status
├── components/
│   └── HealthBanner.tsx
├── config/
│   └── api.ts              # Endpoints, default base URL
├── constants/
│   ├── Regions.ts          # Queensland, Sumatra, Hat Yai presets
│   └── Theme.ts            # Colors, risk level colors
├── context/
│   └── AppContext.tsx      # API URL, health status
├── services/
│   └── api.ts              # API client (health, check-location, boundaries, predictions, evacuation)
├── types/
│   └── api.ts              # Types matching backend schemas
├── assets/
│   ├── icon.png
│   └── adaptive-icon.png
├── app.json
├── package.json
├── tsconfig.json
└── README.md
```

## Dependencies

- **expo** / **expo-router** — App and file-based routing
- **react-native-maps** — Map, polygons, circles (boundaries and predictions)
- **expo-location** — Device location for “Check my risk” and map
- **@react-navigation/native**, **@react-navigation/bottom-tabs** — Tab navigation (used by expo-router)
- **@react-native-async-storage/async-storage** — Persist API base URL

## Cross-platform

Tested for iOS and Android. Location and map permissions are requested at runtime; config and styling are shared. Platform-specific tweaks (e.g. Android emulator base URL) are documented above.
