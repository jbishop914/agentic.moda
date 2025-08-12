// src/app/api/orchestrate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { AVAILABLE_TOOLS, convertToolsForOpenAI } from '@/lib/tools/function-tools';

// Orchestration strategies
const ORCHESTRATION_STRATEGIES = {
  POWER: 'power',           // Raw parallel processing for speed
  DECOMPOSE: 'decompose',   // Smart task breakdown
  PERSPECTIVES: 'perspectives', // Different viewpoints
  CONSENSUS: 'consensus'    // Multiple agents vote/agree
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, pattern, systemPrompt, parallelAgents, tools, conversationHistory, strategy = 'decompose' } = body;

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured. Add OPENAI_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    // Check if user is authenticated for saving history
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    let result: any = {};
    const startTime = Date.now();

    // Build messages array with conversation history if provided
    const messages: any[] = [
      {
        role: 'system',
        content: systemPrompt || `You are an AI orchestration assistant. Pattern: ${pattern}`
      }
    ];

    if (conversationHistory && conversationHistory.length > 0) {
      messages.push(...conversationHistory);
    }

    messages.push({
      role: 'user',
      content: prompt
    });

    // Handle different patterns
    if (pattern === 'parallel' && parallelAgents > 1) {
      
      // SMART PARALLEL EXECUTION WITH TASK DECOMPOSITION
      if (strategy === 'decompose') {
        console.log(`[SMART PARALLEL] Using task decomposition strategy with ${parallelAgents} agents`);
        
        // Step 1: Analyze and decompose the task
        const decompositionStart = Date.now();
        const taskAnalysisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: `You are a task decomposition specialist. Break down complex requests into ${parallelAgents} distinct, non-overlapping subtasks. Output a JSON array of task descriptions.`
              },
              {
                role: 'user',
                content: `Break this request into ${parallelAgents} specific subtasks that can be done in parallel without redundancy:\n\n"${prompt}"\n\nRespond with ONLY a JSON array like: ["subtask 1 description", "subtask 2 description", ...]`
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        const analysisData = await taskAnalysisResponse.json();
        let subtasks: string[] = [];
        
        try {
          // Parse the subtasks from the response
          const analysisOutput = analysisData.choices[0].message.content;
          subtasks = JSON.parse(analysisOutput);
          console.log(`[SMART PARALLEL] Task decomposed in ${Date.now() - decompositionStart}ms into:`, subtasks);
        } catch (e) {
          // Fallback to generic subtasks if parsing fails
          console.log('[SMART PARALLEL] Failed to parse subtasks, using generic approach');
          subtasks = Array(parallelAgents).fill(prompt).map((p, i) => `${p} (Part ${i + 1} of ${parallelAgents})`);
        }

        // Step 2: Execute specialized agents in parallel
        const parallelStartTime = Date.now();
        const parallelPromises = subtasks.map((subtask, i) => {
          const specializedPrompt = {
            role: 'system',
            content: `You are a specialist agent focused on this specific aspect of the task: "${subtask}". 
                     Provide a detailed response for your assigned portion only. 
                     Do not attempt to address other aspects that other agents are handling.
                     Original full request for context: "${prompt}"`
          };

          return fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo-preview',
              messages: [
                specializedPrompt,
                { role: 'user', content: subtask }
              ],
              temperature: 0.7,
              max_tokens: 1500
            })
          }).then(res => res.json());
        });

        const parallelResults = await Promise.all(parallelPromises);
        console.log(`[SMART PARALLEL] All specialized agents completed in ${Date.now() - parallelStartTime}ms`);

        // Step 3: Intelligent synthesis with consistency checking
        const combinedOutputs = parallelResults.map((res, idx) => ({
          agent: `Agent ${idx + 1}`,
          subtask: subtasks[idx],
          output: res.choices?.[0]?.message?.content || 'No response',
          tokens: res.usage?.total_tokens || 0
        }));

        const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: `You are a synthesis and consistency specialist. Your job is to:
                         1. Combine the specialized outputs into a coherent whole
                         2. Ensure consistency across all parts
                         3. Remove any redundancy
                         4. Fill any gaps between the parts
                         5. Create a unified, polished final response`
              },
              {
                role: 'user',
                content: `Original request: "${prompt}"\n\nTask breakdown:\n${subtasks.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\nSpecialized outputs:\n${combinedOutputs.map(o => `\n[${o.subtask}]:\n${o.output}`).join('\n\n')}\n\nSynthesize these into a complete, consistent response:`
              }
            ],
            temperature: 0.5,
            max_tokens: 2000
          })
        });

        const synthesisData = await synthesisResponse.json();
        console.log(`[SMART PARALLEL] Synthesis complete. Total time: ${Date.now() - decompositionStart}ms`);
        
        result = {
          output: `## 🎯 Smart Parallel Execution (Task Decomposition)\n\n${synthesisData.choices[0].message.content}\n\n---\n\n### Task Breakdown:\n${subtasks.map((s, i) => `${i + 1}. **${s}**`).join('\n')}\n\n### Execution Details:\n- Strategy: Task Decomposition\n- Parallel Agents: ${parallelAgents}\n- Total Time: ${Date.now() - decompositionStart}ms\n- Decomposition Time: ${parallelStartTime - decompositionStart}ms\n- Parallel Execution: ${Date.now() - parallelStartTime}ms`,
          agents: combinedOutputs.map(o => ({
            name: o.agent,
            status: 'completed',
            subtask: o.subtask,
            output: o.output.substring(0, 100) + '...'
          })),
          totalTokens: combinedOutputs.reduce((sum, o) => sum + o.tokens, 0) + (synthesisData.usage?.total_tokens || 0),
          executionDetails: {
            strategy: 'decompose',
            parallelAgents,
            subtasks,
            totalTime: Date.now() - decompositionStart
          }
        };

      } else if (strategy === 'perspectives') {
        // DIFFERENT PERSPECTIVES STRATEGY
        console.log(`[PERSPECTIVES] Getting ${parallelAgents} different perspectives`);
        
        const perspectives = [
          'technical and analytical perspective',
          'creative and innovative perspective', 
          'practical and implementation-focused perspective',
          'critical and risk-aware perspective',
          'user-centric and empathetic perspective'
        ].slice(0, parallelAgents);

        const parallelStartTime = Date.now();
        const parallelPromises = perspectives.map((perspective, i) => {
          return fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo-preview',
              messages: [
                {
                  role: 'system',
                  content: `You are an expert providing a ${perspective}. Focus exclusively on this viewpoint.`
                },
                { role: 'user', content: prompt }
              ],
              temperature: 0.8,
              max_tokens: 1000
            })
          }).then(res => res.json());
        });

        const parallelResults = await Promise.all(parallelPromises);
        
        // Synthesize perspectives
        const combinedOutputs = parallelResults.map((res, idx) => ({
          agent: `${perspectives[idx]} Agent`,
          output: res.choices?.[0]?.message?.content || 'No response',
          tokens: res.usage?.total_tokens || 0
        }));

        const synthesisResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'Synthesize these different perspectives into a balanced, comprehensive response.'
              },
              {
                role: 'user',
                content: `Original request: "${prompt}"\n\nPerspectives:\n${combinedOutputs.map(o => `${o.agent}:\n${o.output}`).join('\n\n')}`
              }
            ],
            temperature: 0.5,
            max_tokens: 1500
          })
        });

        const synthesisData = await synthesisResponse.json();
        
        result = {
          output: `## 🔍 Multi-Perspective Analysis\n\n${synthesisData.choices[0].message.content}\n\n---\n\n### Perspectives Considered:\n${perspectives.map(p => `- ${p}`).join('\n')}\n\n⚡ Execution: ${parallelAgents} perspectives analyzed in ${Date.now() - parallelStartTime}ms`,
          agents: combinedOutputs.map(o => ({
            name: o.agent,
            status: 'completed',
            output: o.output.substring(0, 100) + '...'
          })),
          totalTokens: combinedOutputs.reduce((sum, o) => sum + o.tokens, 0) + (synthesisData.usage?.total_tokens || 0)
        };

      } else {
        // RAW POWER MODE - Original implementation
        console.log(`[RAW POWER] Running ${parallelAgents} agents for maximum throughput`);
        const parallelStartTime = Date.now();
        const parallelPromises = [];
        
        for (let i = 0; i < parallelAgents; i++) {
          const agentMessages = [
            {
              role: 'system',
              content: `${systemPrompt || 'You are a helpful AI assistant'} You are Agent ${i + 1} of ${parallelAgents}. Provide a complete, unique response.`
            },
            { role: 'user', content: prompt }
          ];

          parallelPromises.push(
            fetch('https://api.openai.com/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
              },
              body: JSON.stringify({
                model: 'gpt-4-turbo-preview',
                messages: agentMessages,
                temperature: 0.7 + (i * 0.1),
                max_tokens: 1000
              })
            }).then(res => res.json())
          );
        }

        const parallelResults = await Promise.all(parallelPromises);
        const combinedOutputs = parallelResults.map((res, idx) => ({
          agent: `Agent ${idx + 1}`,
          output: res.choices?.[0]?.message?.content || 'No response',
          tokens: res.usage?.total_tokens || 0
        }));

        // Simple combination for raw power mode
        result = {
          output: `## ⚡ Raw Parallel Power (${parallelAgents} Agents)\n\n${combinedOutputs.map((o, i) => `### Response ${i + 1}:\n${o.output}`).join('\n\n---\n\n')}\n\n⚡ Execution: ${parallelAgents} complete responses in ${Date.now() - parallelStartTime}ms`,
          agents: combinedOutputs.map(o => ({
            name: o.agent,
            status: 'completed',
            output: o.output.substring(0, 100) + '...'
          })),
          totalTokens: combinedOutputs.reduce((sum, o) => sum + o.tokens, 0)
        };
      }

    } else if (pattern === 'feedback') {
      // FEEDBACK LOOP PATTERN (unchanged)
      let currentOutput = '';
      let iterations = 0;
      const maxIterations = 3;
      let approved = false;

      while (iterations < maxIterations && !approved) {
        const workerResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: systemPrompt || 'You are a content creator. Create high-quality content.'
              },
              {
                role: 'user',
                content: iterations === 0 ? prompt : `Improve this based on feedback: ${currentOutput}`
              }
            ],
            temperature: 0.7,
            max_tokens: 1000
          })
        });

        const workerData = await workerResponse.json();
        currentOutput = workerData.choices[0].message.content;

        const judgeResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4-turbo-preview',
            messages: [
              {
                role: 'system',
                content: 'You are a quality reviewer. Evaluate content and provide feedback. If it meets high standards, respond with "APPROVED". Otherwise, provide specific improvement suggestions.'
              },
              {
                role: 'user',
                content: `Review this content: ${currentOutput}`
              }
            ],
            temperature: 0.3,
            max_tokens: 500
          })
        });

        const judgeData = await judgeResponse.json();
        const feedback = judgeData.choices[0].message.content;
        
        approved = feedback.includes('APPROVED');
        iterations++;

        if (!approved && iterations < maxIterations) {
          currentOutput = feedback;
        }
      }

      result = {
        output: currentOutput,
        agents: [
          { name: 'Worker', status: 'completed', output: 'Created and refined content' },
          { name: 'Judge', status: 'completed', output: `Reviewed ${iterations} iterations` }
        ],
        iterations,
        approved
      };

    } else {
      // SIMPLE SINGLE AGENT WITH FUNCTION CALLING
      const openAITools = tools && tools.length > 0 ? convertToolsForOpenAI(tools) : [];
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4-turbo-preview',
          messages,
          temperature: 0.7,
          max_tokens: 1000,
          ...(openAITools.length > 0 && {
            tools: openAITools,
            tool_choice: 'auto'
          })
        })
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`OpenAI API error: ${error}`);
      }

      const data = await response.json();
      let output = data.choices[0].message.content;
      
      // Handle function calls if present
      if (data.choices[0].message.tool_calls) {
        const toolCalls = data.choices[0].message.tool_calls;
        const toolResults = [];
        
        for (const toolCall of toolCalls) {
          const tool = AVAILABLE_TOOLS[tools.find((t: string) => 
            AVAILABLE_TOOLS[t]?.name === toolCall.function.name
          ) || ''];
          
          if (tool) {
            try {
              const params = JSON.parse(toolCall.function.arguments);
              const result = await tool.execute(params);
              toolResults.push({
                tool: toolCall.function.name,
                result
              });
            } catch (error: any) {
              toolResults.push({
                tool: toolCall.function.name,
                error: error.message
              });
            }
          }
        }
        
        // If tools were called, make another call with the results
        if (toolResults.length > 0) {
          const followUpMessages = [
            ...messages,
            data.choices[0].message,
            ...toolResults.map(tr => ({
              role: 'tool' as const,
              content: JSON.stringify(tr.result),
              tool_call_id: toolCalls.find((tc: any) => tc.function.name === tr.tool)?.id
            }))
          ];
          
          const followUpResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
              model: 'gpt-4-turbo-preview',
              messages: followUpMessages,
              temperature: 0.7,
              max_tokens: 1000
            })
          });
          
          const followUpData = await followUpResponse.json();
          output = `${followUpData.choices[0].message.content}\n\n**Tools Used:**\n${toolResults.map(tr => 
            `- ${tr.tool}: ${JSON.stringify(tr.result).substring(0, 100)}...`
          ).join('\n')}`;
        }
      }

      result = {
        output,
        agents: [
          { name: 'Assistant', status: 'completed', output: 'Task completed' }
        ],
        tokens: data.usage?.total_tokens
      };
    }

    const executionTime = Date.now() - startTime;

    // Save to execution history if user is authenticated
    if (user) {
      await supabase.from('execution_history').insert({
        user_id: user.id,
        prompt,
        output: result.output,
        pattern,
        status: 'completed',
        execution_time_ms: executionTime,
        tokens_used: result.totalTokens || result.tokens,
        cost_estimate: ((result.totalTokens || result.tokens || 0) / 1000) * 0.01,
        metadata: { systemPrompt, parallelAgents, tools, strategy }
      });
    }

    return NextResponse.json({
      success: true,
      result,
      pattern,
      executionTime,
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

export async function GET() {
  return NextResponse.json({
    message: 'Orchestration API is running',
    patterns: ['simple', 'parallel', 'structured', 'feedback'],
    strategies: ['decompose', 'perspectives', 'power'],
    availableTools: Object.keys(AVAILABLE_TOOLS),
    features: ['task-decomposition', 'multi-perspective', 'true-parallel-execution', 'feedback-loops', 'function-calling'],
    version: '3.1.0',
  });
}