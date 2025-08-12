// src/lib/agents/examples/openai-patterns.ts
// Comprehensive examples of OpenAI SDK patterns in agent orchestration

import { OpenAIAgent, createCodeReviewAgent, createResearchAgent } from '../openai-agent';
import { AssistantOrchestrator, MultiAgentOrchestrator } from '../assistant-orchestrator';
import { z } from 'zod';

// ============= Pattern 1: Structured Output with Validation =============

export async function structuredDataExtractionExample(apiKey: string) {
  // Define the exact structure we want
  const CompanyInfoSchema = z.object({
    company_name: z.string(),
    founded_year: z.number(),
    headquarters: z.object({
      city: z.string(),
      country: z.string(),
    }),
    key_products: z.array(z.string()),
    revenue: z.object({
      amount: z.number(),
      currency: z.string(),
      year: z.number(),
    }).optional(),
    employee_count: z.number().optional(),
    summary: z.string().max(500),
  });

  const agent = new OpenAIAgent(apiKey, {
    model: 'gpt-4-turbo-preview',
    temperature: 0.1,
    systemPrompt: 'Extract structured company information from the provided text.',
    responseFormat: CompanyInfoSchema,
  });

  const result = await agent.execute(
    `Tesla, Inc. is an American electric vehicle and clean energy company based in Austin, Texas. 
     Founded in 2003, Tesla designs and manufactures electric cars, battery energy storage, solar panels, 
     and related products. The company reported revenue of $81.5 billion USD in 2022 and employs over 127,000 people worldwide.`,
    { structuredOutput: true }
  );

  // Result will be validated against the schema
  console.log('Structured output:', result);
  return result;
}

// ============= Pattern 2: Parallel Tool Execution =============

export async function parallelToolExecutionExample(apiKey: string) {
  // Create an agent with multiple tools that can run in parallel
  const agent = new OpenAIAgent(apiKey, {
    model: 'gpt-4-turbo-preview',
    temperature: 0.5,
    systemPrompt: 'You are a data analyst. Use multiple tools to gather comprehensive information.',
    parallelToolCalls: true, // Enable parallel execution
    tools: [
      {
        name: 'fetch_sales_data',
        description: 'Fetch sales data for a given period',
        parameters: z.object({
          start_date: z.string(),
          end_date: z.string(),
          region: z.string().optional(),
        }),
        execute: async (params) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1000));
          return {
            total_sales: 1250000,
            transactions: 3420,
            average_order_value: 365.50,
          };
        },
      },
      {
        name: 'fetch_customer_sentiment',
        description: 'Analyze customer sentiment from reviews',
        parameters: z.object({
          product_id: z.string().optional(),
          limit: z.number().default(100),
        }),
        execute: async (params) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 1500));
          return {
            positive: 0.72,
            neutral: 0.18,
            negative: 0.10,
            sample_size: params.limit,
          };
        },
      },
      {
        name: 'fetch_inventory_status',
        description: 'Get current inventory levels',
        parameters: z.object({
          warehouse: z.string().optional(),
          low_stock_threshold: z.number().default(50),
        }),
        execute: async (params) => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 800));
          return {
            total_skus: 450,
            low_stock_items: 23,
            out_of_stock: 5,
            warehouse: params.warehouse || 'all',
          };
        },
      },
    ],
  });

  // The agent will intelligently call multiple tools in parallel
  const result = await agent.execute(
    'Give me a comprehensive business overview including sales from last month, customer sentiment, and inventory status. I need all this data quickly.'
  );

  console.log('Parallel execution result:', result);
  return result;
}

// ============= Pattern 3: Streaming with Real-time Updates =============

export async function streamingExample(apiKey: string) {
  const agent = new OpenAIAgent(apiKey, {
    model: 'gpt-4-turbo-preview',
    temperature: 0.7,
    systemPrompt: 'You are a creative writer. Generate engaging content.',
  });

  console.log('Streaming response:');
  const stream = await agent.execute(
    'Write a short story about AI agents working together',
    { stream: true }
  );

  // Process stream chunks in real-time
  for await (const chunk of stream as AsyncGenerator<string>) {
    process.stdout.write(chunk);
  }
  console.log('\n');
}

// ============= Pattern 4: Assistant with Persistent Memory =============

