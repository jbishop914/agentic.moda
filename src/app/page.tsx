'use client';

import { useState, useEffect, useRef } from 'react';
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
  Network,
  Save,
  Download,
  Settings2,
  MessagesSquare,
  Wrench,
  Plus,
  Minus,
  User,
  LogIn,
  Hash
} from 'lucide-react';

// Tool definitions with real functionality
const AVAILABLE_TOOLS = [
  { 
    id: 'api_call', 
    name: 'API Calling', 
    description: 'Make HTTP requests to any API',
    icon: '🌐'
  },
  { 
    id: 'web_scrape', 
    name: 'Web Scraping', 
    description: 'Extract content from websites',
    icon: '🕷️'
  },
  { 
    id: 'database_query', 
    name: 'Database Query', 
    description: 'Query SQL databases',
    icon: '🗄️'
  },
  { 
    id: 'calculate', 
    name: 'Calculator', 
    description: 'Math and statistical analysis',
    icon: '🧮'
  },
  { 
    id: 'file_operations', 
    name: 'File Operations', 
    description: 'Read/write files',
    icon: '📁'
  },
  { 
    id: 'transform_data', 
    name: 'Data Transform', 
    description: 'Convert between formats (JSON, CSV, etc)',
    icon: '🔄'
  },
];

