// Specialized Agent Types with Unique Capabilities
// Designer, Developer, Writer, and more

import { OpenAIAgent } from './openai-agent';
import { Tool } from '../tools/function-tools';
import { IMAGE_GENERATION_TOOLS } from '../tools/image-tools';
import { GITHUB_TOOLS } from '../tools/github-tools';
import { z } from 'zod';

// ============= DESIGNER AGENT =============

export class DesignerAgent {
  private agent: OpenAIAgent;
  
  constructor(apiKey: string) {
    this.agent = new OpenAIAgent(apiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.8,
      systemPrompt: `You are an expert UI/UX designer with deep knowledge of:
      - Modern design principles and trends
      - Color theory and typography
      - User experience best practices
      - Accessibility standards (WCAG)
      - Design systems and component libraries
      - Responsive and mobile-first design
      - Animation and micro-interactions
      
      You create beautiful, functional designs that users love.`,
      tools: [IMAGE_GENERATION_TOOLS.generate_image],
    });
  }

  async createDesignSystem(brandDescription: string) {
    const prompt = `Create a comprehensive design system for: ${brandDescription}
    
    Include:
    1. Color palette (primary, secondary, accent, neutrals)
    2. Typography (font families, sizes, weights)
    3. Spacing system (8px grid)
    4. Component specifications
    5. Animation guidelines
    
    Output as structured JSON.`;

    return await this.agent.execute(prompt);
  }

  async generateUIComponent(componentType: string, style: string) {
    const prompt = `Design a ${componentType} component in ${style} style.
    Provide:
    1. HTML structure
    2. Tailwind CSS classes
    3. Interaction states
    4. Accessibility considerations`;

    return await this.agent.execute(prompt);
  }

  async createMoodBoard(concept: string) {
    // Generate multiple images for mood board
    const imagePrompts = [
      `Color palette inspiration for ${concept}`,
      `Typography and layout examples for ${concept}`,
      `UI component designs for ${concept}`,
      `Visual atmosphere and mood for ${concept}`,
    ];

    const images = [];
    for (const imagePrompt of imagePrompts) {
      const result = await IMAGE_GENERATION_TOOLS.generate_image.execute({
        prompt: imagePrompt,
        model: 'sdxl',
        width: 512,
        height: 512,
        style: 'modern design, clean, professional',
      });
      if (result.success) {
        images.push(result.images[0]);
      }
    }

    return { concept, images, timestamp: new Date().toISOString() };
  }

  async reviewDesign(designUrl: string) {
    const analysisResult = await IMAGE_GENERATION_TOOLS.analyze_image.execute({
      imageUrl: designUrl,
      analysisType: 'caption',
    });

    const prompt = `Review this design: ${analysisResult.result}
    
    Evaluate:
    1. Visual hierarchy
    2. Color usage
    3. Typography
    4. Spacing and alignment
    5. Accessibility concerns
    6. Improvement suggestions`;

    return await this.agent.execute(prompt);
  }
}

// ============= DEVELOPER AGENT =============

export class DeveloperAgent {
  private agent: OpenAIAgent;
  
  constructor(apiKey: string) {
    this.agent = new OpenAIAgent(apiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.3,
      systemPrompt: `You are a senior full-stack developer with expertise in:
      - Modern JavaScript/TypeScript
      - React, Next.js, Vue, Angular
      - Node.js, Python, Go
      - Database design (SQL and NoSQL)
      - API design (REST and GraphQL)
      - Testing and CI/CD
      - Security best practices
      - Performance optimization
      - Cloud services (AWS, GCP, Azure)
      
      You write clean, efficient, well-documented code.`,
      tools: [
        GITHUB_TOOLS.github_create_repo,
        GITHUB_TOOLS.github_create_files,
        GITHUB_TOOLS.github_create_app,
      ],
    });
  }

  async createApplication(requirements: string) {
    const prompt = `Analyze these requirements and create a full application: ${requirements}
    
    First, plan the architecture:
    1. Tech stack selection
    2. Project structure
    3. Database schema
    4. API endpoints
    5. Component hierarchy`;

    const plan = await this.agent.execute(prompt);

    // Now create the actual application
    const result = await GITHUB_TOOLS.github_create_app.execute({
      projectName: 'ai-generated-app',
      projectType: 'nextjs',
      description: requirements,
      features: ['TypeScript', 'Tailwind CSS', 'API Routes'],
      dependencies: ['axios', 'zod', 'zustand'],
      isPrivate: false,
    });

    return { plan, implementation: result };
  }

  async reviewCode(code: string, language: string) {
    const prompt = `Review this ${language} code:
    
    \`\`\`${language}
    ${code}
    \`\`\`
    
    Check for:
    1. Bugs and potential issues
    2. Security vulnerabilities
    3. Performance problems
    4. Code style and best practices
    5. Suggestions for improvement
    
    Provide specific line-by-line feedback.`;

    return await this.agent.execute(prompt);
  }

  async generateTests(code: string, framework: string = 'jest') {
    const prompt = `Generate comprehensive tests for this code using ${framework}:
    
    ${code}
    
    Include:
    1. Unit tests for all functions
    2. Edge cases
    3. Error handling tests
    4. Integration tests if applicable
    5. Test coverage should be >90%`;

    return await this.agent.execute(prompt);
  }

  async optimizeCode(code: string) {
    const prompt = `Optimize this code for performance:
    
    ${code}
    
    Focus on:
    1. Time complexity improvements
    2. Space complexity improvements
    3. Caching opportunities
    4. Parallel processing where applicable
    5. Database query optimization`;

    return await this.agent.execute(prompt);
  }
}

