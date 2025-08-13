// ArcGIS Layers Manager Service
// Provides search and management capabilities for Living Atlas and ArcGIS Online layers

import Portal from '@arcgis/core/portal/Portal';
import PortalQueryParams from '@arcgis/core/portal/PortalQueryParams';
import PortalItem from '@arcgis/core/portal/PortalItem';
import Layer from '@arcgis/core/layers/Layer';
import FeatureLayer from '@arcgis/core/layers/FeatureLayer';
import SceneLayer from '@arcgis/core/layers/SceneLayer';
import ImageryLayer from '@arcgis/core/layers/ImageryLayer';
import VectorTileLayer from '@arcgis/core/layers/VectorTileLayer';
import TileLayer from '@arcgis/core/layers/TileLayer';
import IntegratedMeshLayer from '@arcgis/core/layers/IntegratedMeshLayer';
import PointCloudLayer from '@arcgis/core/layers/PointCloudLayer';
import ElevationLayer from '@arcgis/core/layers/ElevationLayer';

export interface LayerSearchResult {
  id: string;
  title: string;
  snippet: string;
  description: string;
  thumbnail?: string;
  type: string;
  layerType: string;
  url?: string;
  tags: string[];
  owner: string;
  created: number;
  modified: number;
  numViews: number;
  avgRating: number;
  access: 'private' | 'org' | 'public';
  extent?: {
    xmin: number;
    ymin: number;
    xmax: number;
    ymax: number;
  };
}

export interface LayerSearchParams {
  query?: string;
  category?: string;
  type?: string[];
  tags?: string[];
  extent?: [number, number, number, number]; // [xmin, ymin, xmax, ymax]
  sortField?: 'title' | 'created' | 'modified' | 'num-views' | 'avg-rating';
  sortOrder?: 'asc' | 'desc';
  num?: number;
  start?: number;
  livingAtlasOnly?: boolean;
}

export class LayersManager {
  private portal: Portal;
  private livingAtlasPortal: Portal;

  constructor() {
    // Initialize portals for different sources
    this.portal = new Portal({
      url: 'https://www.arcgis.com'
    });

    this.livingAtlasPortal = new Portal({
      url: 'https://www.arcgis.com'
    });
  }

  /**
   * Search for layers in ArcGIS Online and Living Atlas
   */
  async searchLayers(params: LayerSearchParams = {}): Promise<{
    results: LayerSearchResult[];
    total: number;
    nextStart?: number;
  }> {
    try {
      await this.portal.load();

      // Build search query
      let queryString = this.buildSearchQuery(params);
      
      const queryParams = new PortalQueryParams({
        query: queryString,
        sortField: params.sortField || 'title',
        sortOrder: params.sortOrder || 'desc',
        num: params.num || 20,
        start: params.start || 1
      });

      // Execute search
      const results = await this.portal.queryItems(queryParams);
      
      // Transform results
      const transformedResults: LayerSearchResult[] = results.results.map(item => ({
        id: item.id,
        title: item.title,
        snippet: item.snippet || '',
        description: item.description || '',
        thumbnail: item.thumbnailUrl,
        type: item.type,
        layerType: this.getLayerType(item.type),
        url: item.url,
        tags: item.tags,
        owner: item.owner,
        created: item.created.getTime(),
        modified: item.modified.getTime(),
        numViews: item.numViews,
        avgRating: item.avgRating,
        access: item.access as 'private' | 'org' | 'public',
        extent: item.extent ? {
          xmin: item.extent.xmin,
          ymin: item.extent.ymin,
          xmax: item.extent.xmax,
          ymax: item.extent.ymax
        } : undefined
      }));

      return {
        results: transformedResults,
        total: results.total,
        nextStart: results.nextQueryParams?.start
      };

    } catch (error) {
      console.error('Error searching layers:', error);
      throw error;
    }
  }

  /**
   * Search Living Atlas layers specifically
   */
  async searchLivingAtlas(params: LayerSearchParams = {}): Promise<{
    results: LayerSearchResult[];
    total: number;
    nextStart?: number;
  }> {
    return this.searchLayers({
      ...params,
      livingAtlasOnly: true
    });
  }

  /**
   * Get popular/featured layers
   */
  async getFeaturedLayers(): Promise<LayerSearchResult[]> {
    const results = await this.searchLayers({
      sortField: 'num-views',
      sortOrder: 'desc',
      num: 10,
      livingAtlasOnly: true
    });
    
    return results.results;
  }

  /**
   * Get layers by category
   */
  async getLayersByCategory(category: string): Promise<LayerSearchResult[]> {
    const results = await this.searchLayers({
      category,
      sortField: 'title',
      num: 20
    });
    
    return results.results;
  }

