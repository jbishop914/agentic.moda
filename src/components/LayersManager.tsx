'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Plus, 
  Filter, 
  Globe, 
  Layers as LayersIcon,
  X,
  ChevronDown,
  ExternalLink,
  Eye,
  EyeOff,
  Star,
  Calendar,
  Users,
  Tag,
  Info,
  Loader
} from 'lucide-react';
import { layersManager, LayerSearchResult, LayerSearchParams } from '@/lib/services/layers-manager';

interface LayersManagerProps {
  onAddLayer: (layer: __esri.Layer) => void;
  onClose: () => void;
  className?: string;
}

export default function LayersManager({ onAddLayer, onClose, className = '' }: LayersManagerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LayerSearchResult[]>([]);
  const [featuredLayers, setFeaturedLayers] = useState<LayerSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [currentTab, setCurrentTab] = useState<'search' | 'featured' | 'categories'>('search');
  const [addingLayer, setAddingLayer] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Load featured layers on mount
  useEffect(() => {
    loadFeaturedLayers();
  }, []);

  // Perform search when query changes (with debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedTypes]);

  const loadFeaturedLayers = async () => {
    try {
      setLoading(true);
      const featured = await layersManager.getFeaturedLayers();
      setFeaturedLayers(featured);
    } catch (err) {
      setError('Failed to load featured layers');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const performSearch = async () => {
    try {
      setLoading(true);
      setError('');
      
      const searchParams: LayerSearchParams = {
        query: searchQuery.trim(),
        num: 20
      };

      if (selectedCategory) {
        searchParams.category = selectedCategory;
      }

      if (selectedTypes.length > 0) {
        searchParams.type = selectedTypes;
      }

      const results = await layersManager.searchLayers(searchParams);
      setSearchResults(results.results);
    } catch (err) {
      setError('Search failed. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLayer = async (layerResult: LayerSearchResult) => {
    try {
      setAddingLayer(layerResult.id);
      setError('');
      
      const layer = await layersManager.createLayer(layerResult);
      
      if (layer) {
        await layer.load();
        onAddLayer(layer);
        
        // Show success feedback
        console.log(`Added layer: ${layerResult.title}`);
      } else {
        throw new Error('Failed to create layer');
      }
    } catch (err) {
      setError(`Failed to add layer: ${layerResult.title}`);
      console.error(err);
    } finally {
      setAddingLayer(null);
    }
  };

  const toggleTypeFilter = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedTypes([]);
    setSearchQuery('');
    setSearchResults([]);
  };

  const LayerCard = ({ layer }: { layer: LayerSearchResult }) => (
    <div className="bg-slate-800/30 border border-slate-700/50 rounded-lg p-4 hover:bg-slate-800/50 transition-all">
      <div className="flex gap-3">
        {layer.thumbnail && (
          <img 
            src={layer.thumbnail} 
            alt={layer.title}
            className="w-16 h-16 rounded object-cover bg-slate-700"
          />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <h4 className="text-sm font-medium text-slate-200 line-clamp-2">{layer.title}</h4>
            <button
              onClick={() => handleAddLayer(layer)}
              disabled={addingLayer === layer.id}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-600 text-white text-xs rounded transition-all flex items-center gap-1.5 shrink-0"
            >
              {addingLayer === layer.id ? (
                <>
                  <Loader className="w-3 h-3 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  Add
                </>
              )}
            </button>
          </div>
          
          <p className="text-xs text-slate-400 mb-2 line-clamp-2">{layer.snippet}</p>
          
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Tag className="w-3 h-3" />
              {layer.layerType}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {layer.numViews.toLocaleString()} views
            </span>
            {layer.avgRating > 0 && (
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3" />
                {layer.avgRating.toFixed(1)}
              </span>
            )}
          </div>
          
          {layer.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {layer.tags.slice(0, 3).map(tag => (
                <span key={tag} className="px-2 py-0.5 bg-slate-700/50 text-[10px] text-slate-400 rounded">
                  {tag}
                </span>
              ))}
              {layer.tags.length > 3 && (
                <span className="px-2 py-0.5 bg-slate-700/50 text-[10px] text-slate-400 rounded">
                  +{layer.tags.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`bg-slate-900/95 border border-slate-700/50 rounded-lg shadow-2xl ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <LayersIcon className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-medium text-slate-200">Layers Manager</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900/50 border border-red-700/50 rounded text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-700/50">
        {[
          { id: 'search', label: 'Search', icon: Search },
          { id: 'featured', label: 'Featured', icon: Star },
          { id: 'categories', label: 'Categories', icon: Filter }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setCurrentTab(tab.id as any)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-xs font-medium transition-all ${
              currentTab === tab.id
                ? 'text-emerald-400 border-b-2 border-emerald-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Search Tab */}
        {currentTab === 'search' && (
          <div className="space-y-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search layers (e.g., 'demographics', 'transportation', 'satellite imagery')"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-md text-xs text-slate-300 placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 text-xs rounded transition-all"
              >
                <Filter className="w-3 h-3" />
                Filters
                <ChevronDown className={`w-3 h-3 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
              
              {(selectedCategory || selectedTypes.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 text-xs rounded transition-all"
                >
                  Clear filters
                </button>
              )}
            </div>

            {/* Filter Options */}
            {showFilters && (
              <div className="space-y-3 p-3 bg-slate-800/30 rounded border border-slate-700/50">
                {/* Category Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300"
                  >
                    <option value="">All Categories</option>
                    {layersManager.getAvailableCategories().map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-2">Layer Types</label>
                  <div className="grid grid-cols-2 gap-2">
                    {layersManager.getAvailableTypes().map(type => (
                      <label key={type.value} className="flex items-center gap-2 text-xs text-slate-400">
                        <input
                          type="checkbox"
                          checked={selectedTypes.includes(type.value)}
                          onChange={() => toggleTypeFilter(type.value)}
                          className="w-3 h-3 rounded"
                        />
                        {type.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Search Results */}
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="ml-2 text-sm text-slate-400">Searching...</span>
              </div>
            )}

            {searchResults.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-slate-400">
                    {searchResults.length} results found
                  </h4>
                </div>
                {searchResults.map(layer => (
                  <LayerCard key={layer.id} layer={layer} />
                ))}
              </div>
            )}

            {searchQuery && !loading && searchResults.length === 0 && (
              <div className="text-center py-8 text-sm text-slate-500">
                No layers found for "{searchQuery}"
              </div>
            )}
          </div>
        )}

        {/* Featured Tab */}
        {currentTab === 'featured' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-4">
              <Star className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-medium text-slate-400">Most Popular Living Atlas Layers</h4>
            </div>
            
            {loading && (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-emerald-400 animate-spin" />
                <span className="ml-2 text-sm text-slate-400">Loading...</span>
              </div>
            )}

            {featuredLayers.map(layer => (
              <LayerCard key={layer.id} layer={layer} />
            ))}
          </div>
        )}

        {/* Categories Tab */}
        {currentTab === 'categories' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {layersManager.getAvailableCategories().map(category => (
                <button
                  key={category}
                  onClick={() => {
                    setSelectedCategory(category);
                    setCurrentTab('search');
                    setSearchQuery('');
                  }}
                  className="p-3 bg-slate-800/30 hover:bg-slate-700/50 border border-slate-700/50 rounded text-left text-xs text-slate-300 transition-all"
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}