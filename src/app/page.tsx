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
  Hash,
  Image,
  Github,
  Home as HomeIcon,
  Palette,
  FileText,
  Brain,
  Camera,
  Building,
  PenTool,
  Search,
  Users,
  Briefcase
} from 'lucide-react';
import WorkflowBuilder from '@/components/WorkflowBuilder';

// Tool definitions with real functionality
const AVAILABLE_TOOLS = [
  { 
    id: 'api_call', 
    name: 'API Calling', 
    description: 'Make HTTP requests to any API',
    icon: '🌐',
    category: 'integration'
  },
  { 
    id: 'web_scrape', 
    name: 'Web Scraping', 
    description: 'Extract content from websites',
    icon: '🕷️',
    category: 'integration'
  },
  { 
    id: 'database_query', 
    name: 'Database Query', 
    description: 'Query SQL databases',
    icon: '🗄️',
    category: 'data'
  },
  { 
    id: 'calculate', 
    name: 'Calculator', 
    description: 'Math and statistical analysis',
    icon: '🧮',
    category: 'data'
  },
  { 
    id: 'file_operations', 
    name: 'File Operations', 
    description: 'Read/write files',
    icon: '📁',
    category: 'data'
  },
  { 
    id: 'transform_data', 
    name: 'Data Transform', 
    description: 'Convert between formats (JSON, CSV, etc)',
    icon: '🔄',
    category: 'data'
  },
  // New GitHub tools
  { 
    id: 'github_create_repo', 
    name: 'Create Repository', 
    description: 'Create a new GitHub repository',
    icon: '📦',
    category: 'github'
  },
  { 
    id: 'github_create_files', 
    name: 'Create Files', 
    description: 'Add files to GitHub repository',
    icon: '📝',
    category: 'github'
  },
  { 
    id: 'github_create_app', 
    name: 'Build Full App', 
    description: 'Create complete application in GitHub',
    icon: '🚀',
    category: 'github'
  },
  // New Image tools
  { 
    id: 'generate_image', 
    name: 'Generate Image', 
    description: 'Create AI-generated images',
    icon: '🎨',
    category: 'creative'
  },
  { 
    id: 'edit_image', 
    name: 'Edit Image', 
    description: 'Transform and edit images',
    icon: '✏️',
    category: 'creative'
  },
  { 
    id: 'analyze_image', 
    name: 'Analyze Image', 
    description: 'Extract information from images',
    icon: '🔍',
    category: 'creative'
  },
];

// Specialized agent types
const SPECIALIZED_AGENTS = [
  {
    id: 'designer',
    name: 'Designer',
    icon: <Palette className="w-4 h-4" />,
    description: 'UI/UX design, mood boards, design systems',
    capabilities: ['Create Design Systems', 'Generate UI Components', 'Create Mood Boards', 'Review Designs']
  },
  {
    id: 'developer',
    name: 'Developer',
    icon: <Code className="w-4 h-4" />,
    description: 'Build applications, review code, write tests',
    capabilities: ['Create Applications', 'Review Code', 'Generate Tests', 'Optimize Performance']
  },
  {
    id: 'writer',
    name: 'Writer',
    icon: <FileText className="w-4 h-4" />,
    description: 'Content creation, documentation, marketing copy',
    capabilities: ['Blog Posts', 'Documentation', 'Marketing Copy', 'Email Campaigns']
  },
  {
    id: 'researcher',
    name: 'Researcher',
    icon: <Search className="w-4 h-4" />,
    description: 'Market research, data analysis, trend analysis',
    capabilities: ['Research Topics', 'Compare Options', 'Analyze Trends', 'Fact Checking']
  },
  {
    id: 'architect',
    name: 'Architect',
    icon: <Building className="w-4 h-4" />,
    description: 'Building design from vision to 3D renders',
    capabilities: ['Parse Vision', 'Generate Floorplans', 'Create 3D Renders', 'Technical Specs']
  },
  {
    id: 'project-manager',
    name: 'Project Manager',
    icon: <Briefcase className="w-4 h-4" />,
    description: 'Project planning, estimation, team coordination',
    capabilities: ['Project Plans', 'Sprint Planning', 'Risk Assessment', 'Resource Planning']
  }
];