  /**
   * Create a layer instance from search result
   */
  async createLayer(searchResult: LayerSearchResult): Promise<Layer | null> {
    try {
      const layerOptions = {
        portalItem: {
          id: searchResult.id
        }
      };

      // Create appropriate layer type based on the item type
      switch (searchResult.type) {
        case 'Feature Service':
          return new FeatureLayer(layerOptions);
          
        case 'Scene Service':
          return new SceneLayer(layerOptions);
          
        case 'Image Service':
          return new ImageryLayer(layerOptions);
          
        case 'Vector Tile Service':
          return new VectorTileLayer(layerOptions);
          
        case 'Map Service':
          return new TileLayer(layerOptions);
          
        case 'Integrated Mesh Layer':
          return new IntegratedMeshLayer(layerOptions);
          
        case 'Point Cloud Layer':
          return new PointCloudLayer(layerOptions);
          
        case 'Elevation Layer':
          return new ElevationLayer(layerOptions);
          
        default:
          // Try to create generic layer using PortalItem
          const portalItem = new PortalItem({
            id: searchResult.id,
            portal: this.portal
          });
          return Layer.fromPortalItem({ portalItem });
      }
    } catch (error) {
      console.error('Error creating layer:', error);
      return null;
    }
  }

  /**
   * Build search query string based on parameters
   */
  private buildSearchQuery(params: LayerSearchParams): string {
    const queryParts: string[] = [];

    // Base query for layer content
    queryParts.push('(type:"Feature Service" OR type:"Map Service" OR type:"Image Service" OR type:"Vector Tile Service" OR type:"Scene Service" OR type:"Integrated Mesh Layer" OR type:"Point Cloud Layer")');

    // Text search
    if (params.query) {
      queryParts.push(`(title:"${params.query}" OR tags:"${params.query}" OR snippet:"${params.query}")`);
    }

    // Category filter
    if (params.category) {
      queryParts.push(`categories:"${params.category}"`);
    }

    // Type filter
    if (params.type && params.type.length > 0) {
      const typeQuery = params.type.map(t => `type:"${t}"`).join(' OR ');
      queryParts.push(`(${typeQuery})`);
    }

    // Tags filter
    if (params.tags && params.tags.length > 0) {
      const tagsQuery = params.tags.map(tag => `tags:"${tag}"`).join(' AND ');
      queryParts.push(`(${tagsQuery})`);
    }

    // Living Atlas filter
    if (params.livingAtlasOnly) {
      queryParts.push('group:"Living Atlas" OR orgid:"nzS0F0zdNLvs7nc8"');
    }

    // Extent filter (if provided)
    if (params.extent) {
      const [xmin, ymin, xmax, ymax] = params.extent;
      queryParts.push(`extent:[${xmin},${ymin} TO ${xmax},${ymax}]`);
    }

    // Only include public/org accessible items
    queryParts.push('(access:"public" OR access:"org")');

    return queryParts.join(' AND ');
  }

  /**
   * Determine layer type from item type
   */
  private getLayerType(itemType: string): string {
    const typeMap: Record<string, string> = {
      'Feature Service': 'feature',
      'Map Service': 'tile',
      'Image Service': 'imagery',
      'Vector Tile Service': 'vector-tile',
      'Scene Service': 'scene',
      'Integrated Mesh Layer': 'mesh',
      'Point Cloud Layer': 'point-cloud',
      'Elevation Layer': 'elevation'
    };

    return typeMap[itemType] || 'unknown';
  }

  /**
   * Get available categories for filtering
   */
  getAvailableCategories(): string[] {
    return [
      'Basemaps',
      'Demographics',
      'Environment',
      'Transportation',
      'Boundaries',
      'Imagery',
      'Land Use',
      'Economy',
      'Health',
      'Society',
      'Education',
      'Infrastructure',
      'Climate',
      'Disaster Response',
      'Reference',
      'Historical',
      'Planning',
      'Natural Resources'
    ];
  }

  /**
   * Get available layer types for filtering
   */
  getAvailableTypes(): Array<{ value: string; label: string }> {
    return [
      { value: 'Feature Service', label: 'Feature Layers' },
      { value: 'Map Service', label: 'Map Services' },
      { value: 'Image Service', label: 'Imagery' },
      { value: 'Vector Tile Service', label: 'Vector Tiles' },
      { value: 'Scene Service', label: '3D Scene Layers' },
      { value: 'Integrated Mesh Layer', label: '3D Mesh Layers' },
      { value: 'Point Cloud Layer', label: 'Point Cloud' }
    ];
  }
}

// Singleton instance
export const layersManager = new LayersManager();