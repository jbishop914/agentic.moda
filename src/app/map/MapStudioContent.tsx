'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Mountain,
  Sliders,
  Compass,
  Save,
  Bot,
  Briefcase,
  ChevronLeft,
  Plus,
  Database
} from 'lucide-react';
import LayersManager from '@/components/LayersManager';

// Only import ArcGIS on client side
if (typeof window !== 'undefined') {
  // Import ArcGIS components - Scene components for 3D
  require('@arcgis/map-components/components/arcgis-scene');  // 3D Scene container
  require('@arcgis/map-components/components/arcgis-map');    // 2D Map container (optional)
  require('@arcgis/map-components/components/arcgis-legend');
  require('@arcgis/map-components/components/arcgis-layer-list');
  require('@arcgis/map-components/components/arcgis-weather');
  require('@arcgis/map-components/components/arcgis-direct-line-measurement-3d');
  require('@arcgis/map-components/components/arcgis-line-of-sight');
  require('@arcgis/map-components/components/arcgis-slice');
  require('@arcgis/map-components/components/arcgis-elevation-profile');
  require('@arcgis/map-components/components/arcgis-feature-table');
  require('@arcgis/map-components/components/arcgis-editor');
  require('@arcgis/map-components/components/arcgis-daylight');  // Sun/shadow control
  require('@arcgis/map-components/components/arcgis-shadow-cast'); // Shadow analysis
}

// Lazy load core API modules
let esriConfig: any;
let WebScene: any;
let SceneView: any;
let SceneLayer: any;
let BuildingSceneLayer: any;
let IntegratedMeshLayer: any;
let FeatureLayer: any;
let GraphicsLayer: any;
let ElevationLayer: any;
let Graphic: any;
let reactiveUtils: any;

if (typeof window !== 'undefined') {
  import('@arcgis/core/config').then(module => esriConfig = module.default);
  import('@arcgis/core/WebScene').then(module => WebScene = module.default);
  import('@arcgis/core/views/SceneView').then(module => SceneView = module.default);
  import('@arcgis/core/layers/SceneLayer').then(module => SceneLayer = module.default);
  import('@arcgis/core/layers/BuildingSceneLayer').then(module => BuildingSceneLayer = module.default);
  import('@arcgis/core/layers/IntegratedMeshLayer').then(module => IntegratedMeshLayer = module.default);
  import('@arcgis/core/layers/FeatureLayer').then(module => FeatureLayer = module.default);
  import('@arcgis/core/layers/GraphicsLayer').then(module => GraphicsLayer = module.default);
  import('@arcgis/core/layers/ElevationLayer').then(module => ElevationLayer = module.default);
  import('@arcgis/core/Graphic').then(module => Graphic = module.default);
  import('@arcgis/core/core/reactiveUtils').then(module => reactiveUtils = module);
}

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

