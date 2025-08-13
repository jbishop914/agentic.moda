'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Map, 
  Globe, 
  Layers, 
  Navigation, 
  Search, 
  Building, 
  TrendingUp,
  Truck,
  Users,
  Activity,
  Target,
  DollarSign,
  MapPin,
  Ruler,
  Maximize2,
  Eye,
  Settings,
  Play,
  Pause,
  FastForward,
  RotateCw,
  Home,
  Crosshair,
  AlertTriangle,
  BarChart3,
  TreePine,
  Mountain
} from 'lucide-react';

// Import ArcGIS components
import '@arcgis/map-components/components/arcgis-scene';
import '@arcgis/map-components/components/arcgis-map';
import '@arcgis/map-components/components/arcgis-legend';
import '@arcgis/map-components/components/arcgis-layer-list';
import '@arcgis/map-components/components/arcgis-weather';
import '@arcgis/map-components/components/arcgis-direct-line-measurement-3d';
import '@arcgis/map-components/components/arcgis-line-of-sight';
import '@arcgis/map-components/components/arcgis-slice';
import '@arcgis/map-components/components/arcgis-elevation-profile';
import '@arcgis/map-components/components/arcgis-feature-table';
import '@arcgis/map-components/components/arcgis-editor';

import esriConfig from '@arcgis/core/config';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Graphic from '@arcgis/core/Graphic';
import * as reactiveUtils from '@arcgis/core/core/reactiveUtils';

// Configure API key
esriConfig.apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY || '';

interface SimulationAgent {
  id: string;
  type: 'truck' | 'person' | 'emergency' | 'construction';
  position: [number, number];
  destination?: [number, number];
  speed: number;
  status: string;
  route?: any[];
}

interface DevelopmentProject {
  id: string;
  name: string;
  location: [number, number];
  type: 'residential' | 'commercial' | 'mixed';
  status: 'planned' | 'approved' | 'construction' | 'complete';
  value: number;
  area: number;
  units?: number;
  architect?: string;
}

