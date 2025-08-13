// 3D Scene Configuration and Utilities
// Based on ArcGIS Maps SDK best practices

import WebScene from '@arcgis/core/WebScene';
import SceneView from '@arcgis/core/views/SceneView';
import SceneLayer from '@arcgis/core/layers/SceneLayer';
import BuildingSceneLayer from '@arcgis/core/layers/BuildingSceneLayer';
import IntegratedMeshLayer from '@arcgis/core/layers/IntegratedMeshLayer';
import ElevationLayer from '@arcgis/core/layers/ElevationLayer';
import GraphicsLayer from '@arcgis/core/layers/GraphicsLayer';
import Ground from '@arcgis/core/Ground';
import Camera from '@arcgis/core/Camera';
import Point from '@arcgis/core/geometry/Point';
import SpatialReference from '@arcgis/core/geometry/SpatialReference';
import Graphic from '@arcgis/core/Graphic';

/**
 * Create an optimized 3D scene for architectural visualization
 */
export function createArchitectureScene(location?: [number, number]) {
  // Create scene with high-quality ground elevation
  const scene = new WebScene({
    basemap: 'arcgis/imagery-standard',
    ground: new Ground({
      layers: [
        new ElevationLayer({
          url: 'https://elevation3d.arcgis.com/arcgis/rest/services/WorldElevation3D/Terrain/ImageServer',
          title: 'World Elevation'
        })
      ],
      navigationConstraint: {
        type: 'stay-above'
      },
      surfaceColor: '#004C73'
    })
  });

  return scene;
}

/**
 * Configure SceneView for optimal 3D experience
 */
export function configureSceneView(view: any) {
  // Set high-quality rendering
  view.qualityProfile = 'high';
  
  // Configure environment for realistic visualization
  view.environment = {
    background: {
      type: 'color',
      color: [0, 0, 0, 0] // Transparent for sky
    },
    starsEnabled: true,
    atmosphereEnabled: true,
    atmosphere: {
      quality: 'high'
    },
    lighting: {
      type: 'sun',
      date: new Date(),
      directShadowsEnabled: true,
      ambientOcclusionEnabled: true,
      cameraTrackingEnabled: true, // Sun moves with camera
      waterReflectionEnabled: true
    },
    weather: {
      type: 'sunny',
      cloudCover: 0.3
    }
  };

  // Set initial camera for good 3D perspective
  if (!view.camera) {
    view.camera = new Camera({
      position: {
        longitude: view.center?.longitude || -73.9,
        latitude: view.center?.latitude || 40.7,
        z: 1500 // meters above ground
      },
      tilt: 65, // degrees from vertical
      heading: 45 // degrees clockwise from north
    });
  }

  // Configure navigation constraints
  view.constraints = {
    altitude: {
      min: 10,
      max: 25000
    },
    clipDistance: {
      near: 0.1,
      far: 100000
    },
    tilt: {
      max: 85
    }
  };

  // Enable high-res screens
  view.resizeAlign = 'center';
  view.padding = { top: 0, left: 0, right: 0, bottom: 0 };
}

/**
 * Add realistic 3D buildings to scene
 */
export async function add3DBuildings(scene: WebScene, location: [number, number]) {
  // NYC 3D buildings (if in NYC area)
  if (Math.abs(location[0] - (-73.9)) < 1 && Math.abs(location[1] - 40.7) < 1) {
    const nycBuildings = new BuildingSceneLayer({
      url: 'https://tiles.arcgis.com/tiles/P3ePLMYs2RVChkJx/arcgis/rest/services/Buildings_NewYork_v18/SceneServer',
      title: 'NYC Buildings'
    });
    scene.add(nycBuildings);
  }

  // Add other city buildings based on location
  // San Francisco, Los Angeles, etc.
  const cityBuildings = await findCityBuildings(location);
  if (cityBuildings) {
    scene.add(cityBuildings);
  }
}

/**
 * Add photorealistic mesh layer if available
 */
export async function addRealisticMesh(scene: WebScene, location: [number, number]) {
  // Check if integrated mesh is available for location
  const meshUrl = await findIntegratedMesh(location);
  if (meshUrl) {
    const meshLayer = new IntegratedMeshLayer({
      url: meshUrl,
      title: 'Photorealistic 3D'
    });
    scene.add(meshLayer);
  }
}

/**
 * Camera presets for different viewing angles
 */