// ============= WRITER AGENT =============

export class WriterAgent {
  private agent: OpenAIAgent;
  
  constructor(apiKey: string) {
    this.agent = new OpenAIAgent(apiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7,
      systemPrompt: `You are a professional writer with expertise in:
      - Technical documentation
      - Marketing copy
      - Blog posts and articles
      - Social media content
      - Email campaigns
      - Product descriptions
      - SEO optimization
      - Storytelling
      
      You write clear, engaging, and purpose-driven content.`,
      tools: [],
    });
  }

  async createContent(
    type: 'blog' | 'documentation' | 'marketing' | 'social' | 'email',
    topic: string,
    options?: {
      tone?: string;
      wordCount?: number;
      keywords?: string[];
      audience?: string;
    }
  ) {
    const prompts: Record<string, string> = {
      blog: `Write a comprehensive blog post about ${topic}`,
      documentation: `Create technical documentation for ${topic}`,
      marketing: `Write compelling marketing copy for ${topic}`,
      social: `Create engaging social media posts about ${topic}`,
      email: `Write an email campaign about ${topic}`,
    };

    let prompt = prompts[type];
    
    if (options) {
      if (options.tone) prompt += `\nTone: ${options.tone}`;
      if (options.wordCount) prompt += `\nWord count: approximately ${options.wordCount}`;
      if (options.keywords) prompt += `\nInclude keywords: ${options.keywords.join(', ')}`;
      if (options.audience) prompt += `\nTarget audience: ${options.audience}`;
    }

    return await this.agent.execute(prompt);
  }

  async improveContent(content: string, goals: string[]) {
    const prompt = `Improve this content to achieve these goals: ${goals.join(', ')}
    
    Original content:
    ${content}
    
    Enhance for:
    1. Clarity and readability
    2. Engagement and interest
    3. SEO optimization
    4. Call-to-action effectiveness
    5. Overall impact`;

    return await this.agent.execute(prompt);
  }

  async generateOutline(topic: string, contentType: string) {
    const prompt = `Create a detailed outline for ${contentType} about ${topic}
    
    Include:
    1. Main sections with descriptions
    2. Key points for each section
    3. Supporting data/examples needed
    4. Estimated word count per section
    5. SEO keywords to target`;

    return await this.agent.execute(prompt);
  }
}

// ============= RESEARCHER AGENT =============

export class ResearcherAgent {
  private agent: OpenAIAgent;
  
  constructor(apiKey: string) {
    this.agent = new OpenAIAgent(apiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.5,
      systemPrompt: `You are an expert researcher skilled at:
      - Finding and synthesizing information
      - Fact-checking and verification
      - Data analysis
      - Market research
      - Competitive analysis
      - Academic research
      - Trend analysis
      
      You provide accurate, well-sourced information.`,
      tools: [], // Would add web search tools here
    });
  }

  async research(topic: string, depth: 'basic' | 'detailed' | 'comprehensive') {
    const depthInstructions = {
      basic: 'Provide a brief overview with key points',
      detailed: 'Include detailed analysis with examples and data',
      comprehensive: 'Exhaustive research with all aspects covered',
    };

    const prompt = `Research "${topic}"
    
    Depth: ${depthInstructions[depth]}
    
    Include:
    1. Overview and background
    2. Current state/trends
    3. Key players/stakeholders
    4. Challenges and opportunities
    5. Future outlook
    6. Data and statistics
    7. Sources and references`;

    return await this.agent.execute(prompt);
  }

  async compareOptions(options: string[], criteria: string[]) {
    const prompt = `Compare these options: ${options.join(', ')}
    
    Using these criteria: ${criteria.join(', ')}
    
    Create a detailed comparison matrix with:
    1. Scores for each criterion
    2. Pros and cons
    3. Best use cases
    4. Recommendations`;

    return await this.agent.execute(prompt);
  }

  async analyzeTrends(industry: string, timeframe: string) {
    const prompt = `Analyze trends in ${industry} over ${timeframe}
    
    Identify:
    1. Emerging trends
    2. Declining trends
    3. Market drivers
    4. Disruption factors
    5. Growth opportunities
    6. Risk factors
    7. Predictions`;

    return await this.agent.execute(prompt);
  }
}

