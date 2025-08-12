// src/app/api/orchestrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { OpenAIAgent } from '@/lib/agents/openai-agent';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, pattern, agents } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured' },
        { status: 500 }
      );
    }

    let result: any = {};

    switch (pattern) {
      case 'simple':
        // Simple single agent query
        const simpleAgent = new OpenAIAgent(apiKey, {
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          systemPrompt: 'You are a helpful AI assistant.',
        });
        
        const response = await simpleAgent.execute(prompt);
        result = {
          output: response,
          agents: [{ name: 'Assistant', status: 'completed', output: response }],
        };
        break;

      case 'parallel':
        // Parallel execution with multiple tools
        const parallelAgent = new OpenAIAgent(apiKey, {
          model: 'gpt-4-turbo-preview',
          temperature: 0.5,
          parallelToolCalls: true,
          systemPrompt: 'You are a research assistant. Use multiple tools to gather comprehensive information.',
          tools: [
            {
              name: 'web_search',
              description: 'Search the web for information',
              parameters: z.object({
                query: z.string(),
              }),
              execute: async (params) => {
                // Simulate web search
                return {
                  results: [
                    'Latest AI trends include multimodal models',
                    'Agent orchestration is growing rapidly',
                    'OpenAI function calling enables new patterns',
                  ],
                };
              },
            },
            {
              name: 'analyze_data',
              description: 'Analyze and summarize data',
              parameters: z.object({
                data: z.array(z.string()),
              }),
              execute: async (params) => {
                return {
                  summary: 'Key insights from the data analysis',
                  trends: ['Trend 1', 'Trend 2'],
                };
              },
            },
          ],
        });

        const parallelResult = await parallelAgent.execute(prompt);
        result = {
          output: parallelResult,
          agents: [
            { name: 'Researcher', status: 'completed', output: 'Found 3 sources' },
            { name: 'Analyzer', status: 'completed', output: 'Identified key trends' },
          ],
        };
        break;

      case 'structured':
        // Structured output with validation
        const StructuredSchema = z.object({
          summary: z.string().max(500),
          key_points: z.array(z.string()),
          confidence: z.number().min(0).max(100),
          recommendations: z.array(z.string()),
        });

        const structuredAgent = new OpenAIAgent(apiKey, {
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          systemPrompt: 'Provide structured analysis with clear recommendations.',
          responseFormat: StructuredSchema,
        });

        const structuredResult = await structuredAgent.execute(prompt, {
          structuredOutput: true,
        });

        result = {
          output: JSON.stringify(structuredResult, null, 2),
          agents: [{ name: 'Analyst', status: 'completed', output: structuredResult }],
        };
        break;

      case 'feedback':
        // Feedback loop pattern (simplified for demo)
        const workerAgent = new OpenAIAgent(apiKey, {
          model: 'gpt-4-turbo-preview',
          temperature: 0.7,
          systemPrompt: 'You are a content writer. Create high-quality content.',
        });

        const judgeAgent = new OpenAIAgent(apiKey, {
          model: 'gpt-4-turbo-preview',
          temperature: 0.3,
          systemPrompt: 'You are a quality reviewer. Evaluate content and provide feedback.',
        });

        // First attempt
        let content = await workerAgent.execute(prompt);
        
        // Judge reviews
        const feedback = await judgeAgent.execute(
          `Review this content and provide feedback: ${content}`
        );
        
        // Worker improves based on feedback
        const improvedContent = await workerAgent.execute(
          `Improve this based on feedback: ${feedback}\n\nOriginal: ${content}`
        );

        result = {
          output: improvedContent,
          agents: [
            { name: 'Writer', status: 'completed', output: 'Created initial draft' },
            { name: 'Judge', status: 'completed', output: 'Provided feedback' },
            { name: 'Writer', status: 'completed', output: 'Improved based on feedback' },
          ],
          feedback: feedback,
        };
        break;

      default:
        result = {
          output: 'Unknown pattern selected',
          agents: [],
        };
    }

    return NextResponse.json({
      success: true,
      result,
      pattern,
      timestamp: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error('Orchestration error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Failed to run orchestration',
      },
      { status: 500 }
    );
  }
}

// GET endpoint for testing
export async function GET() {
  return NextResponse.json({
    message: 'Orchestration API is running',
    patterns: ['simple', 'parallel', 'structured', 'feedback'],
    version: '1.0.0',
  });
}