'use client';

import dynamic from 'next/dynamic';
import { Globe } from 'lucide-react';

// Dynamically import ArcGIS components to avoid SSR issues
const MapStudioContent = dynamic(
  () => import('./MapStudioContent'),
  { 
    ssr: false,
    loading: () => (
      <div className="h-screen flex items-center justify-center bg-[#0f1214]">
        <div className="text-center">
          <Globe className="w-12 h-12 text-slate-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Loading 3D Map...</p>
        </div>
      </div>
    )
  }
);

export default function MapStudioPage() {
  return <MapStudioContent />;
}