export const cameraPresets = {
  // Bird's eye view
  aerial: (center: [number, number]) => ({
    position: {
      longitude: center[0],
      latitude: center[1] - 0.005,
      z: 2000
    },
    tilt: 45,
    heading: 0
  }),
  
  // Street level view
  street: (center: [number, number]) => ({
    position: {
      longitude: center[0],
      latitude: center[1] - 0.001,
      z: 50
    },
    tilt: 80,
    heading: 0
  }),
  
  // Architectural overview
  architecture: (center: [number, number]) => ({
    position: {
      longitude: center[0] - 0.002,
      latitude: center[1] - 0.002,
      z: 300
    },
    tilt: 65,
    heading: 45
  }),
  
  // Top-down planning view
  planning: (center: [number, number]) => ({
    position: {
      longitude: center[0],
      latitude: center[1],
      z: 1000
    },
    tilt: 0,
    heading: 0
  })
};

/**
 * Animate camera to new position
 */
export async function animateToCamera(view: any, preset: string, center: [number, number]) {
  const cameraConfig = cameraPresets[preset as keyof typeof cameraPresets](center);
  
  await view.goTo({
    target: new Point({
      longitude: center[0],
      latitude: center[1]
    }),
    ...cameraConfig
  }, {
    duration: 2000,
    easing: 'ease-in-out'
  });
}

/**
 * Add custom 3D building from architecture pipeline
 */
export function addCustomBuilding(
  scene: WebScene,
  location: [number, number],
  buildingSpec: any
) {
  // This will be integrated with your architecture pipeline
  // to place generated buildings on the map
  
  const buildingGraphic = new Graphic({
    geometry: {
      type: 'polygon',
      rings: createBuildingFootprint(location, buildingSpec.area),
      spatialReference: { wkid: 4326 }
    } as any,
    symbol: {
      type: 'polygon-3d',
      symbolLayers: [{
        type: 'extrude',
        size: buildingSpec.stories * 3.5, // meters per story
        material: {
          color: buildingSpec.color || [255, 255, 255, 0.9]
        },
        edges: {
          type: 'solid',
          color: [50, 50, 50, 0.5],
          size: 0.5
        }
      }]
    } as any,
    attributes: buildingSpec
  });

  // Add to graphics layer
  let graphicsLayer = scene.layers.find(l => l.id === 'custom-buildings') as GraphicsLayer;
  if (!graphicsLayer) {
    graphicsLayer = new GraphicsLayer({ id: 'custom-buildings', title: 'Custom Buildings' });
    scene.add(graphicsLayer);
  }
    
  graphicsLayer.add(buildingGraphic);
}

// Helper functions
function createBuildingFootprint(center: [number, number], area: number) {
  const side = Math.sqrt(area) / 111111; // Convert to degrees
  const halfSide = side / 2;
  
  return [[
    [center[0] - halfSide, center[1] - halfSide],
    [center[0] + halfSide, center[1] - halfSide],
    [center[0] + halfSide, center[1] + halfSide],
    [center[0] - halfSide, center[1] + halfSide],
    [center[0] - halfSide, center[1] - halfSide]
  ]];
}

async function findCityBuildings(location: [number, number]) {
  // Check known city building services
  const cities = {
    'San Francisco': {
      bounds: [-122.5, 37.7, -122.3, 37.8],
      url: 'https://tiles.arcgis.com/tiles/z2tnIkrLQ2BRzr6P/arcgis/rest/services/SanFrancisco_3D_Buildings/SceneServer'
    },
    // Add more cities as needed
  };

  for (const [city, config] of Object.entries(cities)) {
    if (isInBounds(location, config.bounds)) {
      return new BuildingSceneLayer({
        url: config.url,
        title: `${city} Buildings`
      });
    }
  }
  
  return null;
}

async function findIntegratedMesh(location: [number, number]) {
  // Check for available photorealistic mesh layers
  // These are typically available for major cities
  return null; // Implement based on available services
}

function isInBounds(location: [number, number], bounds: number[]) {
  return location[0] >= bounds[0] && location[0] <= bounds[2] &&
         location[1] >= bounds[1] && location[1] <= bounds[3];
}

/**
 * Performance optimization settings
 */
export const performanceSettings = {
  high: {
    qualityProfile: 'high',
    maxFPS: 60,
    lodFactor: 1.5,
    memoryLimit: 2048
  },
  medium: {
    qualityProfile: 'medium',
    maxFPS: 30,
    lodFactor: 1,
    memoryLimit: 1024
  },
  low: {
    qualityProfile: 'low',
    maxFPS: 24,
    lodFactor: 0.5,
    memoryLimit: 512
  }
};

export default {
  createArchitectureScene,
  configureSceneView,
  add3DBuildings,
  addRealisticMesh,
  animateToCamera,
  addCustomBuilding,
  cameraPresets,
  performanceSettings
};