export default function MapStudioContent() {
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
  const [mapReady, setMapReady] = useState(false);
  const [currentBasemap, setCurrentBasemap] = useState<string>('satellite');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [activeLayers, setActiveLayers] = useState<string[]>([]);
  const [weatherVisible, setWeatherVisible] = useState(false);
  const [daylightVisible, setDaylightVisible] = useState(false);
  const [measurementActive, setMeasurementActive] = useState(false);
  const [sliceActive, setSliceActive] = useState(false);
  const [lineOfSightActive, setLineOfSightActive] = useState(false);
  const [shadowCastActive, setShadowCastActive] = useState(false);
  const [elevationProfileActive, setElevationProfileActive] = useState(false);
  const [sdkLoaded, setSdkLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [basemapOpacity, setBasemapOpacity] = useState(100);
  const [layerOpacities, setLayerOpacities] = useState<{[key: string]: number}>({});
  const [homeView, setHomeView] = useState({
    center: [-73.9, 40.7],
    zoom: 12,
    tilt: 65,
    heading: 45
  });
  const [showTransparencyControls, setShowTransparencyControls] = useState(false);
  const [showLayersManager, setShowLayersManager] = useState(false);
  const [addedLayers, setAddedLayers] = useState<__esri.Layer[]>([]);

  // Basemap options for different use cases - Using correct ArcGIS basemap IDs
  const basemapOptions = {
    satellite: 'satellite',              // Satellite imagery
    hybrid: 'hybrid',                    // Satellite with labels
    streets: 'streets-vector',           // Street map  
    'streets-night': 'streets-night-vector', // Night mode streets
    topographic: 'topo-vector',          // Elevation contours
    dark: 'dark-gray-vector',            // Dark theme for data viz
    light: 'gray-vector',                // Light theme
    terrain: 'terrain',                  // Terrain with labels
    osm: 'osm',                         // OpenStreetMap
    natgeo: 'national-geographic'       // National Geographic style
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

  // Configure API key on mount - BEFORE rendering map
  useEffect(() => {
    const initializeArcGIS = async () => {
      if (typeof window !== 'undefined') {
        // Import and configure esriConfig
        const configModule = await import('@arcgis/core/config');
        const esriConfig = configModule.default;
        
        // Set API key
        const apiKey = process.env.NEXT_PUBLIC_ARCGIS_API_KEY;
        if (apiKey) {
          esriConfig.apiKey = apiKey;
          console.log('ArcGIS API key configured');
        } else {
          console.warn('No ArcGIS API key found. Maps may not load properly.');
        }
        
        // Set map ready
        setMapReady(true);
      }
    };
    
    initializeArcGIS();
  }, []);

  // Initialize map/scene when component mounts
  useEffect(() => {
    if (!mapReady) return; // Only run when map is ready
    
    const el = (viewType === '3d' ? sceneRef : mapRef).current;
    if (!el) return;

    const onReady = async () => {
      const view = el.view;
      if (!view) return;

      // Set up initial environment for 3D
      if (viewType === '3d') {
        // Configure beautiful 3D environment
        view.environment = {
          background: {
            type: "color",
            color: [0, 0, 0, 0]
          },
          starsEnabled: true,
          atmosphereEnabled: true,
          atmosphere: {
            quality: "high"
          },
          lighting: {
            type: "sun",
            date: new Date(),
            directShadowsEnabled: true,
            ambientOcclusionEnabled: true,
            cameraTrackingEnabled: false,
            waterReflectionEnabled: true
          },
          weather: {
            type: "sunny",
            cloudCover: 0.1
          }
        };

        // Set camera for good initial view
        view.camera = {
          position: {
            longitude: -73.95,
            latitude: 40.65,
            z: 2500
          },
          tilt: 65,
          heading: 45
        };

        // Enable high quality rendering
        view.qualityProfile = "high";
        view.environment.lighting.ambientOcclusionEnabled = true;
        
        // Add ground elevation
        if (view.map && !view.map.ground) {
          const Ground = (await import('@arcgis/core/Ground')).default;
          const ElevationLayer = (await import('@arcgis/core/layers/ElevationLayer')).default;
          
          view.map.ground = new Ground({
            layers: [
              new ElevationLayer({
                url: "https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain/ImageServer"
              })
            ],
            navigationConstraint: {
              type: "stay-above"
            },
            surfaceColor: "#004C73"
          });
        }
      }

      // Add custom layers for projects and agents
      setupCustomLayers(view);
      
      // Set up event handlers
      setupEventHandlers(view);
    };

    el.addEventListener('arcgisViewReadyChange', onReady);
    return () => el.removeEventListener('arcgisViewReadyChange', onReady);
  }, [viewType, mapReady]); // Add mapReady to dependencies

  const setupCustomLayers = (view: any) => {
    if (!GraphicsLayer) return;
    
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
    if (reactiveUtils) {
    reactiveUtils.watch(
    () => view.stationary,
    (stationary: boolean) => {
    if (stationary) {
    // View is now stationary
      console.log('View updated:', view.extent);
      }
      }
      );
      }
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

  // Add various layer types to the map
  const addLayer = async (layerType: string, view: any) => {
    if (!view) return;
    
    try {
      const FeatureLayer = (await import('@arcgis/core/layers/FeatureLayer')).default;
      const TileLayer = (await import('@arcgis/core/layers/TileLayer')).default;
      const MapImageLayer = (await import('@arcgis/core/layers/MapImageLayer')).default;
      const SceneLayer = (await import('@arcgis/core/layers/SceneLayer')).default;
      const GraphicsLayer = (await import('@arcgis/core/layers/GraphicsLayer')).default;
      const Graphic = (await import('@arcgis/core/Graphic')).default;
      const Polygon = (await import('@arcgis/core/geometry/Polygon')).default;
      
      let layer: any = null;
      
      switch(layerType) {
        case 'parcels':
          // Create sample parcels as graphics for demonstration
          layer = new GraphicsLayer({
            id: 'parcels-layer',
            title: 'Property Parcels (Demo)',
            opacity: 0.6
          });
          
          // Add some sample parcels around NYC
          const parcelSymbol = {
            type: 'simple-fill' as const,
            color: [255, 255, 0, 0.1] as [number, number, number, number],
            outline: {
              color: [255, 200, 0] as [number, number, number],
              width: 2
            }
          };
          
          // Create a few sample parcels
          const parcels = [
            new Graphic({
              geometry: new Polygon({
                rings: [[[-73.91, 40.71], [-73.905, 40.71], [-73.905, 40.705], [-73.91, 40.705], [-73.91, 40.71]]]
              }),
              symbol: parcelSymbol,
              attributes: { id: 1, name: 'Parcel A' }
            }),
            new Graphic({
              geometry: new Polygon({
                rings: [[[-73.90, 40.72], [-73.895, 40.72], [-73.895, 40.715], [-73.90, 40.715], [-73.90, 40.72]]]
              }),
              symbol: parcelSymbol,
              attributes: { id: 2, name: 'Parcel B' }
            })
          ];
          
          layer.addMany(parcels);
          break;
          
        case 'buildings':
          // 3D Buildings - OpenStreetMap 3D Buildings (verified working)
          layer = new SceneLayer({
            url: 'https://basemaps3d.arcgis.com/arcgis/rest/services/OpenStreetMap3D_Buildings_v1/SceneServer',
            id: 'buildings-layer',
            title: '3D Buildings',
            opacity: 0.9
          });
          break;
          
        case 'demographics':
          // USA States with population data (verified working)
          layer = new FeatureLayer({
            url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_States_Generalized/FeatureServer/0',
            id: 'demographics-layer',
            title: 'State Population',
            opacity: 0.5,
            renderer: {
              type: 'simple',
              symbol: {
                type: 'simple-fill',
                color: [200, 100, 100, 0.3],
                outline: {
                  color: [255, 255, 255],
                  width: 1
                }
              }
            },
            popupTemplate: {
              title: '{STATE_NAME}',
              content: 'Population: {POPULATION:NumberFormat}'
            }
          });
          break;
          
        case 'transit':
          // USA Major Cities as transit hubs (verified working)
          layer = new FeatureLayer({
            url: 'https://services.arcgis.com/P3ePLMYs2RVChkJx/ArcGIS/rest/services/USA_Major_Cities/FeatureServer/0',
            id: 'transit-layer',
            title: 'Major Cities',
            renderer: {
              type: 'simple',
              symbol: {
                type: 'simple-marker',
                size: 8,
                color: [0, 150, 200, 0.8],
                outline: {
                  color: [255, 255, 255],
                  width: 2
                }
              }
            },
            labelingInfo: [{
              symbol: {
                type: 'text',
                color: 'white',
                haloColor: [0, 100, 150],
                haloSize: 1,
                font: {
                  size: 10,
                  weight: 'bold'
                }
              },
              labelPlacement: 'above-center',
              labelExpressionInfo: {
                expression: '$feature.NAME'
              }
            }]
          });
          break;
          
        case 'traffic':
          // Create a sample traffic layer with graphics
          layer = new GraphicsLayer({
            id: 'traffic-layer',
            title: 'Traffic Flow (Demo)',
            opacity: 0.7
          });
          
          // Add some colored lines to simulate traffic
          const trafficLines = [
            { coords: [[-73.92, 40.70], [-73.90, 40.71]], color: [255, 0, 0] }, // Red - heavy
            { coords: [[-73.89, 40.72], [-73.88, 40.70]], color: [255, 200, 0] }, // Yellow - moderate
            { coords: [[-73.91, 40.69], [-73.89, 40.69]], color: [0, 255, 0] }  // Green - light
          ];
          
          const Polyline = (await import('@arcgis/core/geometry/Polyline')).default;
          
          trafficLines.forEach(line => {
            const graphic = new Graphic({
              geometry: new Polyline({
                paths: [line.coords]
              }),
              symbol: {
                type: 'simple-line',
                color: line.color,
                width: 4,
                cap: 'round'
              }
            });
            layer.add(graphic);
          });
          break;
          
        case 'flood':
          // Create flood zone demo areas
          layer = new GraphicsLayer({
            id: 'flood-layer',
            title: 'Flood Risk Zones (Demo)',
            opacity: 0.4
          });
          
          // Add flood zone polygons
          const floodZones = [
            new Graphic({
              geometry: new Polygon({
                rings: [[[-73.88, 40.68], [-73.87, 40.68], [-73.87, 40.67], [-73.88, 40.67], [-73.88, 40.68]]]
              }),
              symbol: {
                type: 'simple-fill',
                color: [0, 100, 255, 0.3],
                outline: {
                  color: [0, 50, 255],
                  width: 2
                }
              },
              attributes: { zone: 'High Risk', level: 'A' }
            })
          ];
          
          layer.addMany(floodZones);
          break;
          
        case 'crime':
          // Crime heat map demo
          console.log('Crime data layer - demo mode');
          layer = new GraphicsLayer({
            id: 'crime-layer',
            title: 'Crime Data (Demo)'
          });
          break;
          
        default:
          console.log('Unknown layer type:', layerType);
          return;
      }
      
      if (layer) {
        view.map.add(layer);
        console.log(`Added ${layerType} layer successfully`);
        
        // For demo layers, zoom to show them
        if (layerType === 'parcels' || layerType === 'traffic' || layerType === 'flood') {
          view.goTo({
            center: [-73.9, 40.7],
            zoom: 14
          });
        }
      }
    } catch (error) {
      console.error(`Failed to add ${layerType} layer:`, error);
    }
  };
  
  // Remove layer from map
  const removeLayer = (layerId: string, view: any) => {
    if (!view) return;
    
    const layer = view.map.layers.find((l: any) => l.id === layerId + '-layer');
    if (layer) {
      view.map.remove(layer);
    }
  };

  // Handle adding layers from the layers manager
  const handleAddLayerFromManager = (layer: __esri.Layer) => {
    const view = (viewType === '3d' ? sceneRef : mapRef).current?.view;
    if (!view) return;

    try {
      // Add layer to the map
      view.map.add(layer);
      
      // Track the added layer
      setAddedLayers(prev => [...prev, layer]);
      
      console.log(`Added layer: ${layer.title || layer.id}`);
    } catch (error) {
      console.error('Error adding layer to map:', error);
    }
  };

  // Show loading screen while initializing
  if (!mapReady) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#0f1214]">
        <div className="text-center">
          <Globe className="w-12 h-12 text-slate-500 animate-pulse mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Initializing Map...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #60a5fa;
          cursor: pointer;
          border-radius: 50%;
        }
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #60a5fa;
          cursor: pointer;
          border-radius: 50%;
          border: none;
        }
      `}</style>
    <div className="h-screen flex flex-col bg-[#0f1214]">
      {/* Minimal Header Bar */}
      <div className="bg-[#1a1d20]/80 backdrop-blur-sm border-b border-slate-800/30 px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Globe className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-medium text-slate-300">Map Studio</span>
          </div>
          
          {/* View Toggle - Minimal */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewType('2d')}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                viewType === '2d' ? 'bg-slate-700/60 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              2D
            </button>
            <button
              onClick={() => setViewType('3d')}
              className={`px-2.5 py-1 rounded text-xs transition-all ${
                viewType === '3d' ? 'bg-slate-700/60 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              3D
            </button>
          </div>
        </div>
      </div>

      {/* Mini Navigation Bar */}
      <div className="absolute top-14 left-1/2 transform -translate-x-1/2 z-20 flex gap-1 bg-[#1a1d20]/80 backdrop-blur-sm p-1 rounded-lg shadow-lg">
        <a
          href="/"
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-all flex items-center gap-1.5"
          title="Dashboard"
        >
          <ChevronLeft className="w-3 h-3" />
          <span className="hidden sm:inline">Dashboard</span>
        </a>
        <div className="w-px bg-slate-700" />
        <a
          href="/agents"
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-all flex items-center gap-1.5"
          title="Agent Builder"
        >
          <Bot className="w-3 h-3" />
          <span className="hidden sm:inline">Agents</span>
        </a>
        <a
          href="/projects"
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-all flex items-center gap-1.5"
          title="Projects"
        >
          <Briefcase className="w-3 h-3" />
          <span className="hidden sm:inline">Projects</span>
        </a>
        <div className="w-px bg-slate-700" />
        <button
          onClick={() => {
            const view = sceneRef.current?.view || mapRef.current?.view;
            if (view) {
              setHomeView({
                center: [view.center.longitude, view.center.latitude],
                zoom: view.zoom,
                tilt: view.camera?.tilt || 0,
                heading: view.camera?.heading || 0
              });
              alert('Home view saved!');
            }
          }}
          className="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 rounded transition-all flex items-center gap-1.5"
          title="Save Current View as Home"
        >
          <Save className="w-3 h-3" />
          <span className="hidden sm:inline">Set Home</span>
        </button>
      </div>
      <div className="flex-1 flex relative">
        {/* Collapsible Sidebar */}
        <div className={`${sidebarCollapsed ? 'w-0' : 'w-80'} bg-[#1a1d20]/95 backdrop-blur-md border-r border-slate-800/50 overflow-hidden transition-all duration-300 shadow-xl`}>
          <div className="p-4 space-y-4 w-80">
            {/* Mode Info */}
            <div className="bg-gradient-to-br from-[#0f1214] to-[#1a1d20] rounded-lg p-4 border border-slate-800/30">
              <div className="flex items-center gap-2 mb-2">
                {modes[activeMode].icon}
                <h3 className="text-sm font-medium text-slate-200">
                  {modes[activeMode].name}
                </h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                {modes[activeMode].description}
              </p>
            </div>

            {/* Tools */}
            <div className="space-y-2">
              <h4 className="text-xs uppercase text-slate-500 font-medium tracking-wider px-1">Tools</h4>
              <div className="space-y-1">
                {modes[activeMode].tools.map(tool => (
                  <button
                    key={tool}
                    onClick={() => setCurrentTool(tool)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-center gap-2 ${
                      currentTool === tool
                        ? 'bg-gradient-to-r from-slate-700 to-slate-600 text-slate-100 shadow-lg'
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      currentTool === tool ? 'bg-emerald-400' : 'bg-slate-600'
                    }`} />
                    {tool}
                  </button>
                ))}
              </div>
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
          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute top-4 left-4 z-10 p-2 bg-[#1a1d20]/80 hover:bg-[#1a1d20]/90 backdrop-blur-sm rounded-lg transition-all group"
          >
            <svg className="w-4 h-4 text-slate-400 group-hover:text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
          </button>

          {/* Floating Mode Selector - Compact Pills */}
          <div className="absolute top-4 left-14 z-10 flex gap-1 bg-[#1a1d20]/80 backdrop-blur-sm p-1 rounded-lg">
            {Object.entries(modes).map(([key, mode]) => (
              <button
                key={key}
                onClick={() => setActiveMode(key as any)}
                className={`px-2.5 py-1.5 rounded-md text-xs transition-all flex items-center gap-1.5 ${
                  activeMode === key
                    ? `bg-slate-700/80 text-slate-100`
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
                title={mode.name}
              >
                {mode.icon}
                <span className="hidden sm:inline">{key.charAt(0).toUpperCase() + key.slice(1)}</span>
              </button>
            ))}
          </div>
          {viewType === '2d' ? (
            <>
              <div style={{ height: '100%', width: '100%' }}>
                {React.createElement('arcgis-map', {
                  ref: mapRef,
                  basemap: basemapOptions[currentBasemap as keyof typeof basemapOptions],
                  center: "-73.9,40.7",
                  zoom: "12",
                  style: { height: '100%', width: '100%' }
                })}
              </div>
              
              {/* 2D Map Controls */}
              <div className="absolute top-4 right-4 z-10">
                <select 
                  value={currentBasemap}
                  onChange={(e) => setCurrentBasemap(e.target.value)}
                  className="px-3 py-1.5 bg-[#1a1d20]/80 backdrop-blur-sm text-slate-300 text-xs rounded-lg border border-slate-700/50 focus:border-slate-600 outline-none cursor-pointer hover:bg-[#1a1d20]/90 transition-all"
                >
                  <option value="satellite">🛰️ Satellite</option>
                  <option value="hybrid">🗺️ Hybrid</option>
                  <option value="streets">🛣️ Streets</option>
                  <option value="streets-night">🌃 Streets Night</option>
                  <option value="topographic">⛰️ Topographic</option>
                  <option value="dark">🌙 Dark Gray</option>
                  <option value="light">☀️ Light Gray</option>
                  <option value="terrain">🏔️ Terrain</option>
                  <option value="osm">🌐 OpenStreetMap</option>
                  <option value="natgeo">🇺🇸 Nat Geo</option>
                </select>
              </div>
            </>
          ) : (
            <div style={{ height: '100%', width: '100%' }}>
              {React.createElement('arcgis-scene', {
                ref: sceneRef,
                basemap: basemapOptions[currentBasemap as keyof typeof basemapOptions],
                center: "-73.9,40.7",
                zoom: "12",
                tilt: "65",
                heading: "45",
                style: { height: '100%', width: '100%' },
                ground: "world-elevation",
                qualityProfile: "high",
                'environment-atmosphere-quality': "high",
                'environment-lighting-type': "sun",
                'environment-lighting-directShadowsEnabled': "true",
                'environment-lighting-ambientOcclusionEnabled': "true"
              })}
            </div>
          )}

          {/* Custom Compact Overlays */}
          {viewType === '3d' && (
            <>
              {/* Basemap and Layers Controls - Top Right */}
              <div className="absolute top-4 right-4 z-10 flex gap-2">
                {/* Basemap Selector */}
                <select 
                  value={currentBasemap}
                  onChange={(e) => setCurrentBasemap(e.target.value)}
                  className="px-3 py-1.5 bg-[#1a1d20]/80 backdrop-blur-sm text-slate-300 text-xs rounded-lg border border-slate-700/50 focus:border-slate-600 outline-none cursor-pointer hover:bg-[#1a1d20]/90 transition-all"
                >
                  <option value="satellite">🛰️ Satellite</option>
                  <option value="hybrid">🗺️ Hybrid</option>
                  <option value="streets">🛣️ Streets</option>
                  <option value="streets-night">🌃 Streets Night</option>
                  <option value="topographic">⛰️ Topographic</option>
                  <option value="dark">🌙 Dark Gray</option>
                  <option value="light">☀️ Light Gray</option>
                  <option value="terrain">🏔️ Terrain</option>
                  <option value="osm">🌐 OpenStreetMap</option>
                  <option value="natgeo">🇺🇸 Nat Geo</option>
                </select>

                {/* Layers Button */}
                <button
                  onClick={() => setShowLayers(!showLayers)}
                  className={`p-2 bg-[#1a1d20]/80 hover:bg-[#1a1d20]/90 backdrop-blur-sm rounded-lg transition-all group ${
                    showLayers ? 'bg-[#1a1d20]/90' : ''
                  }`}
                  title="Layers"
                >
                  <Layers className={`w-4 h-4 transition-colors ${
                    showLayers ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                </button>

                {/* Transparency Control Button */}
                <button
                  onClick={() => setShowTransparencyControls(!showTransparencyControls)}
                  className={`p-2 bg-[#1a1d20]/80 hover:bg-[#1a1d20]/90 backdrop-blur-sm rounded-lg transition-all group ${
                    showTransparencyControls ? 'bg-[#1a1d20]/90' : ''
                  }`}
                  title="Transparency"
                >
                  <Sliders className={`w-4 h-4 transition-colors ${
                    showTransparencyControls ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                </button>

                {/* Layers Manager Button */}
                <button
                  onClick={() => setShowLayersManager(!showLayersManager)}
                  className={`p-2 bg-[#1a1d20]/80 hover:bg-[#1a1d20]/90 backdrop-blur-sm rounded-lg transition-all group ${
                    showLayersManager ? 'bg-[#1a1d20]/90' : ''
                  }`}
                  title="Add Layers"
                >
                  <Database className={`w-4 h-4 transition-colors ${
                    showLayersManager ? 'text-emerald-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                </button>
              </div>

              {/* Transparency Control Panel */}
              {showTransparencyControls && (
                <div className="absolute top-14 right-4 z-10 bg-[#1a1d20]/95 backdrop-blur-md rounded-lg p-3 w-72 shadow-2xl border border-slate-800/50">
                  <h3 className="text-xs font-medium text-slate-300 mb-3">Transparency Controls</h3>
                  
                  <div className="space-y-4">
                    {/* Basemap Transparency */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-xs text-slate-400">Basemap</label>
                        <span className="text-xs text-slate-500">{basemapOpacity}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={basemapOpacity}
                        onChange={(e) => {
                          const opacity = parseInt(e.target.value);
                          setBasemapOpacity(opacity);
                          // Apply to current basemap
                          const view = sceneRef.current?.view || mapRef.current?.view;
                          if (view?.map?.basemap) {
                            view.map.basemap.baseLayers.forEach((layer: any) => {
                              layer.opacity = opacity / 100;
                            });
                          }
                        }}
                        className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>

                    {/* Active Layers Transparency */}
                    <div className="border-t border-slate-800 pt-3">
                      <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Active Layers</div>
                      
                      {activeLayers.map(layerId => (
                        <div key={layerId} className="mb-3">
                          <div className="flex justify-between items-center mb-2">
                            <label className="text-xs text-slate-400 capitalize">{layerId}</label>
                            <span className="text-xs text-slate-500">
                              {layerOpacities[layerId] || 100}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            value={layerOpacities[layerId] || 100}
                            onChange={(e) => {
                              const opacity = parseInt(e.target.value);
                              setLayerOpacities(prev => ({
                                ...prev,
                                [layerId]: opacity
                              }));
                              // Apply to layer
                              const view = sceneRef.current?.view || mapRef.current?.view;
                              if (view?.map) {
                                const layer = view.map.layers.find((l: any) => l.id === layerId + '-layer');
                                if (layer) {
                                  layer.opacity = opacity / 100;
                                }
                              }
                            }}
                            className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      ))}
                      
                      {activeLayers.length === 0 && (
                        <p className="text-xs text-slate-500 italic">No active layers</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Layers Manager Panel */}
              {showLayersManager && (
                <LayersManager
                  onAddLayer={handleAddLayerFromManager}
                  onClose={() => setShowLayersManager(false)}
                  className="absolute top-14 right-4 z-20 w-96 max-h-[600px]"
                />
              )}

              {showLayers && (
                <div className="absolute top-14 right-4 z-10 bg-[#1a1d20]/95 backdrop-blur-md rounded-lg p-3 w-64 shadow-2xl border border-slate-800/50">
                  <h3 className="text-xs font-medium text-slate-300 mb-3">Overlay Layers</h3>
                  
                  <div className="space-y-2">
                    {/* Data Layers */}
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Data</div>
                    
                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('parcels')}
                        onChange={(e) => {
                          const view = sceneRef.current?.view || mapRef.current?.view;
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'parcels']);
                            addLayer('parcels', view);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'parcels'));
                            removeLayer('parcels', view);
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Property Parcels</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('buildings')}
                        onChange={(e) => {
                          const view = sceneRef.current?.view || mapRef.current?.view;
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'buildings']);
                            addLayer('buildings', view);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'buildings'));
                            removeLayer('buildings', view);
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>3D Buildings</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('transit')}
                        onChange={(e) => {
                          const view = sceneRef.current?.view || mapRef.current?.view;
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'transit']);
                            addLayer('transit', view);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'transit'));
                            removeLayer('transit', view);
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Public Transit</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('traffic')}
                        onChange={(e) => {
                          const view = sceneRef.current?.view || mapRef.current?.view;
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'traffic']);
                            addLayer('traffic', view);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'traffic'));
                            removeLayer('traffic', view);
                          }
                        }}                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Live Traffic</span>
                    </label>

                    {/* Analysis Layers */}
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-1 mt-3">Analysis</div>
                    
                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('demographics')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'demographics']);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'demographics'));
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Demographics Heat Map</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('crime')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'crime']);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'crime'));
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Crime Statistics</span>
                    </label>

                    <label className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-200 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activeLayers.includes('flood')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setActiveLayers([...activeLayers, 'flood']);
                          } else {
                            setActiveLayers(activeLayers.filter(l => l !== 'flood'));
                          }
                        }}
                        className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0"
                      />
                      <span>Flood Zones</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Compact Weather & Daylight Controls - Bottom Left as small buttons */}
              <div className={`absolute bottom-4 flex gap-2 transition-all duration-300`} style={{ left: sidebarCollapsed ? '20px' : '340px' }}>
                <button 
                  className="px-3 py-1.5 bg-[#1a1d20]/70 hover:bg-[#1a1d20]/90 backdrop-blur-sm rounded-lg transition-all text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
                  title="Weather"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
                  </svg>
                  <span>Weather</span>
                </button>
                <button 
                  className="px-3 py-1.5 bg-[#1a1d20]/70 hover:bg-[#1a1d20]/90 backdrop-blur-sm rounded-lg transition-all text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5"
                  title="Sun Position"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Sun</span>
                </button>
              </div>

              {/* Analysis Tools - Compact floating panel when active */}
              {currentTool && (
                <div className={`absolute top-16 transition-all duration-300`} style={{ left: sidebarCollapsed ? '20px' : '340px' }}>
                  <div className="bg-[#1a1d20]/80 backdrop-blur-sm rounded-lg p-2 border border-slate-800/30">
                    <div className="text-xs text-slate-500 mb-2 px-1">{currentTool}</div>
                    <div className="flex flex-col gap-1">
                      {currentTool === 'Site Planning' && (
                        <>
                          <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-300 text-left">
                            📏 Measure Distance
                          </button>
                          <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-300 text-left">
                            🌅 Shadow Analysis
                          </button>
                          <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-300 text-left">
                            📊 Elevation Profile
                          </button>
                        </>
                      )}
                      {currentTool === '3D Modeling' && (
                        <>
                          <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-300 text-left">
                            ✂️ Slice Building
                          </button>
                          <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded text-xs text-slate-300 text-left">
                            👁️ Line of Sight
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick Stats Overlay */}
          {activeMode === 'analyze' && (
            <div className={`absolute top-16 bg-[#1a1d20]/90 backdrop-blur-md rounded-lg p-3 space-y-2 shadow-2xl border border-slate-800/50 transition-all duration-300`} 
                 style={{ left: sidebarCollapsed ? '20px' : '340px' }}>
              <h4 className="text-xs uppercase text-slate-500 font-medium tracking-wider">Market Overview</h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#0f1214]/50 rounded-lg p-2">
                  <div className="text-lg font-light text-emerald-400">$4.2M</div>
                  <div className="text-xs text-slate-500">Avg Value</div>
                </div>
                <div className="bg-[#0f1214]/50 rounded-lg p-2">
                  <div className="text-lg font-light text-blue-400">12%</div>
                  <div className="text-xs text-slate-500">Growth</div>
                </div>
                <div className="bg-[#0f1214]/50 rounded-lg p-2">
                  <div className="text-lg font-light text-purple-400">847</div>
                  <div className="text-xs text-slate-500">Listings</div>
                </div>
                <div className="bg-[#0f1214]/50 rounded-lg p-2">
                  <div className="text-lg font-light text-orange-400">23d</div>
                  <div className="text-xs text-slate-500">Avg DOM</div>
                </div>
              </div>
            </div>
          )}

          {/* Camera Position Controls */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-2">
            <button 
              onClick={() => {
                const view = sceneRef.current?.view || mapRef.current?.view;
                if (view) {
                  view.goTo({
                    center: homeView.center,
                    zoom: homeView.zoom,
                    tilt: homeView.tilt,
                    heading: homeView.heading
                  });
                }
              }}
              className="p-2 bg-[#1a1d20]/90 hover:bg-[#1a1d20] backdrop-blur rounded-lg transition-all group"
              title="Go to Home View"
            >
              <Home className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
            </button>
            <button 
              onClick={() => {
                const view = sceneRef.current?.view || mapRef.current?.view;
                if (view) {
                  // Save current as home
                  setHomeView({
                    center: [view.center.longitude, view.center.latitude],
                    zoom: view.zoom,
                    tilt: view.camera?.tilt || 0,
                    heading: view.camera?.heading || 0
                  });
                  // Visual feedback
                  const btn = event?.currentTarget as HTMLButtonElement;
                  if (btn) {
                    btn.classList.add('bg-emerald-600');
                    setTimeout(() => btn.classList.remove('bg-emerald-600'), 500);
                  }
                }
              }}
              className="p-2 bg-[#1a1d20]/90 hover:bg-[#1a1d20] backdrop-blur rounded-lg transition-all group"
              title="Set Current as Home"
            >
              <Compass className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
            </button>
            <button 
              onClick={() => {
                const view = sceneRef.current?.view || mapRef.current?.view;
                if (view) {
                  view.goTo({ tilt: 0 });
                }
              }}
              className="p-2 bg-[#1a1d20]/90 hover:bg-[#1a1d20] backdrop-blur rounded-lg transition-all group"
              title="Top Down View"
            >
              <Maximize2 className="w-4 h-4 text-slate-400 group-hover:text-slate-200" />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}