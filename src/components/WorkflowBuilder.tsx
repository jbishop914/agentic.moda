// Visual Workflow Builder Component
// Drag-and-drop interface for creating agent workflows

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  Play, 
  Save, 
  Settings, 
  Link2, 
  Zap,
  GitBranch,
  Image,
  Code,
  FileText,
  Brain,
  Home,
  Palette,
  Camera,
  Layers3
} from 'lucide-react';

// ============= TYPES =============

interface WorkflowNode {
  id: string;
  type: 'agent' | 'tool' | 'condition' | 'output';
  name: string;
  icon: React.ReactNode;
  position: { x: number; y: number };
  config: Record<string, any>;
  inputs: string[];
  outputs: string[];
}

interface WorkflowConnection {
  id: string;
  from: string;
  to: string;
  fromPort: 'output';
  toPort: 'input';
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
  category: string;
}

// ============= TEMPLATES =============

const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    id: 'app-builder',
    name: 'Full Stack App Builder',
    description: 'Plan → Code → Test → Deploy to GitHub',
    category: 'Development',
    nodes: [
      {
        id: 'planner',
        type: 'agent',
        name: 'Architecture Planner',
        icon: <Brain className="w-4 h-4" />,
        position: { x: 100, y: 200 },
        config: { model: 'gpt-4', role: 'architect' },
        inputs: [],
        outputs: ['plan']
      },
      {
        id: 'coder',
        type: 'agent',
        name: 'Code Generator',
        icon: <Code className="w-4 h-4" />,
        position: { x: 300, y: 200 },
        config: { model: 'gpt-4', role: 'developer' },
        inputs: ['plan'],
        outputs: ['code']
      },
      {
        id: 'github',
        type: 'tool',
        name: 'GitHub Deploy',
        icon: <GitBranch className="w-4 h-4" />,
        position: { x: 500, y: 200 },
        config: { tool: 'github_create_app' },
        inputs: ['code'],
        outputs: ['repo_url']
      }
    ],
    connections: [
      { id: 'c1', from: 'planner', to: 'coder', fromPort: 'output', toPort: 'input' },
      { id: 'c2', from: 'coder', to: 'github', fromPort: 'output', toPort: 'input' }
    ]
  },
  {
    id: 'content-pipeline',
    name: 'Content Creation Pipeline',
    description: 'Research → Write → Illustrate → Publish',
    category: 'Content',
    nodes: [
      {
        id: 'researcher',
        type: 'agent',
        name: 'Research Agent',
        icon: <FileText className="w-4 h-4" />,
        position: { x: 100, y: 200 },
        config: { model: 'gpt-4', role: 'researcher' },
        inputs: [],
        outputs: ['research']
      },
      {
        id: 'writer',
        type: 'agent',
        name: 'Content Writer',
        icon: <FileText className="w-4 h-4" />,
        position: { x: 300, y: 150 },
        config: { model: 'gpt-4', role: 'writer' },
        inputs: ['research'],
        outputs: ['content']
      },
      {
        id: 'illustrator',
        type: 'tool',
        name: 'Image Generator',
        icon: <Image className="w-4 h-4" />,
        position: { x: 300, y: 250 },
        config: { tool: 'generate_image', model: 'sdxl' },
        inputs: ['research'],
        outputs: ['images']
      },
      {
        id: 'publisher',
        type: 'agent',
        name: 'Publisher',
        icon: <Layers3 className="w-4 h-4" />,
        position: { x: 500, y: 200 },
        config: { model: 'gpt-4', role: 'publisher' },
        inputs: ['content', 'images'],
        outputs: ['published']
      }
    ],
    connections: [
      { id: 'c1', from: 'researcher', to: 'writer', fromPort: 'output', toPort: 'input' },
      { id: 'c2', from: 'researcher', to: 'illustrator', fromPort: 'output', toPort: 'input' },
      { id: 'c3', from: 'writer', to: 'publisher', fromPort: 'output', toPort: 'input' },
      { id: 'c4', from: 'illustrator', to: 'publisher', fromPort: 'output', toPort: 'input' }
    ]
  },
  {
    id: 'architecture-pipeline',
    name: 'Architecture Design Pipeline',
    description: 'Vision → JSON → Floorplan → 3D Render',
    category: 'Architecture',
    nodes: [
      {
        id: 'vision-parser',
        type: 'agent',
        name: 'Vision Parser',
        icon: <Brain className="w-4 h-4" />,
        position: { x: 100, y: 200 },
        config: { 
          model: 'gpt-4',
          systemPrompt: 'Convert architectural descriptions to structured JSON',
          responseFormat: 'json'
        },
        inputs: [],
        outputs: ['structured_json']
      },
      {
        id: 'floorplan-gen',
        type: 'tool',
        name: 'Floorplan Generator',
        icon: <Home className="w-4 h-4" />,
        position: { x: 300, y: 200 },
        config: { 
          tool: 'generate_image',
          model: 'sdxl',
          stylePrompt: 'architectural floorplan, technical drawing, precise measurements, CAD style'
        },
        inputs: ['structured_json'],
        outputs: ['floorplan_image']
      },
      {
        id: '3d-renderer',
        type: 'tool',
        name: '3D Renderer',
        icon: <Camera className="w-4 h-4" />,
        position: { x: 500, y: 200 },
        config: { 
          tool: 'generate_image',
          model: 'photorealistic',
          stylePrompt: 'architectural 3D rendering, photorealistic, professional visualization'
        },
        inputs: ['floorplan_image'],
        outputs: ['3d_render']
      }
    ],
    connections: [
      { id: 'c1', from: 'vision-parser', to: 'floorplan-gen', fromPort: 'output', toPort: 'input' },
      { id: 'c2', from: 'floorplan-gen', to: '3d-renderer', fromPort: 'output', toPort: 'input' }
    ]
  }
];

