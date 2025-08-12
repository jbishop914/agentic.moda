'use client';

import { useState, useEffect } from 'react';
import { 
  Play, 
  Bot,
  GitBranch,
  Sparkles,
  Code,
  MessageSquare,
  Activity,
  ChevronRight,
  Circle,
  CheckCircle2,
  AlertCircle,
  Layers,
  Cpu,
  Network
} from 'lucide-react';

export default function Home() {
  const [activeView, setActiveView] = useState('orchestrate');
  const [isExecuting, setIsExecuting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('simple');
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);

  const patterns = {
    simple: {
      name: 'Single Agent',
      description: 'Direct response',
      icon: <MessageSquare className="w-3.5 h-3.5" />,
      color: 'slate'
    },
    parallel: {
      name: 'Parallel Execution',
      description: 'Simultaneous processing',
      icon: <Network className="w-3.5 h-3.5" />,
      color: 'slate'
    },
    feedback: {
      name: 'Iterative Refinement',
      description: 'Quality through iteration',
      icon: <Sparkles className="w-3.5 h-3.5" />,
      color: 'blue'
    },
    structured: {
      name: 'Structured Output',
      description: 'Type-safe responses',
      icon: <Code className="w-3.5 h-3.5" />,
      color: 'slate'
    },
  };

  const executeOrchestration = async () => {
    setIsExecuting(true);
    setOutput('');
    setError('');
    setExecutionSteps([]);
    setStreamingText('Initializing agents...');

    try {
      // Simulate execution steps
      const steps = [
        { id: 1, name: 'Initialize', status: 'active', duration: null },
      ];
      setExecutionSteps(steps);

      await new Promise(resolve => setTimeout(resolve, 500));
      
      steps[0].status = 'completed';
      steps[0].duration = '0.5s';
      steps.push({ id: 2, name: 'Process', status: 'active', duration: null });
      setExecutionSteps([...steps]);
      setStreamingText('Processing request...');

      // Call API
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, pattern: selectedPattern }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      steps[1].status = 'completed';
      steps[1].duration = '1.2s';
      steps.push({ id: 3, name: 'Synthesize', status: 'completed', duration: '0.3s' });
      setExecutionSteps([...steps]);

      // Simulate streaming output
      const fullOutput = data.result?.output || 'Process completed successfully.';
      let currentOutput = '';
      
      for (let i = 0; i < fullOutput.length; i += 3) {
        currentOutput += fullOutput.slice(i, i + 3);
        setOutput(currentOutput);
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      
      setStreamingText('');
    } catch (err: any) {
      setError(err.message);
      setStreamingText('');
      
      if (err.message.includes('API key')) {
        setError('Configuration required: Add OPENAI_API_KEY to .env.local');
      }
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      {/* Header */}
      <header className="border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-8">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center">
                  <Layers className="w-4 h-4 text-slate-200" />
                </div>
                <span className="text-sm font-medium text-slate-300">agentic.moda</span>
              </div>

              {/* Nav */}
              <nav className="flex items-center gap-1">
                {['orchestrate', 'agents', 'workflows'].map((view) => (
                  <button
                    key={view}
                    onClick={() => setActiveView(view)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      activeView === view
                        ? 'text-slate-200 bg-slate-800/50'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </nav>
            </div>

            {/* Status */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/30 border border-slate-700/50">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft" />
                <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">Connected</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeView === 'orchestrate' && (
          <div className="grid grid-cols-12 gap-6">
            {/* Sidebar */}
            <div className="col-span-3 space-y-4">
              {/* Pattern Selection */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Execution Pattern
                </h3>
                <div className="space-y-2">
                  {Object.entries(patterns).map(([key, pattern]) => (
                    <button
                      key={key}
                      onClick={() => setSelectedPattern(key)}
                      className={`w-full px-3 py-2.5 rounded-md transition-all duration-200 flex items-start gap-2.5 group ${
                        selectedPattern === key
                          ? 'bg-slate-800/50 border border-slate-700/50'
                          : 'hover:bg-slate-800/30 border border-transparent'
                      }`}
                    >
                      <div className={`mt-0.5 ${
                        selectedPattern === key ? 'text-slate-400' : 'text-slate-600 group-hover:text-slate-500'
                      }`}>
                        {pattern.icon}
                      </div>
                      <div className="text-left">
                        <div className={`text-xs font-medium ${
                          selectedPattern === key ? 'text-slate-200' : 'text-slate-400 group-hover:text-slate-300'
                        }`}>
                          {pattern.name}
                        </div>
                        <div className="text-[10px] text-slate-600 mt-0.5">
                          {pattern.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Execution Steps */}
              {executionSteps.length > 0 && (
                <div className="glass rounded-lg p-4 animate-slide-up">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                    Execution Pipeline
                  </h3>
                  <div className="space-y-2">
                    {executionSteps.map((step, index) => (
                      <div key={step.id} className="flex items-center gap-2 text-xs">
                        <div className="flex items-center gap-2 flex-1">
                          {step.status === 'completed' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          ) : step.status === 'active' ? (
                            <Circle className="w-3 h-3 text-blue-500 animate-pulse" />
                          ) : (
                            <Circle className="w-3 h-3 text-slate-600" />
                          )}
                          <span className={
                            step.status === 'completed' ? 'text-slate-400' :
                            step.status === 'active' ? 'text-slate-200' :
                            'text-slate-600'
                          }>
                            {step.name}
                          </span>
                        </div>
                        {step.duration && (
                          <span className="text-[10px] text-slate-600">{step.duration}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Metrics */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Performance
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Latency</span>
                    <span className="text-xs font-medium text-slate-400">1.8s</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Tokens</span>
                    <span className="text-xs font-medium text-slate-400">1,247</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500">Cost</span>
                    <span className="text-xs font-medium text-slate-400">$0.03</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-span-9 space-y-4">
              {/* Error State */}
              {error && (
                <div className="glass rounded-lg p-3 border-l-2 border-red-500/50 animate-slide-up">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />
                    <div className="text-xs text-red-300">{error}</div>
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Input Prompt
                  </h3>
                  {streamingText && (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="loading-dot"></span>
                        <span className="loading-dot"></span>
                        <span className="loading-dot"></span>
                      </div>
                      <span className="text-[10px] text-slate-500">{streamingText}</span>
                    </div>
                  )}
                </div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe what you want to accomplish..."
                  className="w-full h-24 p-3 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300 placeholder-slate-600 resize-none focus-ring"
                  style={{ fontFamily: 'Monaco, monospace' }}
                />
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-slate-600">
                      Pattern: {patterns[selectedPattern as keyof typeof patterns].name}
                    </span>
                    <span className="text-[10px] text-slate-700">•</span>
                    <span className="text-[10px] text-slate-600">
                      Model: GPT-4 Turbo
                    </span>
                  </div>
                  <button
                    onClick={executeOrchestration}
                    disabled={isExecuting || !prompt.trim()}
                    className={`px-4 py-1.5 rounded-md text-xs font-medium transition-all duration-200 flex items-center gap-2 ${
                      isExecuting || !prompt.trim()
                        ? 'bg-slate-800/30 text-slate-600 cursor-not-allowed'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-100'
                    }`}
                  >
                    {isExecuting ? (
                      <>
                        <Activity className="w-3 h-3 animate-pulse" />
                        <span>Executing</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3 h-3" />
                        <span>Execute</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Output */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Output Stream
                </h3>
                <div 
                  className="bg-slate-900/50 border border-slate-800/50 rounded-md p-4 h-64 overflow-y-auto"
                  style={{ fontFamily: 'Monaco, monospace' }}
                >
                  {output ? (
                    <pre className="text-xs text-slate-400 whitespace-pre-wrap animate-fade-in">
                      {output}
                    </pre>
                  ) : (
                    <div className="text-xs text-slate-700">
                      Awaiting execution...
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'agents' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-lg font-light text-slate-300 mb-1">Agent Registry</h2>
              <p className="text-xs text-slate-600">Specialized agents for orchestration pipelines</p>
            </div>

            <div className="grid grid-cols-4 gap-4">
              {[
                { name: 'Analyzer', specialty: 'Data analysis', model: 'GPT-4', status: 'active' },
                { name: 'Synthesizer', specialty: 'Information synthesis', model: 'GPT-4', status: 'active' },
                { name: 'Validator', specialty: 'Quality assurance', model: 'GPT-3.5', status: 'idle' },
                { name: 'Transformer', specialty: 'Content transformation', model: 'GPT-4', status: 'active' },
                { name: 'Researcher', specialty: 'Deep research', model: 'GPT-4', status: 'idle' },
                { name: 'Architect', specialty: 'System design', model: 'GPT-4', status: 'active' },
              ].map((agent, i) => (
                <div 
                  key={i} 
                  className="glass glass-hover rounded-lg p-4 cursor-pointer card-hover group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-8 h-8 rounded-md bg-slate-800/50 flex items-center justify-center">
                      <Cpu className="w-4 h-4 text-slate-500 group-hover:text-slate-400 transition-colors" />
                    </div>
                    <div className={`w-1.5 h-1.5 rounded-full ${
                      agent.status === 'active' ? 'bg-emerald-500' : 'bg-slate-600'
                    }`} />
                  </div>
                  <h3 className="text-xs font-medium text-slate-300 mb-1">{agent.name}</h3>
                  <p className="text-[10px] text-slate-600 mb-2">{agent.specialty}</p>
                  <div className="text-[10px] text-slate-700">Model: {agent.model}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeView === 'workflows' && (
          <div className="animate-fade-in">
            <div className="mb-6">
              <h2 className="text-lg font-light text-slate-300 mb-1">Workflow Templates</h2>
              <p className="text-xs text-slate-600">Pre-configured orchestration patterns</p>
            </div>

            <div className="space-y-3">
              {[
                {
                  name: 'Research & Analysis Pipeline',
                  description: 'Multi-stage information processing with validation',
                  stages: ['Gather', 'Analyze', 'Validate', 'Report'],
                  complexity: 'Medium',
                  duration: '2-3m',
                },
                {
                  name: 'Content Generation System',
                  description: 'Iterative content creation with quality gates',
                  stages: ['Research', 'Draft', 'Review', 'Polish', 'Publish'],
                  complexity: 'High',
                  duration: '3-5m',
                },
                {
                  name: 'Code Review Workflow',
                  description: 'Automated code analysis and improvement suggestions',
                  stages: ['Parse', 'Analyze', 'Security', 'Optimize'],
                  complexity: 'High',
                  duration: '1-2m',
                },
              ].map((workflow, i) => (
                <div key={i} className="glass glass-hover rounded-lg p-5 group cursor-pointer">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-slate-200 mb-1 group-hover:text-slate-100 transition-colors">
                        {workflow.name}
                      </h3>
                      <p className="text-xs text-slate-500 mb-3">{workflow.description}</p>
                      
                      <div className="flex items-center gap-4 mb-3">
                        <div className="flex items-center gap-1">
                          {workflow.stages.map((stage, idx) => (
                            <div key={idx} className="flex items-center">
                              <span className="text-[10px] text-slate-600">{stage}</span>
                              {idx < workflow.stages.length - 1 && (
                                <ChevronRight className="w-3 h-3 text-slate-700 mx-1" />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] text-slate-600">
                        <span>Complexity: {workflow.complexity}</span>
                        <span>•</span>
                        <span>Duration: {workflow.duration}</span>
                      </div>
                    </div>
                    
                    <button className="px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 hover:text-slate-300 text-xs font-medium rounded-md transition-all duration-200 opacity-0 group-hover:opacity-100">
                      Deploy
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}