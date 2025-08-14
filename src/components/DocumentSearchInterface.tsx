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
  const [searchType, setSearchType] = useState<'single' | 'parallel'>('single');
  
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
  
  const runSingleAgentSearch = async () => {
    if (!uploadedDocument) return;
    
    setIsSearching(true);
    try {
      const response = await fetch('/api/search-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'multiple-words',
          documentId: uploadedDocument.id,
          searchTerms: ['married', 'drunk', 'noxious'],
          caseSensitive: false
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        setSearchResults(prev => [...prev, {
          type: 'single',
          results: result.results,
          processingTimeMs: result.processingTimeMs
        }]);
      } else {
        console.error('Single agent search failed:', result.message);
        alert('Search failed: ' + result.message);
      }
    } catch (error) {
      console.error('Single agent search failed:', error);
      alert('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  const runParallelAgentSearch = async () => {
    if (!uploadedDocument) return;
    
    setIsSearching(true);
    try {
      const startTime = performance.now();
      
      // Run 3 search requests in parallel - one for each word
      const searchPromises = ['married', 'drunk', 'noxious'].map(word => 
        fetch('/api/search-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'single-word',
            documentId: uploadedDocument.id,
            word: word,
            caseSensitive: false
          })
        }).then(response => response.json())
      );
      
      const results = await Promise.all(searchPromises);
      const totalTime = performance.now() - startTime;
      
      // Check if all searches succeeded
      const successfulResults = results.filter(result => result.success);
      if (successfulResults.length === results.length) {
        const agentDetails = successfulResults.map((result: any) => ({
          word: result.word,
          count: result.count,
          processingTimeMs: result.processingTimeMs,
          agentId: result.agentId
        }));
        
        const combinedResults: Record<string, number> = {};
        successfulResults.forEach((result: any) => {
          combinedResults[result.word] = result.count;
        });
        
        setSearchResults(prev => [...prev, {
          type: 'parallel',
          results: combinedResults,
          processingTimeMs: totalTime,
          agentDetails
        }]);
      } else {
        console.error('Some parallel searches failed');
        alert('Some searches failed. Please try again.');
      }
    } catch (error) {
      console.error('Parallel agent search failed:', error);
      alert('Parallel search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">Document Search Performance Test</h1>
        <p className="text-gray-400">Compare single vs parallel agent search performance</p>
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
      
      {/* Search Controls */}
      {uploadedDocument && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            Search Performance Test
          </h2>
          
          <div className="space-y-4">
            <p className="text-gray-300">
              Search for: <span className="font-mono bg-slate-700 px-2 py-1 rounded">"married"</span>, {' '}
              <span className="font-mono bg-slate-700 px-2 py-1 rounded">"drunk"</span>, {' '}
              <span className="font-mono bg-slate-700 px-2 py-1 rounded">"noxious"</span>
            </p>
            
            <div className="flex gap-4">
              <button
                onClick={runSingleAgentSearch}
                disabled={isSearching}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-600/50 px-6 py-3 rounded-lg font-medium text-white transition-colors"
              >
                <Users className="w-4 h-4" />
                Single Agent Search
              </button>
              
              <button
                onClick={runParallelAgentSearch}
                disabled={isSearching}
                className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 px-6 py-3 rounded-lg font-medium text-white transition-colors"
              >
                <Zap className="w-4 h-4" />
                Parallel Agent Search (3 agents)
              </button>
            </div>
            
            {isSearching && (
              <div className="text-center text-blue-400">
                <Clock className="w-4 h-4 inline animate-spin mr-2" />
                Searching...
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Results */}
      {searchResults.length > 0 && (
        <div className="bg-slate-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            Search Results
          </h2>
          
          <div className="space-y-4">
            {searchResults.map((result, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${
                result.type === 'single' ? 'bg-blue-900/20 border-blue-400' : 'bg-purple-900/20 border-purple-400'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-white">
                    {result.type === 'single' ? 'Single Agent' : 'Parallel Agents (3)'}
                  </h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4" />
                    <span className="font-mono">{result.processingTimeMs.toFixed(1)}ms</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 mb-3">
                  {Object.entries(result.results).map(([word, count]) => (
                    <div key={word} className="text-center">
                      <div className="font-mono text-lg font-bold text-white">{count}</div>
                      <div className="text-sm text-gray-400">"{word}"</div>
                    </div>
                  ))}
                </div>
                
                {result.agentDetails && (
                  <div className="mt-3 pt-3 border-t border-gray-600">
                    <p className="text-sm text-gray-400 mb-2">Agent Details:</p>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      {result.agentDetails.map((agent, idx) => (
                        <div key={idx} className="bg-slate-700/50 p-2 rounded">
                          <div className="font-mono text-purple-300">Agent {idx + 1}</div>
                          <div className="text-gray-300">"{agent.word}": {agent.count}</div>
                          <div className="text-gray-400">{agent.processingTimeMs.toFixed(1)}ms</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
            
            {searchResults.length >= 2 && (
              <div className="mt-4 p-4 bg-green-900/20 border border-green-400 rounded-lg">
                <h4 className="font-semibold text-green-400 mb-2">Performance Comparison</h4>
                {(() => {
                  const singleResult = searchResults.find(r => r.type === 'single');
                  const parallelResult = searchResults.find(r => r.type === 'parallel');
                  
                  if (singleResult && parallelResult) {
                    const speedup = (singleResult.processingTimeMs / parallelResult.processingTimeMs).toFixed(2);
                    const improvement = (((singleResult.processingTimeMs - parallelResult.processingTimeMs) / singleResult.processingTimeMs) * 100).toFixed(1);
                    
                    return (
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-300">Speedup: </span>
                          <span className="font-mono font-bold text-green-400">{speedup}x faster</span>
                        </div>
                        <div>
                          <span className="text-gray-300">Improvement: </span>
                          <span className="font-mono font-bold text-green-400">{improvement}% reduction</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}