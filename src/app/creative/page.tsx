'use client';

import { useState } from 'react';
import { ChevronRight, Download, Image, Wand2, Palette, Sparkles, Upload, RefreshCw, Eye } from 'lucide-react';

interface GeneratedImage {
  url: string;
  prompt: string;
  model: string;
  timestamp: string;
  predictionId?: string;
}

export default function CreativePage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit' | 'analyze'>('generate');
  const [prompt, setPrompt] = useState('');
  const [selectedModel, setSelectedModel] = useState('flux-pro');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [numImages, setNumImages] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [editingImage, setEditingImage] = useState('');
  const [editPrompt, setEditPrompt] = useState('');
  const [editStrength, setEditStrength] = useState(0.85);
  const [error, setError] = useState('');
  const [lastGeneratedImage, setLastGeneratedImage] = useState<GeneratedImage | null>(null);

  const models = {
    // Black Forest Labs Flux Models
    'flux-pro': { name: 'Flux Pro 1.1', description: 'Highest quality, best details', emoji: '⚡' },
    'flux-dev': { name: 'Flux Dev', description: 'Good balance of speed and quality', emoji: '🚀' },
    'flux-schnell': { name: 'Flux Schnell', description: 'Ultra-fast (4 steps)', emoji: '💨' },
    // 'flux-realism': { name: 'Flux Realism', description: 'Photorealistic results', emoji: '📸' }, // TODO: Get current version
    
    // Premium Models
    'ideogram-v3-turbo': { name: 'Ideogram V3 Turbo', description: 'Excellent text rendering', emoji: '✍️' },
    'seedream-3': { name: 'SeedDream 3', description: 'Artistic and creative', emoji: '🎨' },
    'imagen-4': { name: 'Imagen 4', description: 'Google\'s latest model', emoji: '🔍' },
    'playground-v3': { name: 'Playground V3', description: 'Great for concepts', emoji: '🎮' },
    
    // Stable Diffusion Family
    'stable-diffusion': { name: 'Stable Diffusion 2.1', description: 'Original SD model', emoji: '🎯' },
    'sdxl': { name: 'Stable Diffusion XL', description: 'Enhanced quality', emoji: '🖼️' },
    
    // Specialized Models
    'kandinsky': { name: 'Kandinsky 2.2', description: 'Russian AI model', emoji: '🏛️' },
    'openjourney': { name: 'OpenJourney', description: 'Midjourney-style', emoji: '🗺️' },
    'realistic-vision': { name: 'Realistic Vision', description: 'Photorealism focus', emoji: '👁️' },
    'anime': { name: 'Waifu Diffusion', description: 'Anime and manga style', emoji: '🎌' },
    'photorealistic': { name: 'Photorealistic FX', description: 'Ultra-realistic photos', emoji: '📷' },
    
    // Future Models (placeholders)
    'dalle-3': { name: 'DALL-E 3', description: 'OpenAI model (coming soon)', emoji: '🤖' },
    'midjourney-v6': { name: 'Midjourney V6', description: 'MJ style (coming soon)', emoji: '🌌' },
  };

  const aspectRatios = [
    { value: '1:1', label: 'Square' },
    { value: '16:9', label: 'Landscape' },
    { value: '9:16', label: 'Portrait' },
    { value: '4:3', label: 'Classic' },
    { value: '3:2', label: 'Photo' },
  ];

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          model: selectedModel,
          aspectRatio,
          numOutputs: numImages,
          outputFormat: 'webp',
          outputQuality: 90,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate image');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message);
      }

      const newImages: GeneratedImage[] = data.images.map((url: string) => ({
        url,
        prompt,
        model: selectedModel,
        timestamp: new Date().toISOString(),
        predictionId: data.predictionId,
      }));

      setGeneratedImages([...newImages, ...generatedImages]);
      
      // Set the first/most recent image as the last generated for easy editing
      if (newImages.length > 0) {
        setLastGeneratedImage(newImages[0]);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKontextEdit = async () => {
    if (!editingImage || !editPrompt.trim()) {
      setError('Please provide an image URL and transformation prompt');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/images/edit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: editingImage,
          prompt: editPrompt,
          strength: editStrength,
          operation: 'kontext-edit',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to edit image');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.message);
      }

      const newImage: GeneratedImage = {
        url: data.outputUrl,
        prompt: `Edit: ${editPrompt}`,
        model: 'flux-kontext',
        timestamp: new Date().toISOString(),
        predictionId: data.predictionId,
      };

      setGeneratedImages([newImage, ...generatedImages]);
    } catch (err: any) {
      setError(err.message || 'Failed to edit image');
    } finally {
      setIsGenerating(false);
    }
  };

  const loadGeneratedImage = () => {
    if (lastGeneratedImage) {
      setEditingImage(lastGeneratedImage.url);
      setError('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1214] to-[#1a1d20] text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light mb-2 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-slate-500" />
            Creative Studio
          </h1>
          <p className="text-sm text-gray-500">
            Generate, edit, and analyze images with cutting-edge AI models
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-8 bg-[#1a1d20] p-1 rounded-lg w-fit">
          <button
            onClick={() => setActiveTab('generate')}
            className={`px-6 py-2 rounded-md text-sm transition-all ${
              activeTab === 'generate'
                ? 'bg-slate-800 text-slate-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Image className="w-4 h-4 inline-block mr-2" />
            Generate
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-6 py-2 rounded-md text-sm transition-all ${
              activeTab === 'edit'
                ? 'bg-slate-800 text-slate-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Wand2 className="w-4 h-4 inline-block mr-2" />
            Edit
          </button>
          <button
            onClick={() => setActiveTab('analyze')}
            className={`px-6 py-2 rounded-md text-sm transition-all ${
              activeTab === 'analyze'
                ? 'bg-slate-800 text-slate-100'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Eye className="w-4 h-4 inline-block mr-2" />
            Analyze
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Control Panel */}
          <div className="bg-[#1a1d20] rounded-lg p-6 backdrop-blur-sm bg-opacity-50 border border-slate-800">
            {activeTab === 'generate' && (
              <>
                {/* Prompt Input */}
                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                    Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe what you want to create..."
                    className="w-full h-32 bg-[#0f1214] border border-slate-800 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-600 resize-none"
                  />
                </div>

                {/* Model Selection - Organized by Category */}
                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-3 block">
                    Model Selection
                  </label>
                  
                  {/* Flux Models Section */}
                  <div className="mb-4">
                    <h4 className="text-xs text-slate-500 mb-2">🔥 Black Forest Labs Flux</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(models).filter(([key]) => key.startsWith('flux') && !key.includes('disabled')).map(([key, model]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedModel(key)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            selectedModel === key
                              ? 'bg-slate-800 border-slate-600'
                              : 'bg-[#0f1214] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{model.emoji}</span>
                            <div>
                              <div className="text-xs font-medium">{model.name}</div>
                              <div className="text-[10px] text-gray-500">{model.description}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Premium Models Section */}
                  <div className="mb-4">
                    <h4 className="text-xs text-slate-500 mb-2">✨ Premium Models</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(models).filter(([key]) => 
                        ['ideogram-v3-turbo', 'seedream-3', 'imagen-4', 'playground-v3'].includes(key)
                      ).map(([key, model]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedModel(key)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            selectedModel === key
                              ? 'bg-slate-800 border-slate-600'
                              : 'bg-[#0f1214] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{model.emoji}</span>
                            <div>
                              <div className="text-xs font-medium">{model.name}</div>
                              <div className="text-[10px] text-gray-500">{model.description}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Stable Diffusion & Specialized Models */}
                  <div className="mb-4">
                    <h4 className="text-xs text-slate-500 mb-2">🎨 Specialized Models</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(models).filter(([key]) => 
                        !key.startsWith('flux') && 
                        !['ideogram-v3-turbo', 'seedream-3', 'imagen-4', 'playground-v3', 'dalle-3', 'midjourney-v6'].includes(key)
                      ).map(([key, model]) => (
                        <button
                          key={key}
                          onClick={() => setSelectedModel(key)}
                          className={`p-2.5 rounded-lg border text-left transition-all ${
                            selectedModel === key
                              ? 'bg-slate-800 border-slate-600'
                              : 'bg-[#0f1214] border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base">{model.emoji}</span>
                            <div>
                              <div className="text-xs font-medium">{model.name}</div>
                              <div className="text-[10px] text-gray-500">{model.description}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Coming Soon Models */}
                  <div>
                    <h4 className="text-xs text-slate-500 mb-2">🔜 Coming Soon</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(models).filter(([key]) => 
                        ['dalle-3', 'midjourney-v6'].includes(key)
                      ).map(([key, model]) => (
                        <button
                          key={key}
                          disabled
                          className="p-2.5 rounded-lg border text-left bg-[#0f1214]/50 border-slate-900 opacity-50 cursor-not-allowed"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-base grayscale">{model.emoji}</span>
                            <div>
                              <div className="text-xs font-medium">{model.name}</div>
                              <div className="text-[10px] text-gray-600">{model.description}</div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Aspect Ratio */}
                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                    Aspect Ratio
                  </label>
                  <div className="flex gap-2">
                    {aspectRatios.map((ratio) => (
                      <button
                        key={ratio.value}
                        onClick={() => setAspectRatio(ratio.value)}
                        className={`px-4 py-2 rounded-lg text-sm transition-all ${
                          aspectRatio === ratio.value
                            ? 'bg-slate-800 text-slate-100'
                            : 'bg-[#0f1214] text-gray-400 hover:text-gray-200'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Number of Images */}
                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                    Number of Images: {numImages}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="4"
                    value={numImages}
                    onChange={(e) => setNumImages(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                {/* Generate Button */}
                <button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full py-3 bg-gradient-to-r from-slate-700 to-slate-600 text-white rounded-lg font-medium hover:from-slate-600 hover:to-slate-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Generate Images
                    </>
                  )}
                </button>
              </>
            )}

            {activeTab === 'edit' && (
              <>
                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                    Image URL
                  </label>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editingImage}
                      onChange={(e) => setEditingImage(e.target.value)}
                      placeholder="Paste image URL to edit..."
                      className="w-full bg-[#0f1214] border border-slate-800 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-600"
                    />
                    
                    {lastGeneratedImage && (
                      <button
                        onClick={loadGeneratedImage}
                        className="w-full py-2 bg-gradient-to-r from-emerald-700/20 to-emerald-600/20 border border-emerald-600/30 text-emerald-400 rounded-lg font-medium hover:from-emerald-600/30 hover:to-emerald-500/30 transition-all flex items-center justify-center gap-2 text-sm"
                      >
                        <Upload className="w-4 h-4" />
                        Load Generated Image ({lastGeneratedImage.model})
                      </button>
                    )}
                  </div>
                </div>

                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                    Transformation Prompt
                  </label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Describe how you want to transform the image..."
                    className="w-full h-24 bg-[#0f1214] border border-slate-800 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-slate-600 resize-none"
                  />
                </div>

                <div className="mb-6">
                  <label className="text-xs uppercase tracking-wider text-gray-400 mb-2 block">
                    Transformation Strength: {editStrength}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="1.0"
                    step="0.05"
                    value={editStrength}
                    onChange={(e) => setEditStrength(Number(e.target.value))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Minimal</span>
                    <span>Maximum</span>
                  </div>
                </div>

                <button
                  onClick={handleKontextEdit}
                  disabled={isGenerating}
                  className="w-full py-3 bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Transforming...
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Transform with Flux Kontext
                    </>
                  )}
                </button>
              </>
            )}

            {activeTab === 'analyze' && (
              <div className="text-center py-12 text-gray-500">
                <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Image analysis features coming soon!</p>
                <p className="text-sm mt-2">Caption, OCR, object detection, and more</p>
              </div>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Image Gallery */}
          <div className="bg-[#1a1d20] rounded-lg p-6 backdrop-blur-sm bg-opacity-50 border border-slate-800">
            <h3 className="text-xs uppercase tracking-wider text-gray-400 mb-4">
              Generated Images ({generatedImages.length})
            </h3>
            
            {generatedImages.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Image className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No images generated yet</p>
                <p className="text-sm mt-2">Create your first masterpiece!</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto">
                {generatedImages.map((image, index) => (
                  <div key={index} className={`group relative rounded-lg overflow-hidden ${
                    editingImage === image.url ? 'ring-2 ring-emerald-500' : ''
                  }`}>
                    <img
                      src={image.url}
                      alt={image.prompt}
                      className="w-full h-48 object-cover"
                    />
                    
                    {/* Currently loaded for editing indicator */}
                    {editingImage === image.url && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-600 text-white text-xs rounded flex items-center gap-1">
                        <Wand2 className="w-3 h-3" />
                        Ready to Edit
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Quick Edit Button */}
                      <div className="absolute top-2 right-2 flex gap-2">
                        <button
                          onClick={() => {
                            setEditingImage(image.url);
                            setActiveTab('edit');
                            setLastGeneratedImage(image);
                          }}
                          className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white text-xs rounded flex items-center gap-1 transition-colors"
                        >
                          <Wand2 className="w-3 h-3" />
                          Edit This
                        </button>
                        <a
                          href={image.url}
                          download
                          className="p-1.5 bg-black/50 hover:bg-black/70 text-white rounded transition-colors"
                        >
                          <Download className="w-3 h-3" />
                        </a>
                      </div>
                      
                      <div className="absolute bottom-0 left-0 right-0 p-3">
                        <p className="text-xs text-white mb-1 line-clamp-2">{image.prompt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-400">{models[image.model as keyof typeof models]?.name}</span>
                          <span className="text-xs text-gray-500">{new Date(image.timestamp).toLocaleTimeString()}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
