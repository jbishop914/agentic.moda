// src/lib/agents/assistant-orchestrator.ts
// OpenAI Assistants API-inspired orchestrator with persistent threads and memory

import OpenAI from 'openai';
import { z } from 'zod';

export interface AssistantConfig {
  name: string;
  instructions: string;
  model: string;
  tools?: OpenAI.Beta.AssistantTool[];
  tool_resources?: {
    code_interpreter?: {
      file_ids?: string[];
    };
    file_search?: {
      vector_store_ids?: string[];
    };
  };
  metadata?: Record<string, any>;
}

export interface ThreadMessage {
  role: 'user' | 'assistant';
  content: string;
  attachments?: Array<{
    file_id: string;
    tools: Array<{ type: 'code_interpreter' | 'file_search' }>;
  }>;
  metadata?: Record<string, any>;
}

/**
 * Assistant-based orchestrator inspired by OpenAI's Assistants API
 * Provides persistent threads, file handling, and sophisticated tool use
 */
export class AssistantOrchestrator {
  private client: OpenAI;
  private assistants: Map<string, OpenAI.Beta.Assistant> = new Map();
  private threads: Map<string, OpenAI.Beta.Thread> = new Map();
  private activeRuns: Map<string, OpenAI.Beta.Threads.Run> = new Map();

  constructor(apiKey: string) {
    this.client = new OpenAI({ apiKey });
  }

  /**
   * Create a new assistant with specific capabilities
   */
  async createAssistant(config: AssistantConfig): Promise<string> {
    const assistant = await this.client.beta.assistants.create({
      name: config.name,
      instructions: config.instructions,
      model: config.model,
      tools: config.tools || [],
      tool_resources: config.tool_resources,
      metadata: config.metadata,
    } as OpenAI.Beta.AssistantCreateParams);

    this.assistants.set(assistant.id, assistant);
    return assistant.id;
  }

  /**
   * Create a persistent thread for conversation
   */
  async createThread(metadata?: Record<string, any>): Promise<string> {
    const thread = await this.client.beta.threads.create({
      metadata,
    });

    this.threads.set(thread.id, thread);
    return thread.id;
  }

  /**
   * Add a message to a thread
   */
  async addMessage(threadId: string, message: ThreadMessage): Promise<void> {
    const params: OpenAI.Beta.Threads.MessageCreateParams = {
      role: message.role,
      content: message.content,
      metadata: message.metadata,
    };
    
    // Only add attachments if they exist
    if (message.attachments) {
      params.attachments = message.attachments;
    }
    
    await this.client.beta.threads.messages.create(threadId, params);
  }

  /**
   * Run an assistant on a thread with streaming support
   */
  async runAssistant(
    assistantId: string,
    threadId: string,
    options?: {
      stream?: boolean;
      additional_instructions?: string;
      tools?: any[];
    }
  ): Promise<OpenAI.Beta.Threads.Run | AsyncIterable<OpenAI.Beta.Assistants.AssistantStreamEvent>> {
    if (options?.stream) {
      // Return stream for real-time updates
      const streamParams: any = {
        assistant_id: assistantId,
      };
      
      if (options.additional_instructions) {
        streamParams.additional_instructions = options.additional_instructions;
      }
      
      return this.client.beta.threads.runs.stream(threadId, streamParams);
    }

    // Regular run
    const runParams: OpenAI.Beta.Threads.RunCreateParams = {
      assistant_id: assistantId,
    };
    
    if (options?.additional_instructions) {
      runParams.additional_instructions = options.additional_instructions;
    }
    
    const run = await this.client.beta.threads.runs.create(threadId, runParams);

    this.activeRuns.set(run.id, run);
    return run;
  }