export async function assistantWithMemoryExample(apiKey: string) {
  const orchestrator = new AssistantOrchestrator(apiKey);

  // Create a specialized assistant
  const assistantId = await orchestrator.createAssistant({
    name: 'Project Manager',
    instructions: `You are a project management assistant. You help track tasks, deadlines, and team progress.
                   Remember all project details across conversations and provide consistent updates.`,
    model: 'gpt-4-turbo-preview',
    tools: [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Create a new project task',
          parameters: {
            type: 'object',
            properties: {
              title: { type: 'string' },
              assignee: { type: 'string' },
              due_date: { type: 'string' },
              priority: { type: 'string', enum: ['low', 'medium', 'high'] },
            },
            required: ['title', 'assignee'],
          },
        },
      },
    ],
    metadata: {
      department: 'Engineering',
      created_by: 'system',
    },
  });

  // Create a thread (persistent conversation)
  const threadId = await orchestrator.createThread({
    project: 'AI Agent Platform',
    start_date: new Date().toISOString(),
  });

  // First interaction
  await orchestrator.addMessage(threadId, {
    role: 'user',
    content: 'Create a task for John to implement the authentication system by next Friday.',
  });

  let run = await orchestrator.runAssistant(assistantId, threadId) as any;
  let messages = await orchestrator.waitForCompletion(threadId, run.id);
  console.log('First interaction complete');

  // Second interaction (maintains context)
  await orchestrator.addMessage(threadId, {
    role: 'user',
    content: 'What tasks have been assigned to John so far?',
  });

  run = await orchestrator.runAssistant(assistantId, threadId) as any;
  messages = await orchestrator.waitForCompletion(threadId, run.id);
  console.log('Second interaction complete - assistant remembers previous context');

  return messages;
}

// ============= Pattern 5: Multi-Agent Collaboration =============

export async function multiAgentCollaborationExample(apiKey: string) {
  const orchestrator = new MultiAgentOrchestrator(apiKey);

  // Initialize specialized agents
  await orchestrator.initialize([
    {
      name: 'Researcher',
      instructions: 'You are a research specialist. Gather and analyze information from various sources.',
      model: 'gpt-4-turbo-preview',
      tools: [{ type: 'retrieval' }],
    },
    {
      name: 'Writer',
      instructions: 'You are a content writer. Create engaging and well-structured content based on research.',
      model: 'gpt-4-turbo-preview',
    },
    {
      name: 'Editor',
      instructions: 'You are an editor. Review content for clarity, grammar, and impact. Provide specific improvements.',
      model: 'gpt-4-turbo-preview',
    },
    {
      name: 'SEO_Specialist',
      instructions: 'You are an SEO specialist. Optimize content for search engines while maintaining readability.',
      model: 'gpt-4-turbo-preview',
    },
  ]);

  // Execute a complex content creation workflow
  const results = await orchestrator.executeWorkflow({
    steps: [
      {
        agent: 'Researcher',
        prompt: 'Research the latest trends in AI agent orchestration and multi-agent systems.',
      },
      {
        agent: 'Writer',
        prompt: 'Based on the research, write a 500-word blog post about AI agent orchestration.',
        waitForPrevious: true,
      },
      {
        agent: 'Editor',
        prompt: 'Review and improve the blog post for clarity and engagement.',
        waitForPrevious: true,
      },
      {
        agent: 'SEO_Specialist',
        prompt: 'Optimize the blog post for SEO while keeping it natural and readable.',
        waitForPrevious: true,
      },
    ],
  });

  console.log('Multi-agent collaboration complete');
  return results;
}

// ============= Pattern 6: Feedback Loop with Judge =============

export async function feedbackLoopExample(apiKey: string) {
  const orchestrator = new MultiAgentOrchestrator(apiKey);

  await orchestrator.initialize([
    {
      name: 'CodeWriter',
      instructions: 'You are an expert programmer. Write clean, efficient, and well-documented code.',
      model: 'gpt-4-turbo-preview',
    },
    {
      name: 'CodeReviewer',
      instructions: `You are a senior code reviewer. Evaluate code for:
                     1. Correctness and functionality
                     2. Performance and efficiency
                     3. Code style and best practices
                     4. Security vulnerabilities
                     Respond with "APPROVED" only if all criteria are met.`,
      model: 'gpt-4-turbo-preview',
    },
  ]);

  const result = await orchestrator.runWithFeedback(
    'CodeWriter',
    'CodeReviewer',
    'Write a Python function to validate email addresses with proper error handling and documentation.',
    'The code must be production-ready, secure, and follow Python best practices.',
    3 // max iterations
  );

  console.log(`Code approved after ${result.iterations} iterations`);
  console.log('Final code:', result.finalOutput);
  console.log('Feedback history:', result.feedback);

  return result;
}