export default function Home() {
  const [activeView, setActiveView] = useState('orchestrate');
  const [activeSubView, setActiveSubView] = useState('playground'); // For sub-navigation
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
  
  // Architecture pipeline state
  const [architectureVision, setArchitectureVision] = useState('');
  const [architectureSpec, setArchitectureSpec] = useState<any>(null);
  const [architectureImages, setArchitectureImages] = useState<{
    floorplan?: string;
    exterior?: string;
    interior?: string;
    aerial?: string;
  }>({});
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [imagePrompt, setImagePrompt] = useState('');
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  
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

  const executeArchitecturePipeline = async () => {
    if (!architectureVision.trim()) return;
    
    setIsExecuting(true);
    setStreamingText('Step 1: Parsing architectural vision...');
    
    try {
      // Step 1: Parse vision to JSON
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate API call
      const spec = {
        project: {
          name: 'Modern Home',
          type: 'residential',
          style: 'modern',
          totalSquareFeet: 2000,
          stories: 2
        },
        rooms: [
          { name: 'Living Room', type: 'living_room', area: 400 },
          { name: 'Kitchen', type: 'kitchen', area: 350 },
          { name: 'Master Bedroom', type: 'bedroom', area: 300 },
          { name: 'Bedroom 2', type: 'bedroom', area: 200 },
          { name: 'Bedroom 3', type: 'bedroom', area: 200 },
          { name: 'Home Office', type: 'office', area: 150 },
        ]
      };
      setArchitectureSpec(spec);
      
      setStreamingText('Step 2: Generating floorplan...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStreamingText('Step 3: Creating 3D renders...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulate generated images
      setArchitectureImages({
        floorplan: '/api/placeholder/1024/1024',
        exterior: '/api/placeholder/1920/1080',
        interior: '/api/placeholder/1920/1080',
        aerial: '/api/placeholder/1920/1080',
      });
      
      setStreamingText('Complete! Your architectural design is ready.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
      setTimeout(() => setStreamingText(''), 3000);
    }
  };

  const executeImageGeneration = async () => {
    if (!imagePrompt.trim()) return;
    
    setIsExecuting(true);
    setStreamingText('Generating images...');
    
    try {
      // Simulate image generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Add placeholder images
      const newImages = [
        '/api/placeholder/512/512',
        '/api/placeholder/512/512',
        '/api/placeholder/512/512',
        '/api/placeholder/512/512',
      ];
      
      setGeneratedImages(prev => [...prev, ...newImages]);
      setStreamingText('Images generated successfully!');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsExecuting(false);
      setTimeout(() => setStreamingText(''), 3000);
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
    
    const newHistory = [
      ...conversationHistory,
      { role: 'user', content: conversationInput }
    ];
    setConversationHistory(newHistory);
    setConversationInput('');
    
    setPrompt(conversationInput);
    await executeOrchestration();
  };

  // Group tools by category
  const toolsByCategory = AVAILABLE_TOOLS.reduce((acc, tool) => {
    if (!acc[tool.category]) acc[tool.category] = [];
    acc[tool.category].push(tool);
    return acc;
  }, {} as Record<string, typeof AVAILABLE_TOOLS>);

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

              {/* Main Nav */}
              <nav className="flex items-center gap-1">
                {['orchestrate', 'agents', 'creative', 'workflows', 'architecture'].map((view) => (
                  <button
                    key={view}
                    onClick={() => {
                      setActiveView(view);
                      setActiveSubView(view === 'orchestrate' ? 'playground' : '');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200 ${
                      activeView === view
                        ? 'text-slate-200 bg-slate-800/50'
                        : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                    }`}
                  >
                    {view === 'architecture' ? (
                      <span className="flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5" />
                        {view}
                      </span>
                    ) : view === 'creative' ? (
                      <span className="flex items-center gap-1.5">
                        <Image className="w-3.5 h-3.5" />
                        {view}
                      </span>
                    ) : (
                      view
                    )}
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

          {/* Sub-navigation for orchestrate view */}
          {activeView === 'orchestrate' && (
            <div className="mt-4 flex items-center gap-2">
              {['playground', 'visual-builder'].map((subView) => (
                <button
                  key={subView}
                  onClick={() => setActiveSubView(subView)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${
                    activeSubView === subView
                      ? 'bg-slate-700 text-slate-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/30'
                  }`}
                >
                  {subView === 'visual-builder' ? 'Visual Builder' : 'Playground'}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Orchestrate View */}
        {activeView === 'orchestrate' && activeSubView === 'playground' && (
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

              {/* Parallel Configuration (when parallel is selected) */}
              {selectedPattern === 'parallel' && (
                <div className="glass rounded-lg p-4 animate-slide-up">
                  <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                    Parallel Configuration
                  </h3>
                  
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

                  <div>
                    <label className="text-[10px] text-slate-600 mb-2 block">Execution Strategy</label>
                    <div className="space-y-2">
                      {[
                        { value: 'decompose', label: 'Task Decomposition', desc: 'Smart breakdown into subtasks' },
                        { value: 'perspectives', label: 'Multi-Perspective', desc: 'Different viewpoints' },
                        { value: 'power', label: 'Raw Power', desc: 'Maximum throughput' }
                      ].map(strategy => (
                        <label key={strategy.value} className="flex items-start gap-2 cursor-pointer group">
                          <input
                            type="radio"
                            value={strategy.value}
                            checked={parallelStrategy === strategy.value}
                            onChange={(e) => setParallelStrategy(e.target.value)}
                            className="mt-0.5 text-slate-400"
                          />
                          <div>
                            <div className="text-xs text-slate-400 group-hover:text-slate-300">{strategy.label}</div>
                            <div className="text-[10px] text-slate-600">{strategy.desc}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tools Selection */}
              <div className="glass rounded-lg p-4">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-3">
                  Available Tools
                </h3>
                <div className="space-y-3">
                  {Object.entries(toolsByCategory).map(([category, tools]) => (
                    <div key={category}>
                      <div className="text-[10px] text-slate-600 uppercase mb-1">{category}</div>
                      <div className="space-y-1">
                        {tools.map(tool => (
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

            {/* Main Content Area */}
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

        {/* Visual Builder View */}
        {activeView === 'orchestrate' && activeSubView === 'visual-builder' && (
          <div className="h-[calc(100vh-180px)]">
            <WorkflowBuilder />
          </div>
        )}

        {/* Agents View */}
        {activeView === 'agents' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-3">
              <div className="glass rounded-lg p-4">
                <h3 className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-4">
                  Specialized Agents
                </h3>
                <div className="space-y-2">
                  {SPECIALIZED_AGENTS.map(agent => (
                    <button
                      key={agent.id}
                      onClick={() => setSelectedAgent(agent.id)}
                      className={`w-full text-left p-3 rounded-lg transition-all ${
                        selectedAgent === agent.id
                          ? 'bg-slate-800 border border-slate-700'
                          : 'hover:bg-slate-800/50 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-slate-400 mt-0.5">{agent.icon}</div>
                        <div className="flex-1">
                          <div className="text-xs font-medium text-slate-200">{agent.name}</div>
                          <div className="text-[10px] text-slate-500 mt-1">{agent.description}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="col-span-9">
              {selectedAgent && (
                <div className="glass rounded-lg p-6">
                  {(() => {
                    const agent = SPECIALIZED_AGENTS.find(a => a.id === selectedAgent);
                    return agent ? (
                      <>
                        <div className="flex items-start gap-4 mb-6">
                          <div className="text-slate-400">{agent.icon}</div>
                          <div>
                            <h2 className="text-lg font-medium text-slate-200">{agent.name} Agent</h2>
                            <p className="text-sm text-slate-500 mt-1">{agent.description}</p>
                          </div>
                        </div>

                        <div className="mb-6">
                          <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Capabilities</h3>
                          <div className="grid grid-cols-2 gap-3">
                            {agent.capabilities.map((capability, idx) => (
                              <div key={idx} className="flex items-center gap-2 p-2 bg-slate-800/30 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-xs text-slate-300">{capability}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <label className="text-xs text-slate-400 block mb-2">Task Description</label>
                            <textarea
                              placeholder={`Describe what you want the ${agent.name} to do...`}
                              className="w-full h-32 p-3 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300 placeholder-slate-600 resize-none"
                            />
                          </div>

                          <button className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-100 rounded-md text-xs font-medium transition-all flex items-center gap-2">
                            <Play className="w-3.5 h-3.5" />
                            Execute {agent.name} Agent
                          </button>
                        </div>
                      </>
                    ) : null;
                  })()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Creative View (Image Generation) */}
        {activeView === 'creative' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-8">
              <div className="glass rounded-lg p-6">
                <h2 className="text-lg font-medium text-slate-200 mb-6">Image Generation Studio</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 block mb-2">Prompt</label>
                    <textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="Describe the image you want to create..."
                      className="w-full h-24 p-3 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300 placeholder-slate-600 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">Model</label>
                      <select className="w-full p-2 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300">
                        <option>Stable Diffusion XL</option>
                        <option>Photorealistic</option>
                        <option>Anime Style</option>
                        <option>OpenJourney</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">Aspect Ratio</label>
                      <select className="w-full p-2 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300">
                        <option>1:1 Square</option>
                        <option>16:9 Landscape</option>
                        <option>9:16 Portrait</option>
                        <option>4:3 Classic</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-slate-400 block mb-2">Quality</label>
                      <select className="w-full p-2 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300">
                        <option>Fast (30 steps)</option>
                        <option>Balanced (50 steps)</option>
                        <option>High Quality (100 steps)</option>
                      </select>
                    </div>
                  </div>

                  <button
                    onClick={executeImageGeneration}
                    disabled={isExecuting || !imagePrompt.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium rounded-md transition-all flex items-center gap-2"
                  >
                    {isExecuting ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-pulse" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Generate Images
                      </>
                    )}
                  </button>
                </div>

                {generatedImages.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-medium text-slate-300 mb-4">Generated Images</h3>
                    <div className="grid grid-cols-4 gap-4">
                      {generatedImages.map((img, idx) => (
                        <div key={idx} className="relative group">
                          <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                            <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse" />
                          </div>
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-2">
                            <button className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
                              <Download className="w-3.5 h-3.5 text-slate-300" />
                            </button>
                            <button className="p-1.5 bg-slate-800 rounded hover:bg-slate-700 transition-colors">
                              <PenTool className="w-3.5 h-3.5 text-slate-300" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="col-span-4">
              <div className="glass rounded-lg p-4">
                <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Quick Actions</h3>
                <div className="space-y-2">
                  <button className="w-full text-left p-3 hover:bg-slate-800/50 rounded-lg transition-all">
                    <div className="text-xs text-slate-300">Generate Mood Board</div>
                    <div className="text-[10px] text-slate-600 mt-1">Create a cohesive visual theme</div>
                  </button>
                  <button className="w-full text-left p-3 hover:bg-slate-800/50 rounded-lg transition-all">
                    <div className="text-xs text-slate-300">Product Mockups</div>
                    <div className="text-[10px] text-slate-600 mt-1">Generate product presentations</div>
                  </button>
                  <button className="w-full text-left p-3 hover:bg-slate-800/50 rounded-lg transition-all">
                    <div className="text-xs text-slate-300">Image Series</div>
                    <div className="text-[10px] text-slate-600 mt-1">Create variations of a concept</div>
                  </button>
                </div>
              </div>

              <div className="glass rounded-lg p-4 mt-4">
                <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Recent Prompts</h3>
                <div className="space-y-2">
                  <div className="p-2 bg-slate-800/30 rounded text-[10px] text-slate-500">
                    "A futuristic city with neon lights..."
                  </div>
                  <div className="p-2 bg-slate-800/30 rounded text-[10px] text-slate-500">
                    "Modern minimalist logo design..."
                  </div>
                  <div className="p-2 bg-slate-800/30 rounded text-[10px] text-slate-500">
                    "Product photography of sneakers..."
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Architecture View */}
        {activeView === 'architecture' && (
          <div className="space-y-6">
            {/* Pipeline Visualization */}
            <div className="glass rounded-lg p-6">
              <h2 className="text-lg font-medium text-slate-200 mb-6">Architecture Design Pipeline</h2>
              
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      architectureSpec ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}>
                      <Brain className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-300">Vision Parser</div>
                      <div className="text-[10px] text-slate-600">Natural Language → JSON</div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600" />

                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      architectureImages.floorplan ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}>
                      <HomeIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-300">Floorplan Generator</div>
                      <div className="text-[10px] text-slate-600">JSON → Technical Drawing</div>
                    </div>
                  </div>

                  <ChevronRight className="w-4 h-4 text-slate-600" />

                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                      architectureImages.exterior ? 'bg-emerald-600' : 'bg-slate-700'
                    }`}>
                      <Camera className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-300">3D Renderer</div>
                      <div className="text-[10px] text-slate-600">Floorplan → Photorealistic</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Section */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-2">Describe Your Vision</label>
                  <textarea
                    value={architectureVision}
                    onChange={(e) => setArchitectureVision(e.target.value)}
                    placeholder="Example: I want a modern 3-bedroom house, 2000 sq ft, open concept kitchen and living room, master suite with walk-in closet, 2-car garage, home office..."
                    className="w-full h-32 p-3 bg-slate-900/50 border border-slate-800/50 rounded-md text-xs text-slate-300 placeholder-slate-600 resize-none"
                  />
                </div>

                <button
                  onClick={executeArchitecturePipeline}
                  disabled={isExecuting || !architectureVision.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs font-medium rounded-md transition-all flex items-center gap-2"
                >
                  {isExecuting ? (
                    <>
                      <Activity className="w-3.5 h-3.5 animate-pulse" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Building className="w-3.5 h-3.5" />
                      Generate Architecture Design
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Results Section */}
            {architectureSpec && (
              <div className="grid grid-cols-12 gap-6">
                {/* Specification */}
                <div className="col-span-4">
                  <div className="glass rounded-lg p-4">
                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Specifications</h3>
                    <div className="space-y-3">
                      <div>
                        <div className="text-[10px] text-slate-600">Project</div>
                        <div className="text-xs text-slate-300">{architectureSpec.project.name}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600">Type</div>
                        <div className="text-xs text-slate-300">{architectureSpec.project.type}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600">Style</div>
                        <div className="text-xs text-slate-300">{architectureSpec.project.style}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600">Size</div>
                        <div className="text-xs text-slate-300">{architectureSpec.project.totalSquareFeet} sq ft</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600">Stories</div>
                        <div className="text-xs text-slate-300">{architectureSpec.project.stories}</div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-800">
                      <div className="text-[10px] text-slate-600 mb-2">Rooms</div>
                      <div className="space-y-1">
                        {architectureSpec.rooms.map((room: any, idx: number) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span className="text-slate-400">{room.name}</span>
                            <span className="text-slate-500">{room.area} sq ft</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button className="w-full mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-all">
                      View Full JSON Spec
                    </button>
                  </div>
                </div>

                {/* Images */}
                <div className="col-span-8">
                  <div className="glass rounded-lg p-4">
                    <h3 className="text-xs font-medium text-slate-400 uppercase mb-3">Generated Designs</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-[10px] text-slate-600 mb-2">Floorplan</div>
                        <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse flex items-center justify-center">
                            <HomeIcon className="w-8 h-8 text-slate-600" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 mb-2">Exterior View</div>
                        <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse flex items-center justify-center">
                            <Building className="w-8 h-8 text-slate-600" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 mb-2">Interior View</div>
                        <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse flex items-center justify-center">
                            <Camera className="w-8 h-8 text-slate-600" />
                          </div>
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-600 mb-2">Aerial View</div>
                        <div className="aspect-square bg-slate-800 rounded-lg overflow-hidden">
                          <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-800 animate-pulse flex items-center justify-center">
                            <Camera className="w-8 h-8 text-slate-600" />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-all flex items-center justify-center gap-2">
                        <Download className="w-3.5 h-3.5" />
                        Download All
                      </button>
                      <button className="flex-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded transition-all flex items-center justify-center gap-2">
                        <Github className="w-3.5 h-3.5" />
                        Save to GitHub
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Workflows View */}
        {activeView === 'workflows' && (
          <div className="h-[calc(100vh-180px)]">
            <WorkflowBuilder />
          </div>
        )}
      </main>
    </div>
  );
}