// ============= NODE TYPES =============

const NODE_TYPES = [
  {
    category: 'Agents',
    items: [
      { type: 'agent', subtype: 'planner', name: 'Planner', icon: <Brain className="w-4 h-4" /> },
      { type: 'agent', subtype: 'developer', name: 'Developer', icon: <Code className="w-4 h-4" /> },
      { type: 'agent', subtype: 'designer', name: 'Designer', icon: <Palette className="w-4 h-4" /> },
      { type: 'agent', subtype: 'writer', name: 'Writer', icon: <FileText className="w-4 h-4" /> },
      { type: 'agent', subtype: 'reviewer', name: 'Reviewer', icon: <Settings className="w-4 h-4" /> },
    ]
  },
  {
    category: 'Tools',
    items: [
      { type: 'tool', subtype: 'github', name: 'GitHub', icon: <GitBranch className="w-4 h-4" /> },
      { type: 'tool', subtype: 'image', name: 'Image Gen', icon: <Image className="w-4 h-4" /> },
      { type: 'tool', subtype: 'api', name: 'API Call', icon: <Zap className="w-4 h-4" /> },
      { type: 'tool', subtype: 'database', name: 'Database', icon: <Layers3 className="w-4 h-4" /> },
    ]
  },
  {
    category: 'Control',
    items: [
      { type: 'condition', subtype: 'if', name: 'If/Else', icon: <GitBranch className="w-4 h-4" /> },
      { type: 'condition', subtype: 'loop', name: 'Loop', icon: <Zap className="w-4 h-4" /> },
    ]
  }
];

// ============= COMPONENT =============