export default function MapStudioPage() {
  const [activeMode, setActiveMode] = useState<'explore' | 'develop' | 'simulate' | 'analyze'>('explore');
  const [viewType, setViewType] = useState<'2d' | '3d'>('3d');
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [simulationRunning, setSimulationRunning] = useState(false);
  const [agents, setAgents] = useState<SimulationAgent[]>([]);
  const [projects, setProjects] = useState<DevelopmentProject[]>([]);
  const [analysis, setAnalysis] = useState<any>({});
  const mapRef = useRef<any>(null);
  const sceneRef = useRef<any>(null);
  const [currentTool, setCurrentTool] = useState<string>('');

  // Initialize map/scene when component mounts
  useEffect(() => {
    const el = (viewType === '3d' ? sceneRef : mapRef).current;
    if (!el) return;

    const onReady = () => {
      const view = el.view;
      if (!view) return;

      // Set up initial environment for 3D
      if (viewType === '3d') {
        view.environment.lighting.date = new Date();
        view.environment.lighting.directShadowsEnabled = true;
        view.environment.atmosphereEnabled = true;
      }

      // Add custom layers for projects and agents
      setupCustomLayers(view);
      
      // Set up event handlers
      setupEventHandlers(view);
    };

    el.addEventListener('arcgisViewReadyChange', onReady);
    return () => el.removeEventListener('arcgisViewReadyChange', onReady);
  }, [viewType]);

  const setupCustomLayers = (view: any) => {
    // Projects layer
    const projectsLayer = new GraphicsLayer({
      id: 'development-projects',
      title: 'Development Projects',
      elevationInfo: viewType === '3d' ? { mode: 'on-the-ground' } : undefined
    });

    // Simulation agents layer
    const agentsLayer = new GraphicsLayer({
      id: 'simulation-agents',
      title: 'Simulation Agents',
      elevationInfo: viewType === '3d' ? { mode: 'relative-to-ground' } : undefined
    });

    view.map.addMany([projectsLayer, agentsLayer]);
  };

  const setupEventHandlers = (view: any) => {
    // Click handler for location selection
    view.on('click', (event: any) => {
      if (activeMode === 'develop') {
        handleLocationClick(event);
      }
    });

    // Watch for view updates
    reactiveUtils.watch(
      () => view.stationary,
      (stationary) => {
        if (stationary) {
          updateVisibleAnalysis(view);
        }
      }
    );
  };

  const handleLocationClick = async (event: any) => {
    const { mapPoint } = event;
    setSelectedLocation({
      longitude: mapPoint.longitude,
      latitude: mapPoint.latitude,
      elevation: mapPoint.z || 0
    });

    // Analyze the location
    await analyzeLocation(mapPoint);
  };

  const analyzeLocation = async (point: any) => {
    // Simulate analysis (would actually call various ArcGIS services)
    const mockAnalysis = {
      zoning: 'Commercial Mixed-Use',
      landValue: Math.floor(Math.random() * 5000000) + 1000000,
      demographics: {
        population: Math.floor(Math.random() * 50000) + 10000,
        medianIncome: Math.floor(Math.random() * 100000) + 50000,
        growth: (Math.random() * 10 + 2).toFixed(1) + '%'
      },
      nearbyAmenities: [
        { type: 'School', distance: '0.3 mi', rating: 4.5 },
        { type: 'Hospital', distance: '1.2 mi', rating: 4.8 },
        { type: 'Shopping', distance: '0.5 mi', rating: 4.2 }
      ],
      transportAccess: {
        highway: '0.8 mi',
        publicTransit: '0.2 mi',
        airport: '12 mi'
      }
    };

    setAnalysis(mockAnalysis);
  };

  const startSimulation = () => {
    setSimulationRunning(true);
    
    // Create simulation agents
    const newAgents: SimulationAgent[] = [];
    for (let i = 0; i < 20; i++) {
      newAgents.push({
        id: `agent-${i}`,
        type: ['truck', 'person', 'emergency', 'construction'][Math.floor(Math.random() * 4)] as any,
        position: [
          -73.9 + (Math.random() - 0.5) * 0.2,
          40.7 + (Math.random() - 0.5) * 0.2
        ],
        speed: Math.random() * 60 + 20,
        status: 'active'
      });
    }
    setAgents(newAgents);

    // Run simulation loop
    const interval = setInterval(() => {
      updateSimulation();
    }, 1000);

    // Stop after 60 seconds
    setTimeout(() => {
      clearInterval(interval);
      setSimulationRunning(false);
    }, 60000);
  };

  const updateSimulation = () => {
    setAgents(prev => prev.map(agent => ({
      ...agent,
      position: [
        agent.position[0] + (Math.random() - 0.5) * 0.001,
        agent.position[1] + (Math.random() - 0.5) * 0.001
      ]
    })));
  };

  const updateVisibleAnalysis = (view: any) => {
    // Update analysis based on visible extent
    console.log('Updating analysis for extent:', view.extent);
  };

  const modes = {
    explore: {
      name: 'Explore & Scout',
      icon: <Search className="w-4 h-4" />,
      description: 'Find opportunities worldwide',
      tools: ['Property Search', 'Market Analysis', 'Vacant Land', 'Investment Score'],
      color: 'emerald'
    },
    develop: {
      name: 'Site Development',
      icon: <Building className="w-4 h-4" />,
      description: 'Plan and design on real terrain',
      tools: ['Site Planning', 'Topography', '3D Modeling', 'Zoning'],
      color: 'blue'
    },
    simulate: {
      name: 'Simulate & Test',
      icon: <Activity className="w-4 h-4" />,
      description: 'Run real-world simulations',
      tools: ['Traffic Flow', 'Logistics', 'Emergency', 'Events'],
      color: 'purple'
    },
    analyze: {
      name: 'Market Analysis',
      icon: <TrendingUp className="w-4 h-4" />,
      description: 'Deep market intelligence',
      tools: ['Demographics', 'Competition', 'Growth', 'Risk'],
      color: 'orange'
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#0f1214]">
      {/* Header */}
      <div className="bg-[#1a1d20] border-b border-slate-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-slate-300">Map Studio</span>
            </div>
            
            {/* Mode Selector */}
            <div className="flex gap-1 bg-[#0f1214] p-1 rounded-lg">
              {Object.entries(modes).map(([key, mode]) => (
                <button
                  key={key}
                  onClick={() => setActiveMode(key as any)}
                  className={`px-3 py-1.5 rounded-md text-xs transition-all flex items-center gap-2 ${
                    activeMode === key
                      ? `bg-${mode.color}-600/20 text-${mode.color}-400 border border-${mode.color}-600/30`
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {mode.icon}
                  <span>{mode.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('2d')}
              className={`px-3 py-1.5 rounded-md text-xs ${
                viewType === '2d' ? 'bg-slate-700 text-slate-200' : 'text-slate-500'
              }`}
            >
              2D Map
            </button>
            <button
              onClick={() => setViewType('3d')}
              className={`px-3 py-1.5 rounded-md text-xs ${
                viewType === '3d' ? 'bg-slate-700 text-slate-200' : 'text-slate-500'
              }`}
            >
              3D Scene
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        <div className="w-80 bg-[#1a1d20] border-r border-slate-800 overflow-y-auto">
          <div className="p-4 space-y-4">
            {/* Mode Info */}
            <div className="bg-[#0f1214] rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                {modes[activeMode].icon}
                <h3 className="text-sm font-medium text-slate-200">
                  {modes[activeMode].name}
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                {modes[activeMode].description}
              </p>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase text-slate-600">Tools</h4>
              {modes[activeMode].tools.map(tool => (
                <button
                  key={tool}
                  onClick={() => setCurrentTool(tool)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all ${
                    currentTool === tool
                      ? 'bg-slate-700 text-slate-200'
                      : 'text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {tool}
                </button>
              ))}
            </div>

            {/* Mode-specific panels */}
            {activeMode === 'develop' && selectedLocation && (
              <div className="bg-[#0f1214] rounded-lg p-4 space-y-3">
                <h4 className="text-xs uppercase text-slate-600">Location Analysis</h4>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Coordinates</span>
                    <span className="text-slate-300">
                      {selectedLocation.latitude.toFixed(4)}, {selectedLocation.longitude.toFixed(4)}
                    </span>
                  </div>
                  
                  {analysis.zoning && (
                    <>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Zoning</span>
                        <span className="text-slate-300">{analysis.zoning}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Land Value</span>
                        <span className="text-emerald-400">
                          ${(analysis.landValue / 1000000).toFixed(1)}M
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {analysis.demographics && (
                  <div className="pt-3 border-t border-slate-800">
                    <h5 className="text-xs text-slate-600 mb-2">Demographics</h5>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Population</span>
                        <span className="text-slate-300">
                          {analysis.demographics.population.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Median Income</span>
                        <span className="text-slate-300">
                          ${analysis.demographics.medianIncome.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Growth Rate</span>
                        <span className="text-emerald-400">
                          {analysis.demographics.growth}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <button className="w-full mt-3 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs rounded-lg transition-all">
                  Start Development Plan
                </button>
              </div>
            )}

            {activeMode === 'simulate' && (
              <div className="bg-[#0f1214] rounded-lg p-4">
                <h4 className="text-xs uppercase text-slate-600 mb-3">Simulation Control</h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-slate-500">Agent Count</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="range"
                        min="10"
                        max="100"
                        value={agents.length || 20}
                        onChange={(e) => {
                          // Update agent count
                        }}
                        className="flex-1"
                      />
                      <span className="text-xs text-slate-300 w-8">
                        {agents.length || 20}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-500">Simulation Type</label>
                    <select className="w-full mt-1 px-2 py-1 bg-slate-800 text-xs text-slate-300 rounded">
                      <option>Traffic Flow</option>
                      <option>Emergency Response</option>
                      <option>Construction Logistics</option>
                      <option>Event Crowd</option>
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={startSimulation}
                      disabled={simulationRunning}
                      className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 text-white text-xs rounded-lg transition-all flex items-center justify-center gap-2"
                    >
                      {simulationRunning ? (
                        <>
                          <Pause className="w-3 h-3" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="w-3 h-3" />
                          Start
                        </>
                      )}
                    </button>
                    <button className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg">
                      <RotateCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {simulationRunning && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-slate-500">Status</span>
                      <span className="text-emerald-400">Running</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Active Agents</span>
                      <span className="text-slate-300">{agents.length}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative">
          {viewType === '2d' ? (
            <arcgis-map
              ref={mapRef}
              basemap="arcgis/topographic"
              center="-73.9,40.7"
              zoom="12"
              style={{ height: '100%', width: '100%' }}
            >
              <arcgis-legend position="bottom-right" />
              <arcgis-layer-list position="top-right" />
            </arcgis-map>
          ) : (
            <arcgis-scene
              ref={sceneRef}
              basemap="arcgis/imagery-standard"
              center="-73.9,40.7"
              zoom="12"
              style={{ height: '100%', width: '100%' }}
            >
              <arcgis-legend position="bottom-right" />
              <arcgis-layer-list position="top-right" />
              <arcgis-weather position="bottom-left" />
              {currentTool === 'Site Planning' && (
                <>
                  <arcgis-direct-line-measurement-3d position="top-left" />
                  <arcgis-elevation-profile position="bottom-left" />
                </>
              )}
              {currentTool === '3D Modeling' && (
                <arcgis-slice position="top-left" />
              )}
              {activeMode === 'simulate' && (
                <arcgis-line-of-sight position="top-left" />
              )}
            </arcgis-scene>
          )}

          {/* Quick Stats Overlay */}
          {activeMode === 'analyze' && (
            <div className="absolute top-4 left-4 bg-[#1a1d20]/90 backdrop-blur rounded-lg p-4 space-y-3">
              <h4 className="text-xs uppercase text-slate-600">Market Overview</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-light text-emerald-400">$4.2M</div>
                  <div className="text-xs text-slate-500">Avg Property Value</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-blue-400">12%</div>
                  <div className="text-xs text-slate-500">YoY Growth</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-purple-400">847</div>
                  <div className="text-xs text-slate-500">Active Listings</div>
                </div>
                <div>
                  <div className="text-2xl font-light text-orange-400">23</div>
                  <div className="text-xs text-slate-500">Days on Market</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}