// ============= PROJECT MANAGER AGENT =============

export class ProjectManagerAgent {
  private agent: OpenAIAgent;
  
  constructor(apiKey: string) {
    this.agent = new OpenAIAgent(apiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.4,
      systemPrompt: `You are an experienced project manager skilled in:
      - Agile and Scrum methodologies
      - Resource planning
      - Risk management
      - Timeline estimation
      - Team coordination
      - Stakeholder communication
      - Budget management
      
      You help teams deliver projects successfully.`,
      tools: [],
    });
  }

  async createProjectPlan(projectDescription: string) {
    const prompt = `Create a comprehensive project plan for: ${projectDescription}
    
    Include:
    1. Project phases and milestones
    2. Task breakdown (WBS)
    3. Timeline with dependencies
    4. Resource requirements
    5. Risk assessment and mitigation
    6. Success metrics
    7. Communication plan`;

    return await this.agent.execute(prompt);
  }

  async estimateProject(requirements: string) {
    const prompt = `Estimate this project: ${requirements}
    
    Provide:
    1. Time estimate (with confidence range)
    2. Team size and roles needed
    3. Technology requirements
    4. Budget estimate
    5. Major risks
    6. Critical dependencies`;

    return await this.agent.execute(prompt);
  }

  async createSprintPlan(backlog: string[], sprintDuration: number) {
    const prompt = `Create a sprint plan for ${sprintDuration} weeks
    
    Backlog items: ${backlog.join(', ')}
    
    Organize into:
    1. Sprint goals
    2. User stories with acceptance criteria
    3. Task assignments
    4. Story points
    5. Daily standup topics
    6. Sprint review agenda`;

    return await this.agent.execute(prompt);
  }
}

// ============= AGENT FACTORY =============

export type AgentType = 'designer' | 'developer' | 'writer' | 'researcher' | 'project-manager';

export function createSpecializedAgent(type: AgentType, apiKey: string) {
  switch (type) {
    case 'designer':
      return new DesignerAgent(apiKey);
    case 'developer':
      return new DeveloperAgent(apiKey);
    case 'writer':
      return new WriterAgent(apiKey);
    case 'researcher':
      return new ResearcherAgent(apiKey);
    case 'project-manager':
      return new ProjectManagerAgent(apiKey);
    default:
      throw new Error(`Unknown agent type: ${type}`);
  }
}

// ============= MULTI-AGENT COLLABORATION =============

export class AgentTeam {
  private agents: Map<string, any> = new Map();
  
  constructor(private apiKey: string) {}
  
  addAgent(name: string, type: AgentType) {
    const agent = createSpecializedAgent(type, this.apiKey);
    this.agents.set(name, { type, agent });
  }
  
  async collaborate(task: string, workflow: Array<{ agent: string; action: string }>) {
    const results: Array<{ agent: string; output: any }> = [];
    let context = task;
    
    for (const step of workflow) {
      const agentInfo = this.agents.get(step.agent);
      if (!agentInfo) {
        throw new Error(`Agent ${step.agent} not found`);
      }
      
      console.log(`${step.agent} is working on: ${step.action}`);
      
      // Execute based on agent type and action
      let output;
      switch (agentInfo.type) {
        case 'designer':
          if (step.action.includes('mood board')) {
            output = await agentInfo.agent.createMoodBoard(context);
          } else if (step.action.includes('design system')) {
            output = await agentInfo.agent.createDesignSystem(context);
          } else {
            output = await agentInfo.agent.generateUIComponent('component', context);
          }
          break;
          
        case 'developer':
          if (step.action.includes('create')) {
            output = await agentInfo.agent.createApplication(context);
          } else if (step.action.includes('review')) {
            output = await agentInfo.agent.reviewCode(context, 'typescript');
          } else {
            output = await agentInfo.agent.generateTests(context);
          }
          break;
          
        case 'writer':
          output = await agentInfo.agent.createContent('documentation', context);
          break;
          
        case 'researcher':
          output = await agentInfo.agent.research(context, 'detailed');
          break;
          
        case 'project-manager':
          output = await agentInfo.agent.createProjectPlan(context);
          break;
      }
      
      results.push({ agent: step.agent, output });
      
      // Use output as context for next agent
      context = typeof output === 'string' ? output : JSON.stringify(output);
    }
    
    return results;
  }
}