export default function Home() {
  const [activeView, setActiveView] = useState('orchestrate');
  const [isExecuting, setIsExecuting] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful AI assistant with expertise in analysis and problem-solving.');
  const [output, setOutput] = useState('');
  const [selectedPattern, setSelectedPattern] = useState('simple');
  const [error, setError] = useState('');
  const [streamingText, setStreamingText] = useState('');
  const [executionSteps, setExecutionSteps] = useState<any[]>([]);
  
  // New features state
  const [parallelAgents, setParallelAgents] = useState(1);
  const [conversationMode, setConversationMode] = useState(false);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: string, content: string}>>([]);
  const [conversationInput, setConversationInput] = useState('');
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [parallelStrategy, setParallelStrategy] = useState('decompose');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  
  const outputRef = useRef<HTMLDivElement>(null);

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
    setError('');
    setExecutionSteps([]);
    setStreamingText('Initializing agents...');

    try {
      // Build conversation context if in conversation mode
      const messages = conversationMode ? conversationHistory : [];
      
      // Simulate execution steps for parallel agents
      interface ExecutionStep {
        id: number;
        name: string;
        status: 'active' | 'completed' | 'pending';
        duration: string | null;
      }
      
      const steps: ExecutionStep[] = [];
      if (selectedPattern === 'parallel' && parallelAgents > 1) {
        for (let i = 1; i <= parallelAgents; i++) {
          steps.push({ 
            id: i, 
            name: `Agent ${i}`, 
            status: 'active', 
            duration: null 
          });
        }
      } else {
        steps.push({ id: 1, name: 'Initialize', status: 'active', duration: null });
      }
      setExecutionSteps(steps);

      // Call API with enhanced parameters
      const response = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt, 
          pattern: selectedPattern,
          systemPrompt,
          parallelAgents,
          strategy: parallelStrategy,
          tools: selectedTools,
          conversationHistory: messages
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Execution failed');
      }

      // Update execution steps
      steps.forEach((step, idx) => {
        setTimeout(() => {
          step.status = 'completed';
          step.duration = `${(Math.random() * 2 + 0.5).toFixed(1)}s`;
          setExecutionSteps([...steps]);
        }, (idx + 1) * 500);
      });

      // Handle output
      const fullOutput = data.result?.output || 'Process completed successfully.';
      
      if (conversationMode) {
        // Add to conversation history
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', content: prompt },
          { role: 'assistant', content: fullOutput }
        ]);
      }
      
      // Simulate streaming
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
    } finally {
      setIsExecuting(false);
    }
  };

  const savePrompt = () => {
    if (!prompt) return;
    const saved = {
      prompt,
      systemPrompt,
      pattern: selectedPattern,
      tools: selectedTools,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`prompt_${Date.now()}`, JSON.stringify(saved));
    // Show toast notification
    setStreamingText('Prompt saved!');
    setTimeout(() => setStreamingText(''), 2000);
  };

  const saveOutput = () => {
    if (!output) return;
    const saved = {
      output,
      prompt,
      pattern: selectedPattern,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem(`output_${Date.now()}`, JSON.stringify(saved));
    // Show toast notification
    setStreamingText('Output saved!');
    setTimeout(() => setStreamingText(''), 2000);
  };

  const toggleTool = (toolId: string) => {
    setSelectedTools(prev => 
      prev.includes(toolId) 
        ? prev.filter(id => id !== toolId)
        : [...prev, toolId]
    );
  };

  const sendConversationMessage = async () => {
    if (!conversationInput.trim()) return;
    
    // Add user message to history
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: conversationInput }
    ];
    setConversationHistory(newHistory);
    setConversationInput('');
    
    // Execute with conversation context
    setPrompt(conversationInput);
    await executeOrchestration();
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

            {/* User Status */}
            <div className="flex items-center gap-3">
              {isLoggedIn ? (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/30 border border-slate-700/50">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs text-slate-400">{userEmail}</span>
                </div>
              ) : (
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition-all">
                  <LogIn className="w-3.5 h-3.5" />
                  Sign In
                </button>
              )}
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

              {/* Parallel Agents Control */}
              {selectedPattern === 'parallel' && (
                <div className="glass rounded-lg p-4 animate-slide-up">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                    Parallel Configuration
                  </h3>
                  
                  {/* Agent Count */}
                  <div className="mb-4">
                    <label className="text-[10px] text-slate-600 mb-2 block">Number of Agents</label>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setParallelAgents(Math.max(1, parallelAgents - 1))}
                        className="p-1.5 rounded-md bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 transition-all"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <div className="flex-1 text-center">
                        <div className="text-xl font-light text-slate-200">{parallelAgents}</div>
                      </div>
                      <button
                        onClick={() => setParallelAgents(Math.min(10, parallelAgents + 1))}
                        className="p-1.5 rounded-md bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 transition-all"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Strategy Selection */}
                  <div>
                    <label className="text-[10px] text-slate-600 mb-2 block">Execution Strategy</label>
                    <div className="space-y-2">
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          value="decompose"
                          checked={parallelStrategy === 'decompose'}
                          onChange={(e) => setParallelStrategy(e.target.value)}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <div className="text-xs text-slate-400 group-hover:text-slate-300">Task Decomposition</div>
                          <div className="text-[10px] text-slate-600">Smart breakdown into subtasks</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          value="perspectives"
                          checked={parallelStrategy === 'perspectives'}
                          onChange={(e) => setParallelStrategy(e.target.value)}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <div className="text-xs text-slate-400 group-hover:text-slate-300">Multi-Perspective</div>
                          <div className="text-[10px] text-slate-600">Different viewpoints</div>
                        </div>
                      </label>
                      <label className="flex items-start gap-2 cursor-pointer group">
                        <input
                          type="radio"
                          value="power"
                          checked={parallelStrategy === 'power'}
                          onChange={(e) => setParallelStrategy(e.target.value)}
                          className="mt-0.5 text-slate-400"
                        />
                        <div>
                          <div className="text-xs text-slate-400 group-hover:text-slate-300">Raw Power</div>
                          <div className="text-[10px] text-slate-600">Maximum throughput</div>
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Tools Selection */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Available Tools
                </h3>
                <div className="space-y-2">
                  {AVAILABLE_TOOLS.map(tool => (
                    <label
                      key={tool.id}
                      className="flex items-start gap-2 cursor-pointer group"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTools.includes(tool.id)}
                        onChange={() => toggleTool(tool.id)}
                        className="mt-0.5 w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-slate-400 focus:ring-slate-600 focus:ring-offset-0"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{tool.icon}</span>
                          <div className="text-xs text-slate-400 group-hover:text-slate-300">
                            {tool.name}
                          </div>
                        </div>
                        <div className="text-[10px] text-slate-600 ml-7">
                          {tool.description}
                        </div>
                      </div>
                    </label>
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

              {/* System Prompt Configuration */}
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Configuration
                  </h3>
                  <button
                    onClick={() => setShowSystemPrompt(!showSystemPrompt)}
                    className="p-1.5 rounded-md hover:bg-slate-800/50 text-slate-500 hover:text-slate-400 transition-all"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                {showSystemPrompt && (
                  <div className="space-y-3 animate-slide-up">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                        System Prompt
                      </label>
                      <textarea
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        className="mt-1 w-full h-20 p-3 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300 placeholder-slate-600 resize-none focus-ring"
                        style={{ fontFamily: 'Monaco, monospace' }}
                      />
                    </div>
                    
                    {selectedPattern === 'parallel' && (
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Hash className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-xs text-slate-500">Parallel Agents:</span>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={parallelAgents}
                            onChange={(e) => setParallelAgents(parseInt(e.target.value) || 1)}
                            className="w-12 px-2 py-1 bg-slate-800/50 border border-slate-700/50 rounded text-xs text-slate-300 text-center"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="glass rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Input Prompt
                  </h3>
                  <div className="flex items-center gap-2">
                    {prompt && (
                      <button
                        onClick={savePrompt}
                        className="p-1.5 rounded-md hover:bg-slate-800/50 text-slate-500 hover:text-slate-400 transition-all"
                        title="Save prompt"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                    )}
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
                    {selectedPattern === 'parallel' && (
                      <>
                        <span className="text-[10px] text-slate-700">•</span>
                        <span className="text-[10px] text-slate-600">
                          {parallelAgents} agents
                        </span>
                      </>
                    )}
                    {selectedTools.length > 0 && (
                      <>
                        <span className="text-[10px] text-slate-700">•</span>
                        <span className="text-[10px] text-slate-600">
                          {selectedTools.length} tools
                        </span>
                      </>
                    )}
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
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                    Output Stream
                  </h3>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={conversationMode}
                        onChange={(e) => setConversationMode(e.target.checked)}
                        className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-slate-400 focus:ring-slate-600"
                      />
                      <span className="text-xs text-slate-500">Conversation</span>
                    </label>
                    {output && (
                      <button
                        onClick={saveOutput}
                        className="p-1.5 rounded-md hover:bg-slate-800/50 text-slate-500 hover:text-slate-400 transition-all"
                        title="Save output"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div 
                  ref={outputRef}
                  className="bg-slate-900/50 border border-slate-800/50 rounded-md p-4 h-64 overflow-y-auto"
                  style={{ fontFamily: 'Monaco, monospace' }}
                >
                  {conversationMode && conversationHistory.length > 0 ? (
                    <div className="space-y-3">
                      {conversationHistory.map((msg, idx) => (
                        <div key={idx} className="animate-fade-in">
                          <div className="text-[10px] font-medium text-slate-600 uppercase mb-1">
                            {msg.role}
                          </div>
                          <div className="text-xs text-slate-400">
                            {msg.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : output ? (
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

              {/* Conversation Input */}
              {conversationMode && (
                <div className="glass rounded-lg p-4 animate-slide-up">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">
                      Continue Conversation
                    </h3>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={conversationInput}
                      onChange={(e) => setConversationInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && sendConversationMessage()}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300 placeholder-slate-600 focus-ring"
                    />
                    <button
                      onClick={sendConversationMessage}
                      disabled={!conversationInput.trim() || isExecuting}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-800/30 text-slate-100 disabled:text-slate-600 rounded-md text-xs font-medium transition-all"
                    >
                      Send
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}