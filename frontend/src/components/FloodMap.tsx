"use client";

import dynamic from 'next/dynamic';
import { Boundary, RouteResponse, Prediction } from '@/lib/api';

const FloodMapClient = dynamic(() => import('./FloodMapClient'), {
  ssr: false,
  loading: () => (
    <div className="h-[500px] w-full rounded-xl flex items-center justify-center bg-gray-100 border border-gray-200">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  ),
});

interface FloodMapProps {
  center: [number, number];
  zoom?: number;
  boundaries?: Boundary[];
  route?: RouteResponse;
  predictions?: Prediction[];
  userLocation?: [number, number];
  riverDischargeData?: any;
}

export default function FloodMap(props: FloodMapProps) {
  return <FloodMapClient {...props} />;
}
