// src/lib/agents/openai-agent.ts
// Advanced OpenAI Agent implementation with function calling, structured outputs, and parallel tools

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodObject<any>;
  execute: (params: any) => Promise<any>;
}

export interface AgentConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
  systemPrompt?: string;
  tools?: Tool[];
  responseFormat?: z.ZodObject<any>;
  parallelToolCalls?: boolean;
}

export class OpenAIAgent {
  private client: OpenAI;
  private config: AgentConfig;
  private tools: Map<string, Tool>;
  private conversationHistory: OpenAI.Chat.ChatCompletionMessageParam[] = [];

  constructor(apiKey: string, config: AgentConfig) {
    this.client = new OpenAI({ apiKey });
    this.config = config;
    this.tools = new Map(config.tools?.map(t => [t.name, t]) || []);
  }

  /**
   * Execute agent with optional function calling and structured output
   */
  async execute(prompt: string, options?: {
    stream?: boolean;
    structuredOutput?: boolean;
    maxIterations?: number;
  }): Promise<any> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      ...(this.config.systemPrompt ? [{ role: 'system' as const, content: this.config.systemPrompt }] : []),
      ...this.conversationHistory,
      { role: 'user' as const, content: prompt }
    ];

    // Build the completion request
    const completionOptions: OpenAI.Chat.ChatCompletionCreateParams = {
      model: this.config.model,
      messages,
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    };

    // Add tools if configured
    if (this.tools.size > 0) {
      completionOptions.tools = Array.from(this.tools.values()).map(tool => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: zodToJsonSchema(tool.parameters),
        }
      }));
      
      // Enable parallel tool calls (OpenAI's new feature)
      if (this.config.parallelToolCalls) {
        completionOptions.parallel_tool_calls = true;
      }
    }

    // Add structured output format if specified
    if (options?.structuredOutput && this.config.responseFormat) {
      completionOptions.response_format = zodResponseFormat(
        this.config.responseFormat, 
        'structured_output'
      );
    }

    // Handle streaming if requested
    if (options?.stream) {
      return this.streamCompletion(completionOptions);
    }

    // Execute with potential function calling loops
    return this.executeWithTools(completionOptions, options?.maxIterations || 5);
  }

  /**
   * Execute with tool calling support (including parallel calls)
   */
  private async executeWithTools(
    options: OpenAI.Chat.ChatCompletionCreateParams,
    maxIterations: number
  ): Promise<any> {
    let iterations = 0;
    const messages = [...options.messages];

    while (iterations < maxIterations) {
      const completion = await this.client.chat.completions.create({
        ...options,
        stream: false  // Ensure we're not getting a stream
      }) as OpenAI.Chat.ChatCompletion;
      
      const message = completion.choices[0].message;
      
      messages.push(message);

      // Check if the model wants to call functions
      if (message.tool_calls && message.tool_calls.length > 0) {
        // Handle parallel tool calls
        const toolResults = await this.executeToolCalls(message.tool_calls);
        
        // Add tool results to conversation
        for (const result of toolResults) {
          messages.push(result);
        }
        
        // Continue the conversation with tool results
        options.messages = messages;
        iterations++;
      } else {
        // No more tool calls, return the final message
        this.conversationHistory = messages.slice(1); // Save history without system message
        return message.content;
      }
    }

    throw new Error(`Maximum iterations (${maxIterations}) reached`);
  }

  /**
   * Execute multiple tool calls in parallel
   */
  private async executeToolCalls(
    toolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[]
  ): Promise<OpenAI.Chat.ChatCompletionToolMessageParam[]> {
    const results = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const tool = this.tools.get(toolCall.function.name);
        
        if (!tool) {
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: `Error: Unknown tool ${toolCall.function.name}`
          };
        }

        try {
          const params = JSON.parse(toolCall.function.arguments);
          const result = await tool.execute(params);
          
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: typeof result === 'string' ? result : JSON.stringify(result)
          };
        } catch (error: any) {
          return {
            role: 'tool' as const,
            tool_call_id: toolCall.id,
            content: `Error executing ${toolCall.function.name}: ${error.message}`
          };
        }
      })
    );

    return results;
  }

  /**
   * Stream completion with Server-Sent Events
   */
  private async *streamCompletion(
    options: OpenAI.Chat.ChatCompletionCreateParams
  ): AsyncGenerator<string, void, unknown> {
    const stream = await this.client.chat.completions.create({
      ...options,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        yield content;
      }

      // Handle tool calls in stream
      const toolCalls = chunk.choices[0]?.delta?.tool_calls;
      if (toolCalls) {
        // Accumulate tool calls and execute when complete
        // This is more complex in streaming mode
        console.log('Tool calls in stream:', toolCalls);
      }
    }
  }

  /**
   * Add memory/context to the agent
   */
  addContext(role: 'user' | 'assistant', content: string) {
    this.conversationHistory.push({ role, content });
  }

  /**
   * Clear conversation history
   */
  clearHistory() {
    this.conversationHistory = [];
  }

  /**
   * Get token usage estimate
   */
  async estimateTokens(text: string): Promise<number> {
    // Rough estimation - OpenAI uses tiktoken
    // For production, use the actual tiktoken library
    return Math.ceil(text.length / 4);
  }
}