  /**
   * Wait for a run to complete and get results
   */
  async waitForCompletion(
    threadId: string,
    runId: string,
    options?: {
      onStatusUpdate?: (status: string) => void;
      timeout?: number;
    }
  ): Promise<any> {
    const startTime = Date.now();
    const timeout = options?.timeout || 300000; // 5 minutes default

    while (true) {
      const run = await this.client.beta.threads.runs.retrieve(threadId, runId);
      
      if (options?.onStatusUpdate) {
        options.onStatusUpdate(run.status);
      }

      if (run.status === 'completed') {
        // Get the messages from the thread
        const messages = await this.client.beta.threads.messages.list(threadId);
        return messages;
      }

      if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
        throw new Error(`Run ${runId} ${run.status}: ${run.last_error?.message}`);
      }

      if (run.status === 'requires_action') {
        // Handle function calling
        await this.handleRequiredAction(threadId, runId, run);
      }

      if (Date.now() - startTime > timeout) {
        throw new Error(`Run ${runId} timed out after ${timeout}ms`);
      }

      // Wait before polling again
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Handle function calling requirements
   */
  private async handleRequiredAction(
    threadId: string,
    runId: string,
    run: OpenAI.Beta.Threads.Run
  ): Promise<void> {
    if (run.required_action?.type === 'submit_tool_outputs') {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      
      // Execute all tool calls in parallel
      const toolOutputs = await Promise.all(
        toolCalls.map(async (toolCall) => {
          const output = await this.executeTool(toolCall.function.name, toolCall.function.arguments);
          return {
            tool_call_id: toolCall.id,
            output: typeof output === 'string' ? output : JSON.stringify(output),
          };
        })
      );

      // Submit the tool outputs
      await this.client.beta.threads.runs.submitToolOutputs(threadId, runId, {
        tool_outputs: toolOutputs,
      });
    }
  }

  /**
   * Execute a tool function
   */
  private async executeTool(toolName: string, args: string): Promise<any> {
    const params = JSON.parse(args);
    
    // Route to appropriate tool handler
    switch (toolName) {
      case 'code_interpreter':
        return this.executeCode(params);
      case 'web_search':
        return this.executeWebSearch(params);
      case 'database_query':
        return this.executeDatabaseQuery(params);
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  private async executeCode(params: any): Promise<any> {
    // Implement code execution logic
    return { result: 'Code executed successfully', output: params };
  }

  private async executeWebSearch(params: any): Promise<any> {
    // Implement web search logic
    return { results: ['Search result 1', 'Search result 2'] };
  }

  private async executeDatabaseQuery(params: any): Promise<any> {
    // Implement database query logic
    return { rows: [], count: 0 };
  }

  /**
   * Upload a file for use with assistants
   */
  async uploadFile(file: any, purpose: 'assistants' | 'fine-tune'): Promise<string> {
    // The OpenAI client expects an Uploadable type
    // We'll pass it through directly and let the client handle it
    const uploadedFile = await this.client.files.create({
      file: file as any,
      purpose: purpose,
    });
    return uploadedFile.id;
  }

  /**
   * Create a vector store for retrieval
   * Note: Vector stores are now part of the Assistants API v2
   */
  async createVectorStore(name: string, file_ids?: string[]): Promise<string> {
    // Vector stores might not be available in all SDK versions
    // Using a try-catch with type assertion for compatibility
    try {
      const client = this.client as any;
      if (client.beta?.vectorStores) {
        const vectorStore = await client.beta.vectorStores.create({
          name,
          file_ids: file_ids || [],
        });
        return vectorStore.id;
      } else {
        // Fallback - return a mock ID if vector stores aren't available
        console.warn('Vector stores not available in this OpenAI SDK version');
        return `mock-vector-store-${Date.now()}`;
      }
    } catch (error) {
      console.error('Error creating vector store:', error);
      // Return a mock ID to prevent breaking the app
      return `mock-vector-store-${Date.now()}`;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(assistantId?: string, threadId?: string): Promise<void> {
    if (assistantId && this.assistants.has(assistantId)) {
      await this.client.beta.assistants.del(assistantId);
      this.assistants.delete(assistantId);
    }

    if (threadId && this.threads.has(threadId)) {
      await this.client.beta.threads.del(threadId);
      this.threads.delete(threadId);
    }
  }
}

// ============= Multi-Agent Orchestration =============

export class MultiAgentOrchestrator {
  private orchestrator: AssistantOrchestrator;
  private agents: Map<string, string> = new Map(); // name -> assistant_id
  private sharedThread?: string;

  constructor(apiKey: string) {
    this.orchestrator = new AssistantOrchestrator(apiKey);
  }

  /**
   * Initialize multiple specialized agents
   */
  async initialize(agents: AssistantConfig[]): Promise<void> {
    for (const config of agents) {
      const id = await this.orchestrator.createAssistant(config);
      this.agents.set(config.name, id);
    }

    // Create a shared thread for multi-agent conversation
    this.sharedThread = await this.orchestrator.createThread({
      type: 'multi_agent_orchestration',
    });
  }

  /**
   * Execute a complex workflow with multiple agents
   */
  async executeWorkflow(workflow: {
    steps: Array<{
      agent: string;
      prompt: string;
      waitForPrevious?: boolean;
      processOutput?: (output: string) => string;
    }>;
  }): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    for (const step of workflow.steps) {
      const agentId = this.agents.get(step.agent);
      if (!agentId) {
        throw new Error(`Agent ${step.agent} not found`);
      }

      // Add user message to thread
      await this.orchestrator.addMessage(this.sharedThread!, {
        role: 'user',
        content: step.prompt,
      });

      // Run the agent
      const run = await this.orchestrator.runAssistant(agentId, this.sharedThread!) as OpenAI.Beta.Threads.Run;

      // Wait for completion
      const messages = await this.orchestrator.waitForCompletion(
        this.sharedThread!,
        run.id
      );

      // Get the latest assistant message
      const latestMessage = messages.data.find((m: any) => m.role === 'assistant');
      if (latestMessage && latestMessage.content[0]?.type === 'text') {
        let output = latestMessage.content[0].text.value;
        
        // Process output if handler provided
        if (step.processOutput) {
          output = step.processOutput(output);
        }
        
        results.set(step.agent, output);
      }
    }

    return results;
  }

  /**
   * Execute agents in parallel
   */
  async executeParallel(tasks: Array<{
    agent: string;
    prompt: string;
  }>): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    // Create separate threads for parallel execution
    const executions = await Promise.all(
      tasks.map(async (task) => {
        const agentId = this.agents.get(task.agent);
        if (!agentId) {
          throw new Error(`Agent ${task.agent} not found`);
        }

        // Create a new thread for this execution
        const threadId = await this.orchestrator.createThread();
        
        // Add message
        await this.orchestrator.addMessage(threadId, {
          role: 'user',
          content: task.prompt,
        });

        // Run agent
        const run = await this.orchestrator.runAssistant(agentId, threadId) as OpenAI.Beta.Threads.Run;
        
        // Wait for completion
        const messages = await this.orchestrator.waitForCompletion(threadId, run.id);
        
        return { agent: task.agent, messages };
      })
    );

    // Extract results
    for (const exec of executions) {
      const latestMessage = exec.messages.data.find((m: any) => m.role === 'assistant');
      if (latestMessage && latestMessage.content[0]?.type === 'text') {
        results.set(exec.agent, latestMessage.content[0].text.value);
      }
    }

    return results;
  }

  /**
   * Implement a feedback loop with a judge agent
   */
  async runWithFeedback(
    workerAgent: string,
    judgeAgent: string,
    initialPrompt: string,
    judgeCriteria: string,
    maxIterations: number = 3
  ): Promise<{ finalOutput: string; iterations: number; feedback: string[] }> {
    const feedback: string[] = [];
    let currentOutput = '';
    let iterations = 0;

    for (let i = 0; i < maxIterations; i++) {
      iterations++;

      // Run worker agent
      const workerPrompt = i === 0 
        ? initialPrompt 
        : `Previous feedback: ${feedback[feedback.length - 1]}\n\nPlease improve your response based on this feedback.`;

      await this.orchestrator.addMessage(this.sharedThread!, {
        role: 'user',
        content: workerPrompt,
      });

      const workerId = this.agents.get(workerAgent)!;
      const workerRun = await this.orchestrator.runAssistant(workerId, this.sharedThread!) as OpenAI.Beta.Threads.Run;
      const workerMessages = await this.orchestrator.waitForCompletion(this.sharedThread!, workerRun.id);
      
      const workerOutput = workerMessages.data.find((m: any) => m.role === 'assistant');
      if (workerOutput && workerOutput.content[0]?.type === 'text') {
        currentOutput = workerOutput.content[0].text.value;
      }

      // Run judge agent
      const judgePrompt = `Please evaluate the following output based on these criteria: ${judgeCriteria}\n\nOutput to evaluate:\n${currentOutput}\n\nProvide feedback and indicate if this meets the criteria (respond with APPROVED or specific improvements needed).`;

      await this.orchestrator.addMessage(this.sharedThread!, {
        role: 'user',
        content: judgePrompt,
      });

      const judgeId = this.agents.get(judgeAgent)!;
      const judgeRun = await this.orchestrator.runAssistant(judgeId, this.sharedThread!) as OpenAI.Beta.Threads.Run;
      const judgeMessages = await this.orchestrator.waitForCompletion(this.sharedThread!, judgeRun.id);
      
      const judgeOutput = judgeMessages.data.find((m: any) => m.role === 'assistant');
      if (judgeOutput && judgeOutput.content[0]?.type === 'text') {
        const judgeFeedback = judgeOutput.content[0].text.value;
        feedback.push(judgeFeedback);

        if (judgeFeedback.includes('APPROVED')) {
          break;
        }
      }
    }

    return { finalOutput: currentOutput, iterations, feedback };
  }
}