export default function WorkflowBuilder() {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [connections, setConnections] = useState<WorkflowConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState<Record<string, any>>({});
  
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = useState<WorkflowNode | null>(null);
  const [connectionStart, setConnectionStart] = useState<{ nodeId: string; port: string } | null>(null);

  // Load template
  const loadTemplate = (templateId: string) => {
    const template = WORKFLOW_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setNodes(template.nodes);
      setConnections(template.connections);
      setSelectedTemplate(templateId);
    }
  };

  // Add node
  const addNode = (type: string, subtype: string, name: string, icon: React.ReactNode) => {
    const newNode: WorkflowNode = {
      id: `node-${Date.now()}`,
      type: type as any,
      name,
      icon,
      position: { x: 250, y: 250 },
      config: {},
      inputs: type === 'agent' ? [] : ['input'],
      outputs: ['output']
    };
    setNodes([...nodes, newNode]);
  };

  // Delete node
  const deleteNode = (nodeId: string) => {
    setNodes(nodes.filter(n => n.id !== nodeId));
    setConnections(connections.filter(c => c.from !== nodeId && c.to !== nodeId));
  };

  // Execute workflow
  const executeWorkflow = async () => {
    setIsExecuting(true);
    setExecutionResults({});

    try {
      // Topological sort to determine execution order
      const executionOrder = topologicalSort(nodes, connections);
      
      for (const nodeId of executionOrder) {
        const node = nodes.find(n => n.id === nodeId);
        if (!node) continue;

        // Simulate execution
        setExecutionResults(prev => ({
          ...prev,
          [nodeId]: { status: 'executing' }
        }));

        await new Promise(resolve => setTimeout(resolve, 1000));

        setExecutionResults(prev => ({
          ...prev,
          [nodeId]: { status: 'completed', output: `Output from ${node.name}` }
        }));
      }
    } catch (error) {
      console.error('Execution error:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  // Topological sort for execution order
  const topologicalSort = (nodes: WorkflowNode[], connections: WorkflowConnection[]): string[] => {
    const graph = new Map<string, string[]>();
    const inDegree = new Map<string, number>();
    
    nodes.forEach(node => {
      graph.set(node.id, []);
      inDegree.set(node.id, 0);
    });
    
    connections.forEach(conn => {
      graph.get(conn.from)?.push(conn.to);
      inDegree.set(conn.to, (inDegree.get(conn.to) || 0) + 1);
    });
    
    const queue: string[] = [];
    const result: string[] = [];
    
    inDegree.forEach((degree, nodeId) => {
      if (degree === 0) queue.push(nodeId);
    });
    
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      
      graph.get(current)?.forEach(neighbor => {
        inDegree.set(neighbor, inDegree.get(neighbor)! - 1);
        if (inDegree.get(neighbor) === 0) {
          queue.push(neighbor);
        }
      });
    }
    
    return result;
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 border-r border-slate-800 p-4 space-y-4">
        {/* Templates */}
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Templates
          </h3>
          <div className="space-y-1">
            {WORKFLOW_TEMPLATES.map(template => (
              <button
                key={template.id}
                onClick={() => loadTemplate(template.id)}
                className={`w-full text-left px-2 py-1.5 rounded text-xs transition-all ${
                  selectedTemplate === template.id
                    ? 'bg-slate-800 text-slate-200'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-300'
                }`}
              >
                <div className="font-medium">{template.name}</div>
                <div className="text-[10px] text-slate-600">{template.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Node Types */}
        <div>
          <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
            Add Nodes
          </h3>
          {NODE_TYPES.map(category => (
            <div key={category.category} className="mb-3">
              <div className="text-[10px] text-slate-600 mb-1">{category.category}</div>
              <div className="space-y-1">
                {category.items.map(item => (
                  <button
                    key={`${item.type}-${item.subtype}`}
                    onClick={() => addNode(item.type, item.subtype, item.name, item.icon)}
                    className="w-full flex items-center gap-2 px-2 py-1 text-xs text-slate-400 hover:bg-slate-800/50 hover:text-slate-300 rounded transition-all"
                  >
                    {item.icon}
                    <span>{item.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="flex-1 relative bg-slate-950">
        {/* Toolbar */}
        <div className="absolute top-4 left-4 right-4 z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={executeWorkflow}
              disabled={isExecuting || nodes.length === 0}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white text-xs rounded-md transition-all flex items-center gap-2"
            >
              <Play className="w-3 h-3" />
              {isExecuting ? 'Executing...' : 'Run Workflow'}
            </button>
            <button className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-md transition-all flex items-center gap-2">
              <Save className="w-3 h-3" />
              Save
            </button>
          </div>
          
          <div className="text-xs text-slate-500">
            {nodes.length} nodes, {connections.length} connections
          </div>
        </div>

        {/* Canvas Area */}
        <div 
          ref={canvasRef}
          className="absolute inset-0 overflow-auto"
          style={{
            backgroundImage: 'radial-gradient(circle, #1e293b 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }}
        >
          {/* Render Connections */}
          <svg className="absolute inset-0 pointer-events-none">
            {connections.map(conn => {
              const fromNode = nodes.find(n => n.id === conn.from);
              const toNode = nodes.find(n => n.id === conn.to);
              if (!fromNode || !toNode) return null;

              return (
                <line
                  key={conn.id}
                  x1={fromNode.position.x + 100}
                  y1={fromNode.position.y + 30}
                  x2={toNode.position.x}
                  y2={toNode.position.y + 30}
                  stroke="#475569"
                  strokeWidth="2"
                />
              );
            })}
          </svg>

          {/* Render Nodes */}
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute bg-slate-900 border rounded-lg p-3 cursor-move transition-all ${
                selectedNode === node.id
                  ? 'border-blue-500 shadow-lg shadow-blue-500/20'
                  : 'border-slate-700 hover:border-slate-600'
              } ${
                executionResults[node.id]?.status === 'executing'
                  ? 'ring-2 ring-emerald-500 ring-opacity-50 animate-pulse'
                  : executionResults[node.id]?.status === 'completed'
                  ? 'ring-2 ring-emerald-500 ring-opacity-30'
                  : ''
              }`}
              style={{
                left: node.position.x,
                top: node.position.y,
                width: '200px'
              }}
              onClick={() => setSelectedNode(node.id)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="text-slate-400">{node.icon}</div>
                  <span className="text-xs text-slate-200 font-medium">{node.name}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteNode(node.id);
                  }}
                  className="text-slate-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              
              {/* Ports */}
              <div className="flex justify-between mt-2">
                {node.inputs.length > 0 && (
                  <div className="w-2 h-2 bg-slate-600 rounded-full -ml-4"></div>
                )}
                {node.outputs.length > 0 && (
                  <div className="w-2 h-2 bg-slate-600 rounded-full -mr-4 ml-auto"></div>
                )}
              </div>

              {/* Execution Status */}
              {executionResults[node.id] && (
                <div className="mt-2 pt-2 border-t border-slate-800">
                  <div className="text-[10px] text-slate-500">
                    Status: {executionResults[node.id].status}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Node Configuration Panel */}
        {selectedNode && (
          <div className="absolute right-4 top-20 w-80 bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-slate-200">Node Configuration</h3>
              <button
                onClick={() => setSelectedNode(null)}
                className="text-slate-500 hover:text-slate-400"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500">Name</label>
                <input
                  type="text"
                  value={nodes.find(n => n.id === selectedNode)?.name || ''}
                  onChange={(e) => {
                    setNodes(nodes.map(n => 
                      n.id === selectedNode 
                        ? { ...n, name: e.target.value }
                        : n
                    ));
                  }}
                  className="w-full mt-1 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-200"
                />
              </div>
              
              {/* Add more configuration options based on node type */}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