/**
 * Helper function to convert Zod schema to JSON Schema for OpenAI
 */
function zodToJsonSchema(schema: z.ZodObject<any>): any {
  // This is a simplified version - for production use zodToJsonSchema library
  const shape = schema.shape;
  const properties: any = {};
  const required: string[] = [];

  for (const [key, value] of Object.entries(shape)) {
    const zodType = value as any;
    
    if (!zodType.isOptional()) {
      required.push(key);
    }

    // Simplified type mapping
    if (zodType._def?.typeName === 'ZodString') {
      properties[key] = { type: 'string', description: zodType.description };
    } else if (zodType._def?.typeName === 'ZodNumber') {
      properties[key] = { type: 'number', description: zodType.description };
    } else if (zodType._def?.typeName === 'ZodBoolean') {
      properties[key] = { type: 'boolean', description: zodType.description };
    } else if (zodType._def?.typeName === 'ZodArray') {
      properties[key] = { type: 'array', description: zodType.description };
    } else {
      properties[key] = { type: 'object', description: zodType.description };
    }
  }

  return {
    type: 'object',
    properties,
    required,
  };
}

// ============= Example Usage =============

/**
 * Example: Code Review Agent with Multiple Tools
 */
export function createCodeReviewAgent(apiKey: string) {
  // Define tools
  const analyzeCodeTool: Tool = {
    name: 'analyze_code',
    description: 'Analyze code for potential issues, bugs, and improvements',
    parameters: z.object({
      code: z.string().describe('The code to analyze'),
      language: z.string().describe('Programming language'),
      focus_areas: z.array(z.string()).optional().describe('Specific areas to focus on'),
    }),
    execute: async (params) => {
      // Simulate code analysis
      return {
        issues: ['Consider using const instead of let', 'Missing error handling'],
        complexity: 'Medium',
        suggestions: ['Add type annotations', 'Extract into smaller functions'],
      };
    }
  };

  const runTestsTool: Tool = {
    name: 'run_tests',
    description: 'Run unit tests on the code',
    parameters: z.object({
      test_file: z.string().describe('Path to test file'),
      coverage: z.boolean().optional().describe('Include coverage report'),
    }),
    execute: async (params) => {
      // Simulate test execution
      return {
        passed: 8,
        failed: 2,
        coverage: params.coverage ? '85%' : undefined,
      };
    }
  };

  // Define structured output format
  const reviewFormat = z.object({
    overall_score: z.number().min(0).max(10),
    issues: z.array(z.object({
      severity: z.enum(['low', 'medium', 'high']),
      description: z.string(),
      line_number: z.number().optional(),
    })),
    suggestions: z.array(z.string()),
    approved: z.boolean(),
  });

  return new OpenAIAgent(apiKey, {
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    systemPrompt: 'You are an expert code reviewer. Analyze code thoroughly and provide constructive feedback.',
    tools: [analyzeCodeTool, runTestsTool],
    responseFormat: reviewFormat,
    parallelToolCalls: true, // Enable parallel execution of tools
  });
}

/**
 * Example: Research Agent with Web Search and Summarization
 */
export function createResearchAgent(apiKey: string) {
  const searchTool: Tool = {
    name: 'web_search',
    description: 'Search the web for information',
    parameters: z.object({
      query: z.string().describe('Search query'),
      num_results: z.number().min(1).max(10).optional(),
    }),
    execute: async (params) => {
      // Integrate with actual search API
      return {
        results: [
          { title: 'Result 1', snippet: 'Information about the topic...', url: 'https://example.com' },
          { title: 'Result 2', snippet: 'More details...', url: 'https://example.org' },
        ]
      };
    }
  };

  const extractTool: Tool = {
    name: 'extract_content',
    description: 'Extract and parse content from a URL',
    parameters: z.object({
      url: z.string().url().describe('URL to extract content from'),
      format: z.enum(['text', 'markdown', 'html']).optional(),
    }),
    execute: async (params) => {
      // Integrate with content extraction service
      return {
        title: 'Article Title',
        content: 'Full article content...',
        author: 'Author Name',
        date: '2024-01-01',
      };
    }
  };

  return new OpenAIAgent(apiKey, {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    systemPrompt: 'You are a research assistant. Gather information from multiple sources and synthesize insights.',
    tools: [searchTool, extractTool],
    parallelToolCalls: true,
  });
}