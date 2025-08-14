# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Agentic.Moda is a production-ready multi-framework AI agent orchestration platform built with Next.js 15. The platform enables sophisticated AI agent systems with OpenAI's latest patterns including parallel tool execution, structured outputs, and persistent memory via the Assistants API.

## Development Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production server  
npm run start

# Lint code
npm run lint
```

## Architecture

### Core Framework Stack
- **Next.js 15** with App Router (`src/app/`)
- **React 19** with TypeScript
- **Tailwind CSS** for styling
- **Supabase** for authentication and database
- **Radix UI** components for UI primitives

### Agent Architecture (`src/lib/agents/`)
- **`openai-agent.ts`** - Core OpenAI SDK integration with function calling, parallel tools, structured outputs
- **`assistant-orchestrator.ts`** - Assistants API wrapper with persistent threads and memory
- **`specialized-agents.ts`** - Domain-specific agent implementations

### Orchestration Patterns (`src/app/api/orchestrate/route.ts`)
The system implements multiple orchestration strategies:
- **Task Decomposition** - Intelligent breaking down of complex requests into parallel subtasks
- **Multi-Perspective** - Different viewpoint analysis (technical, creative, practical, critical, user-centric)
- **Raw Power** - Pure parallel execution for maximum throughput  
- **Feedback Loops** - Worker/judge iterative refinement

### Tools System (`src/lib/tools/`)
- **`function-tools.ts`** - Core tool definitions and OpenAI integration
- **`image-tools.ts`** - Replicate API integration for image generation/editing
- **`github-tools.ts`** - GitHub API integration
- **`replicate-advanced.ts`** - Advanced Replicate model management

### UI Components (`src/components/`)
- **`WorkflowBuilder.tsx`** - Visual drag-and-drop interface for agent workflows
- **`LayersManager.tsx`** - ArcGIS map layer management
- **`AuthModal.tsx`** - Supabase authentication interface

## Database Schema

The system uses Supabase with the following key tables (see `supabase-schema.sql`):
- `profiles` - User profiles extending auth.users
- `saved_prompts` - Prompt templates with metadata
- `saved_outputs` - Execution results and history
- `execution_history` - Complete audit trail of agent runs
- `conversations` - Persistent conversation threads

## Key Features

### True Parallel Execution
When using parallel patterns, the system executes multiple OpenAI API calls simultaneously using `Promise.all()`, providing genuine performance improvements rather than simulated parallelism.

### Intelligent Task Decomposition
The system can analyze complex requests and automatically break them into optimal subtasks for parallel processing, then synthesize results with consistency checking.

### Persistent Memory
Integration with OpenAI's Assistants API enables long-term memory and stateful conversations across sessions.

### Multi-Modal Capabilities
- Text generation and analysis
- Image generation via Replicate integration
- Code execution and review
- Web search and content extraction
- ArcGIS mapping integration

## Environment Variables

Required environment variables (add to `.env.local`):
```
OPENAI_API_KEY=your_openai_key
SUPABASE_URL=your_supabase_url  
SUPABASE_ANON_KEY=your_supabase_key
REPLICATE_API_TOKEN=your_replicate_token (optional)
NEXT_PUBLIC_ARCGIS_API_KEY=your_arcgis_key (optional)
```

## Testing

Use the built-in test scripts:
```bash
# Test image generation
node scripts/test-image-generation.js

# Run parallel image tests
node scripts/parallel-image-generation.js

# Run parallel execution tests
node parallel-test.js
```

## Deployment

The application is optimized for Vercel deployment. See `DEPLOYMENT.md` and `VERCEL_DEPLOY.md` for detailed deployment instructions including environment variable setup and custom domain configuration.

## Important Implementation Notes

### Agent Creation Pattern
When creating new agents, always:
1. Extend the base `OpenAIAgent` class in `src/lib/agents/openai-agent.ts`
2. Define tools using Zod schemas for type safety
3. Implement proper error handling and retry logic
4. Add parallel execution support where applicable

### API Route Structure
All agent endpoints follow the pattern in `src/app/api/orchestrate/route.ts`:
- POST for execution with comprehensive error handling
- GET for endpoint information and capabilities
- Proper Supabase integration for user authentication
- Execution history tracking for authenticated users

### Tool Integration
Tools must be registered in `src/lib/tools/function-tools.ts` with:
- Zod parameter schemas
- OpenAI-compatible function definitions
- Async execute methods with proper error handling

### Database Persistence
All user interactions are automatically saved when authenticated:
- Execution history with performance metrics
- Cost estimation based on token usage
- Prompt and output persistence with metadata
- Conversation thread continuity