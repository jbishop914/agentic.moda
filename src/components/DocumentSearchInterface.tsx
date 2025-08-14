'use client';

import React, { useState, useCallback } from 'react';
import { Upload, Search, Users, Clock, FileText, Zap, BarChart3 } from 'lucide-react';

interface SearchResult {
  type: 'single' | 'parallel';
  results: Record<string, number>;
  processingTimeMs: number;
  agentDetails?: Array<{
    word: string;
    count: number;
    processingTimeMs: number;
    agentId: string;
  }>;
}

export default function DocumentSearchInterface() {
  const [uploadedDocument, setUploadedDocument] = useState<{id: string; filename: string; wordCount: number} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Sandbox controls for experimentation
  const [customPrompt, setCustomPrompt] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>(['search_document']);
  const [selectedPattern, setSelectedPattern] = useState('single');
  const [parallelCount, setParallelCount] = useState(3);
  const [strategy, setStrategy] = useState('decompose');
  
  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const text = await file.text();
      
      const response = await fetch('/api/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: text,
          filename: file.name
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setUploadedDocument({
          id: result.documentId,
          filename: result.filename,
          wordCount: result.wordCount
        });
      } else {
        console.error('Upload failed:', result.message);
        alert('Upload failed: ' + result.message);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, []);
  
  const runExperiment = async () => {
    if (!uploadedDocument || !customPrompt.trim()) return;
    
    setIsSearching(true);
    try {
      const startTime = performance.now();
      
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: customPrompt.replace('{documentId}', uploadedDocument.id),
          tools: selectedTools,
          pattern: selectedPattern,
          parallelAgents: selectedPattern === 'parallel' ? parallelCount : 1,
          strategy: selectedPattern === 'parallel' ? strategy : undefined
        })
      });
      
      const data = await response.json();
      const totalTime = performance.now() - startTime;
      
      // Store the full experiment result for learning
      setSearchResults(prev => [...prev, {
        type: selectedPattern as 'single' | 'parallel',
        results: data.toolResults || {},
        processingTimeMs: totalTime,
        experimentData: {
          prompt: customPrompt,
          tools: selectedTools,
          pattern: selectedPattern,
          parallelCount: selectedPattern === 'parallel' ? parallelCount : 1,
          strategy: selectedPattern === 'parallel' ? strategy : undefined,
          fullResponse: data,
          timestamp: new Date().toISOString()
        }
      }]);
      
    } catch (error) {
      console.error('Experiment failed:', error);
      alert('Experiment failed. Check console for details.');
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Agent Experimentation Sandbox</h1>
        <p className="text-gray-400">Learn how to prompt agents and explore parallel processing patterns</p>
      </div>

      {/* Learning Tips */}
      <div className="bg-blue-900/20 border border-blue-400/30 rounded-lg p-4">
        <h3 className="text-blue-300 font-semibold mb-2">🧠 Learning Tips</h3>
        <ul className="text-sm text-blue-200 space-y-1">
          <li>• <strong>Start simple:</strong> Try single agent with basic search prompts</li>
          <li>• <strong>Compare patterns:</strong> Run same prompt with single vs parallel to see differences</li>
          <li>• <strong>Experiment with tools:</strong> Different tools (search_document vs search_single_word) have different behaviors</li>
          <li>• <strong>Parallel strategies:</strong> "decompose" breaks tasks intelligently, "power" duplicates work, "perspectives" adds viewpoints</li>
          <li>• <strong>Watch the console:</strong> Full agent responses and errors show up there</li>
        </ul>
      </div>
      
      {/* Upload Section */}
      <div className="bg-slate-800 rounded-lg p-6">
        <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Document
        </h2>
        
        {!uploadedDocument ? (
          <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".txt,.pdf,.doc,.docx"
              onChange={handleFileUpload}
              disabled={isUploading}
              className="hidden"
              id="file-upload"
            />
            <label 
              htmlFor="file-upload" 
              className={`cursor-pointer flex flex-col items-center space-y-4 ${
                isUploading ? 'opacity-50' : 'hover:text-blue-400'
              }`}
            >
              <FileText className="w-12 h-12 text-gray-400" />
              <div>
                <p className="text-lg font-medium text-white">
                  {isUploading ? 'Uploading...' : 'Click to upload document'}
                </p>
                <p className="text-gray-400">Supports TXT, PDF, DOC, DOCX files</p>
              </div>
            </label>
          </div>
        ) : (
          <div className="bg-slate-700 rounded-lg p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-green-400" />
              <div>
                <p className="font-medium text-white">{uploadedDocument.filename}</p>
                <p className="text-sm text-gray-400">{uploadedDocument.wordCount.toLocaleString()} words</p>
              </div>
            </div>
            <div className="text-green-400">✓ Ready</div>
          </div>
        )}
      </div>
      
      {/* Agent Experimentation Sandbox */}
      {uploadedDocument && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Agent Experimentation Sandbox
          </h2>
          
          <div className="space-y-6">
            {/* Prompt Input */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Custom Prompt (use {'{documentId}'} as placeholder)
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                placeholder="Example: Search document {documentId} for the words 'married', 'drunk', and 'noxious'. Count each occurrence."
                className="w-full h-24 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-gray-400 focus:border-purple-400 focus:outline-none"
              />
            </div>

            {/* Tool Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Available Tools</label>
              <div className="flex gap-2 flex-wrap">
                {['search_document', 'search_single_word', 'upload_document'].map(tool => (
                  <button
                    key={tool}
                    onClick={() => {
                      if (selectedTools.includes(tool)) {
                        setSelectedTools(prev => prev.filter(t => t !== tool));
                      } else {
                        setSelectedTools(prev => [...prev, tool]);
                      }
                    }}
                    className={`px-3 py-1 rounded-md text-xs ${
                      selectedTools.includes(tool)
                        ? 'bg-purple-600 text-white'
                        : 'bg-slate-700 text-gray-300 hover:bg-slate-600'
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            </div>

            {/* Pattern & Parallel Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Execution Pattern</label>
                <select
                  value={selectedPattern}
                  onChange={(e) => setSelectedPattern(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="single">Single Agent</option>
                  <option value="parallel">Parallel Agents</option>
                </select>
              </div>

              {selectedPattern === 'parallel' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Agent Count</label>
                  <input
                    type="number"
                    value={parallelCount}
                    onChange={(e) => setParallelCount(parseInt(e.target.value) || 1)}
                    min="1"
                    max="10"
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {selectedPattern === 'parallel' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Parallel Strategy</label>
                <select
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:border-purple-400 focus:outline-none"
                >
                  <option value="decompose">Smart Decomposition</option>
                  <option value="perspectives">Multi-Perspective</option>
                  <option value="power">Raw Power</option>
                </select>
              </div>
            )}

            {/* Run Experiment Button */}
            <button
              onClick={runExperiment}
              disabled={isSearching || !customPrompt.trim()}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 px-6 py-3 rounded-lg font-medium text-white transition-colors"
            >
              {isSearching ? (
                <>
                  <Clock className="w-4 h-4 animate-spin" />
                  Running Experiment...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  Run Experiment
                </>
              )}
            </button>

            {/* Quick Examples */}
            <div className="pt-4 border-t border-slate-700">
              <p className="text-sm text-gray-400 mb-2">Quick Examples:</p>
              <div className="flex gap-2 flex-wrap">
                {[
                  'Search document {documentId} for "married", "drunk", "noxious"',
                  'Find all instances of "God" in document {documentId}',
                  'Count occurrences of character names in {documentId}',
                ].map((example, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCustomPrompt(example)}
                    className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-gray-300 rounded"
                  >
                    Example {idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Experiment Results */}
      {searchResults.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Experiment Results
          </h2>
          
          <div className="space-y-6">
            {searchResults.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                result.type === 'single' ? 'bg-blue-900/20 border-blue-400' : 'bg-purple-900/20 border-purple-400'
              }`}>
                {/* Experiment Header */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">
                    Experiment #{index + 1} - {result.type === 'single' ? 'Single Agent' : `Parallel (${(result as any).experimentData?.parallelCount || 'N/A'} agents)`}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{result.processingTimeMs.toFixed(1)}ms</span>
                  </div>
                </div>

                {/* Experiment Configuration */}
                {(result as any).experimentData && (
                  <div className="mb-4 p-3 bg-slate-700/30 rounded-lg">
                    <p className="text-xs text-gray-400 mb-2">Experiment Config:</p>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-gray-400">Tools:</span> <span className="text-white font-mono">{(result as any).experimentData.tools.join(', ')}</span></div>
                      <div><span className="text-gray-400">Pattern:</span> <span className="text-white font-mono">{(result as any).experimentData.pattern}</span></div>
                      {(result as any).experimentData.strategy && (
                        <div><span className="text-gray-400">Strategy:</span> <span className="text-white font-mono">{(result as any).experimentData.strategy}</span></div>
                      )}
                      <div><span className="text-gray-400">Timestamp:</span> <span className="text-white font-mono">{new Date((result as any).experimentData.timestamp).toLocaleTimeString()}</span></div>
                    </div>
                    <div className="mt-2">
                      <span className="text-gray-400 text-xs">Prompt:</span>
                      <p className="text-white text-sm font-mono bg-slate-800/50 p-2 rounded mt-1">"{(result as any).experimentData.prompt}"</p>
                    </div>
                  </div>
                )}
                
                {/* Results Display */}
                <div className="mb-3">
                  <p className="text-sm text-gray-400 mb-2">Raw Results:</p>
                  <pre className="text-xs bg-slate-900/50 p-3 rounded-lg text-gray-300 overflow-auto max-h-40">
                    {JSON.stringify(result.results, null, 2)}
                  </pre>
                </div>

                {/* Success/Error Status */}
                {(result as any).experimentData?.fullResponse && (
                  <div className="mt-3 pt-3 border-t border-slate-600">
                    <p className="text-sm text-gray-400 mb-2">Agent Response Status:</p>
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                      (result as any).experimentData.fullResponse.success 
                        ? 'bg-green-900/30 text-green-400 border border-green-400/30'
                        : 'bg-red-900/30 text-red-400 border border-red-400/30'
                    }`}>
                      {(result as any).experimentData.fullResponse.success ? '✓ Success' : '✗ Error'}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}