// ============= Pattern 7: Parallel Research Agents =============

export async function parallelResearchExample(apiKey: string) {
  const orchestrator = new MultiAgentOrchestrator(apiKey);

  // Create multiple research agents with different specializations
  await orchestrator.initialize([
    {
      name: 'TechResearcher',
      instructions: 'You specialize in technology and engineering research.',
      model: 'gpt-4-turbo-preview',
    },
    {
      name: 'MarketResearcher',
      instructions: 'You specialize in market analysis and business research.',
      model: 'gpt-4-turbo-preview',
    },
    {
      name: 'LegalResearcher',
      instructions: 'You specialize in legal and regulatory research.',
      model: 'gpt-4-turbo-preview',
    },
    {
      name: 'Synthesizer',
      instructions: 'You synthesize research from multiple sources into comprehensive insights.',
      model: 'gpt-4-turbo-preview',
    },
  ]);

  // Run research in parallel
  const topic = 'AI regulation in autonomous vehicles';
  
  const parallelResults = await orchestrator.executeParallel([
    {
      agent: 'TechResearcher',
      prompt: `Research the technical aspects of ${topic}`,
    },
    {
      agent: 'MarketResearcher',
      prompt: `Research the market implications of ${topic}`,
    },
    {
      agent: 'LegalResearcher',
      prompt: `Research the legal framework for ${topic}`,
    },
  ]);

  // Synthesize results
  const synthesis = await orchestrator.executeWorkflow({
    steps: [
      {
        agent: 'Synthesizer',
        prompt: `Synthesize the following research into a comprehensive report on ${topic}:
                 Technical: ${parallelResults.get('TechResearcher')}
                 Market: ${parallelResults.get('MarketResearcher')}
                 Legal: ${parallelResults.get('LegalResearcher')}`,
      },
    ],
  });

  return synthesis;
}

// ============= Pattern 8: Dynamic Tool Creation =============

export async function dynamicToolCreationExample(apiKey: string) {
  // Create tools dynamically based on runtime configuration
  const createDatabaseTool = (dbConfig: { host: string; database: string }) => ({
    name: 'query_database',
    description: 'Query the application database',
    parameters: z.object({
      query: z.string().describe('SQL query to execute'),
      limit: z.number().default(100),
    }),
    execute: async (params: any) => {
      // In production, connect to actual database
      console.log(`Executing query on ${dbConfig.host}/${dbConfig.database}: ${params.query}`);
      return {
        rows: [
          { id: 1, name: 'Sample', value: 100 },
          { id: 2, name: 'Data', value: 200 },
        ],
        rowCount: 2,
      };
    },
  });

  const createAPITool = (apiEndpoint: string, apiKey: string) => ({
    name: 'call_api',
    description: 'Call external API',
    parameters: z.object({
      method: z.enum(['GET', 'POST', 'PUT', 'DELETE']),
      path: z.string(),
      body: z.any().optional(),
    }),
    execute: async (params: any) => {
      const response = await fetch(`${apiEndpoint}${params.path}`, {
        method: params.method,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
      });
      return response.json();
    },
  });

  // Create agent with dynamically configured tools
  const agent = new OpenAIAgent(apiKey, {
    model: 'gpt-4-turbo-preview',
    temperature: 0.3,
    tools: [
      createDatabaseTool({ host: 'localhost', database: 'myapp' }),
      createAPITool('https://api.example.com', 'api-key-123'),
    ],
    parallelToolCalls: true,
  });

  const result = await agent.execute(
    'Get user data from the database and cross-reference with the external API'
  );

  return result;
}

// Export all examples
export const OpenAIPatternExamples = {
  structuredDataExtraction: structuredDataExtractionExample,
  parallelToolExecution: parallelToolExecutionExample,
  streaming: streamingExample,
  assistantWithMemory: assistantWithMemoryExample,
  multiAgentCollaboration: multiAgentCollaborationExample,
  feedbackLoop: feedbackLoopExample,
  parallelResearch: parallelResearchExample,
  dynamicToolCreation: dynamicToolCreationExample,
};