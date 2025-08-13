// Quick test page to verify ArcGIS API key setup
'use client';

import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertCircle, Globe } from 'lucide-react';

export default function TestArcGISPage() {
  const [status, setStatus] = useState<'checking' | 'success' | 'error' | 'warning'>('checking');
  const [message, setMessage] = useState('Checking ArcGIS configuration...');
  const [details, setDetails] = useState<any>({});

  useEffect(() => {
    const checkConfiguration = async () => {
      const checks: any = {
        apiKey: false,
        basemap: false,
        elevation: false,
        geocoding: false
      };

      // Check if API key is set
      const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
      if (apiKey) {
        checks.apiKey = true;
        setMessage('API key found');
        
        // Test basemap access
        try {
          const response = await fetch(
            `https://basemaps-api.arcgis.com/arcgis/rest/services/styles/arcgis/navigation?token=${apiKey}`
          );
          if (response.ok) {
            checks.basemap = true;
          }
        } catch (e) {
          console.error('Basemap check failed:', e);
        }

        // Test elevation access
        try {
          const response = await fetch(
            `https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain/ImageServer?f=json&token=${apiKey}`
          );
          if (response.ok) {
            checks.elevation = true;
          }
        } catch (e) {
          console.error('Elevation check failed:', e);
        }

        setDetails(checks);

        if (checks.basemap && checks.elevation) {
          setStatus('success');
          setMessage('ArcGIS is fully configured!');
        } else if (checks.basemap || checks.elevation) {
          setStatus('warning');
          setMessage('ArcGIS is partially configured');
        } else {
          setStatus('error');
          setMessage('API key may not have required privileges');
        }
      } else {
        setStatus('error');
        setMessage('No API key found in environment variables');
        setDetails({ 
          apiKey: false,
          envVar: 'NEXT_PUBLIC_ARCGIS_API_KEY not set'
        });
      }
    };

    checkConfiguration();
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1214] flex items-center justify-center p-8">
      <div className="max-w-2xl w-full bg-[#1a1d20] rounded-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <Globe className="w-8 h-8 text-slate-400" />
          <h1 className="text-2xl font-medium text-slate-200">ArcGIS Configuration Test</h1>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            {status === 'checking' && <AlertCircle className="w-6 h-6 text-slate-400 animate-pulse" />}
            {status === 'success' && <CheckCircle className="w-6 h-6 text-emerald-400" />}
            {status === 'warning' && <AlertCircle className="w-6 h-6 text-amber-400" />}
            {status === 'error' && <XCircle className="w-6 h-6 text-red-400" />}
            
            <span className={`text-lg ${
              status === 'success' ? 'text-emerald-400' :
              status === 'warning' ? 'text-amber-400' :
              status === 'error' ? 'text-red-400' :
              'text-slate-400'
            }`}>
              {message}
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 px-3 bg-[#0f1214] rounded">
              <span className="text-sm text-slate-400">API Key</span>
              <span className="text-sm">
                {details.apiKey ? (
                  <span className="text-emerald-400">✓ Set</span>
                ) : (
                  <span className="text-red-400">✗ Not found</span>
                )}
              </span>
            </div>

            {details.apiKey && (
              <>
                <div className="flex items-center justify-between py-2 px-3 bg-[#0f1214] rounded">
                  <span className="text-sm text-slate-400">Basemap Access</span>
                  <span className="text-sm">
                    {details.basemap ? (
                      <span className="text-emerald-400">✓ Working</span>
                    ) : (
                      <span className="text-amber-400">⚠ Check privileges</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2 px-3 bg-[#0f1214] rounded">
                  <span className="text-sm text-slate-400">Elevation Access</span>
                  <span className="text-sm">
                    {details.elevation ? (
                      <span className="text-emerald-400">✓ Working</span>
                    ) : (
                      <span className="text-amber-400">⚠ Check privileges</span>
                    )}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="border-t border-slate-800 pt-6">
          <h2 className="text-sm font-medium text-slate-300 mb-3">Setup Instructions:</h2>
          <ol className="space-y-2 text-sm text-slate-500">
            <li>1. Create an ArcGIS developer account at <a href="https://developers.arcgis.com" target="_blank" className="text-blue-400 hover:underline">developers.arcgis.com</a></li>
            <li>2. Generate an API key in your dashboard</li>
            <li>3. Add to your <code className="text-xs bg-slate-800 px-1 py-0.5 rounded">.env.local</code> file:</li>
            <li className="pl-4">
              <code className="text-xs bg-slate-800 px-2 py-1 rounded block">
                NEXT_PUBLIC_ARCGIS_API_KEY=your_key_here
              </code>
            </li>
            <li>4. Configure API key privileges:
              <ul className="mt-1 ml-4 space-y-1">
                <li>• Basemap styles</li>
                <li>• Elevation (3D)</li>
                <li>• Geocoding (optional)</li>
                <li>• Routing (optional)</li>
              </ul>
            </li>
            <li>5. Set allowed referrers:
              <ul className="mt-1 ml-4 space-y-1">
                <li>• http://localhost:3000</li>
                <li>• https://*.vercel.app</li>
                <li>• Your production domain</li>
              </ul>
            </li>
          </ol>
        </div>

        <div className="mt-6 flex gap-3">
          <a 
            href="/map" 
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm rounded transition-all"
          >
            Go to Map Studio
          </a>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded transition-all"
          >
            Retry Check
          </button>
        </div>
      </div>
    </div>
  );
}