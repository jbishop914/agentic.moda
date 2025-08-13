'use client';

import { useState } from 'react';
import { 
  Home, 
  MessageSquare, 
  FileText, 
  Image as ImageIcon, 
  Building, 
  CheckCircle,
  AlertCircle,
  Loader,
  ArrowRight,
  Download,
  RefreshCw,
  Eye,
  Sparkles
} from 'lucide-react';

interface ArchitecturalSpec {
  project: {
    name: string;
    type: string;
    style: string;
    totalSquareFeet: number;
    stories: number;
  };
  dimensions: any;
  rooms: any[];
  features: any;
  aesthetics: any;
}

interface DesignResult {
  success: boolean;
  specification?: ArchitecturalSpec;
  floorplan?: string;
  renders?: Array<{ type: string; url: string }>;
  consultation?: string;
  questions?: string[];
  readiness?: 'ready' | 'needs_more_info';
  completeness?: number;
  nextSteps?: string;
  mode?: string;
  generationTime?: string;
}

export default function ArchitecturePage() {
  const [currentStep, setCurrentStep] = useState<'consultation' | 'specification' | 'design' | 'refinement'>('consultation');
  const [vision, setVision] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState<DesignResult | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const handleConsultation = async () => {
    if (!vision.trim()) {
      setError('Please describe your vision for the home');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vision, 
          mode: 'consultation' 
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Consultation failed');
      }

      setResult(data);
      
      // If ready, offer to proceed to full design
      if (data.readiness === 'ready') {
        setTimeout(() => {
          setCurrentStep('design');
        }, 2000);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to process consultation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFullDesign = async () => {
    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/architecture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          vision, 
          mode: 'full',
          options: {
            multipleViews: true,
            includeInterior: true
          }
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Design generation failed');
      }

      setResult(data);
      setCurrentStep('refinement');

    } catch (err: any) {
      setError(err.message || 'Failed to generate design');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRefinement = async () => {
    if (!feedback.trim()) {
      setError('Please provide feedback for refinement');
      return;
    }

    if (!result?.specification) {
      setError('No specification to refine');
      return;
    }

    setIsProcessing(true);
    setError('');

    try {
      const response = await fetch('/api/architecture', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          originalSpec: result.specification,
          feedback,
          action: 'refine'
        }),
      });

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Refinement failed');
      }

      // Update result with refined design
      setResult({
        ...result,
        specification: data.updatedSpec,
        floorplan: data.newFloorplan || result.floorplan,
        renders: data.newRenders || result.renders,
        consultation: data.changesExplanation,
      });

      setFeedback('');

    } catch (err: any) {
      setError(err.message || 'Failed to refine design');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f1214] to-[#1a1d20] text-gray-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light mb-2 flex items-center gap-3">
            <Building className="w-8 h-8 text-slate-500" />
            Architecture Studio
          </h1>
          <p className="text-sm text-gray-500">
            Turn your vision into detailed floor plans and 3D renders with AI-powered architectural design
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8 space-x-4">
          {[
            { id: 'consultation', label: 'Consultation', icon: MessageSquare },
            { id: 'specification', label: 'Specification', icon: FileText },
            { id: 'design', label: 'Design', icon: ImageIcon },
            { id: 'refinement', label: 'Refinement', icon: RefreshCw },
          ].map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                currentStep === step.id 
                  ? 'bg-emerald-600 border-emerald-600 text-white'
                  : index < ['consultation', 'specification', 'design', 'refinement'].indexOf(currentStep)
                    ? 'bg-emerald-600/20 border-emerald-600 text-emerald-400'
                    : 'border-slate-600 text-slate-400'
              }`}>
                <step.icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm ${
                currentStep === step.id ? 'text-emerald-400' : 'text-slate-500'
              }`}>
                {step.label}
              </span>
              {index < 3 && <ArrowRight className="w-4 h-4 text-slate-600 mx-4" />}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Panel */}
          <div className="bg-[#1a1d20] rounded-lg p-6 backdrop-blur-sm bg-opacity-50 border border-slate-800">
            {currentStep === 'consultation' && (
              <>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-emerald-400" />
                  Tell Us Your Vision
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Describe your dream home in detail. Include size, style, room requirements, and any special features.
                </p>
                <textarea
                  value={vision}
                  onChange={(e) => setVision(e.target.value)}
                  placeholder="I'm envisioning a 40ft x 60ft colonial style home, 2 stories, with 4 bedrooms and 3 full bathrooms. The house should have a stately and classic colonial look but with modern updates inside. I want an open layout connecting the kitchen to the living room, a home office on the first floor, and a family room with cathedral ceilings and a big window matching the height of the stonework on the chimney..."
                  className="w-full h-40 bg-[#0f1214] border border-slate-800 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                />
                <button
                  onClick={handleConsultation}
                  disabled={isProcessing}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-emerald-700 to-emerald-600 text-white rounded-lg font-medium hover:from-emerald-600 hover:to-emerald-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Analyzing Vision...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Start Consultation
                    </>
                  )}
                </button>
              </>
            )}

            {currentStep === 'design' && (
              <>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <Building className="w-5 h-5 text-emerald-400" />
                  Generate Complete Design
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  Ready to create your architectural designs! This will generate:
                </p>
                <ul className="text-sm text-gray-400 mb-6 space-y-2">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Detailed JSON specification
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Professional floor plans
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    3D exterior renders
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    Interior visualizations
                  </li>
                </ul>
                <button
                  onClick={handleFullDesign}
                  disabled={isProcessing}
                  className="w-full py-3 bg-gradient-to-r from-blue-700 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Creating Design...
                    </>
                  ) : (
                    <>
                      <Building className="w-4 h-4" />
                      Generate Complete Design
                    </>
                  )}
                </button>
              </>
            )}

            {currentStep === 'refinement' && (
              <>
                <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-emerald-400" />
                  Refine Your Design
                </h3>
                <p className="text-sm text-gray-400 mb-4">
                  What would you like to change or improve in the design?
                </p>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="I'd like to make the master bedroom larger and add a walk-in closet. Also, could we change the exterior to use stone instead of siding?"
                  className="w-full h-32 bg-[#0f1214] border border-slate-800 rounded-lg px-4 py-3 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                />
                <button
                  onClick={handleRefinement}
                  disabled={isProcessing}
                  className="w-full mt-4 py-3 bg-gradient-to-r from-purple-700 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Refining Design...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      Refine Design
                    </>
                  )}
                </button>
              </>
            )}

            {error && (
              <div className="mt-4 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                {error}
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="bg-[#1a1d20] rounded-lg p-6 backdrop-blur-sm bg-opacity-50 border border-slate-800">
            <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-emerald-400" />
              Results
            </h3>

            {!result ? (
              <div className="text-center py-12 text-gray-500">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Your architectural designs will appear here</p>
                <p className="text-sm mt-2">Start by describing your vision</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Consultation Results */}
                {result.consultation && (
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-emerald-400 mb-2">Consultation</h4>
                    <p className="text-sm text-gray-300 whitespace-pre-wrap">{result.consultation}</p>
                    
                    {result.completeness && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
                          <span>Completeness</span>
                          <span>{result.completeness}%</span>
                        </div>
                        <div className="w-full bg-slate-700 rounded-full h-2">
                          <div 
                            className="bg-emerald-600 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${result.completeness}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Specification */}
                {result.specification && (
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-400 mb-2">Specification</h4>
                    <div className="text-sm text-gray-300 space-y-1">
                      <p><span className="text-gray-400">Style:</span> {result.specification.project.style}</p>
                      <p><span className="text-gray-400">Size:</span> {result.specification.project.totalSquareFeet} sq ft</p>
                      <p><span className="text-gray-400">Stories:</span> {result.specification.project.stories}</p>
                      <p><span className="text-gray-400">Rooms:</span> {result.specification.rooms.length}</p>
                    </div>
                  </div>
                )}

                {/* Generated Images */}
                {result.floorplan && (
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-purple-400 mb-3">Floor Plan</h4>
                    <div className="relative group">
                      <img
                        src={result.floorplan}
                        alt="Floor Plan"
                        className="w-full h-48 object-cover rounded"
                      />
                      <a
                        href={result.floorplan}
                        download
                        className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Download className="w-4 h-4" />
                      </a>
                    </div>
                  </div>
                )}

                {result.renders && result.renders.length > 0 && (
                  <div className="bg-slate-800/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-400 mb-3">3D Renders</h4>
                    <div className="grid grid-cols-1 gap-3">
                      {result.renders.map((render, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={render.url}
                            alt={`${render.type} render`}
                            className="w-full h-48 object-cover rounded"
                          />
                          <div className="absolute top-2 left-2 px-2 py-1 bg-black/50 text-white text-xs rounded">
                            {render.type}
                          </div>
                          <a
                            href={render.url}
                            download
                            className="absolute top-2 right-2 p-2 bg-black/50 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="w-4 h-4" />
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.generationTime && (
                  <div className="text-xs text-gray-500 text-center">
                    Generated in {result.generationTime}s
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}