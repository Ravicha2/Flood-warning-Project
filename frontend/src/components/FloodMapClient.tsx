"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

import { Boundary, RouteResponse, Prediction } from '@/lib/api';

// Fix Leaflet marker icons in React
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// A component to change map center
function MapUpdater({ center, zoom }: { center: [number, number]; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom || map.getZoom());
  }, [center, zoom, map]);
  return null;
}

interface FloodMapClientProps {
  center: [number, number];
  zoom?: number;
  boundaries?: Boundary[];
  route?: RouteResponse;
  predictions?: Prediction[];
  userLocation?: [number, number];
}

export default function FloodMapClient({
  center,
  zoom = 10,
  boundaries = [],
  route,
  predictions = [],
  userLocation,
}: FloodMapClientProps) {
  return (
    <div className="h-[500px] w-full rounded-xl overflow-hidden shadow-md border border-gray-200 z-0 relative">
      <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.elastic.co/elastic-maps-service">Elastic Maps Service</a>'
          url="https://tiles.maps.elastic.co/v2/default/{z}/{x}/{y}.png?elastic_tile_service_tos=agree&my_app_name=flood-warning"
        />
        <MapUpdater center={center} zoom={zoom} />

        {userLocation && (
          <Marker position={userLocation}>
            <Popup>Your Location</Popup>
          </Marker>
        )}

        {boundaries.map((b) => {
          // Geometry is typically GeoJSON polygon: { type: "Polygon", coordinates: [[[lon, lat], ...]] }
          const isPolygon = b.geometry?.type === 'Polygon';
          const isMultiPolygon = b.geometry?.type === 'MultiPolygon';
          
          let latlngs: any[] = [];
          if (isPolygon && b.geometry.coordinates?.length) {
            latlngs = b.geometry.coordinates[0].map((coord: number[]) => [coord[1], coord[0]]);
          } else if (isMultiPolygon && b.geometry.coordinates?.length) {
             latlngs = b.geometry.coordinates.map((poly: any[]) => poly[0].map((coord: number[]) => [coord[1], coord[0]]));
          }

          if (latlngs.length === 0) return null;

          const color = b.risk_level === 'high' || b.risk_level === 'critical' ? 'red' : b.risk_level === 'medium' ? 'orange' : 'green';

          return (
            <Polygon key={b.boundary_id} positions={latlngs} pathOptions={{ color, fillColor: color, fillOpacity: 0.3 }}>
              <Popup>
                <strong>{b.region_name}</strong><br/>
                Level: {b.risk_level} ({b.severity})
              </Popup>
            </Polygon>
          );
        })}

        {route && route.waypoints.length > 0 && (
          <Polyline 
            positions={route.waypoints.map(w => [w.lat, w.lon])} 
            pathOptions={{ color: 'blue', weight: 4, dashArray: '5, 10' }} 
          />
        )}

        {predictions.map((p) => {
          const color = p.predicted_risk_level === 'high' || p.predicted_risk_level === 'critical' ? 'red' : p.predicted_risk_level === 'medium' ? 'orange' : 'green';
          
          const icon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          });

          return (
            <Marker key={p.prediction_id} position={[p.latitude, p.longitude]} icon={icon}>
              <Popup>
                <strong>Sensor: {p.sensor_id}</strong><br/>
                Risk: {p.predicted_risk_level}<br/>
                Water Level: {p.predicted_water_level}m
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
