// Architecture Design Agent System
// Converts vision → JSON → Floorplan → 3D Render

import { z } from 'zod';
import { OpenAIAgent } from '../agents/openai-agent';
import { replicateImageTool } from '../tools/image-tools';

// ============= STRUCTURED SCHEMAS =============

// Define the exact JSON structure for architectural specifications
export const ArchitecturalSpecSchema = z.object({
  project: z.object({
    name: z.string(),
    type: z.enum(['residential', 'commercial', 'mixed-use', 'industrial']),
    style: z.enum(['modern', 'traditional', 'contemporary', 'minimalist', 'classical', 'industrial']),
    totalSquareFeet: z.number(),
    stories: z.number(),
    estimatedBudget: z.number().optional(),
  }),
  
  dimensions: z.object({
    lot: z.object({
      width: z.number().describe('Width in feet'),
      depth: z.number().describe('Depth in feet'),
      area: z.number().describe('Total lot area in square feet'),
    }),
    building: z.object({
      width: z.number(),
      depth: z.number(),
      height: z.number(),
      footprint: z.number().describe('Building footprint in square feet'),
    }),
  }),
  
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum([
      'bedroom', 'bathroom', 'kitchen', 'living_room', 'dining_room',
      'office', 'garage', 'hallway', 'closet', 'laundry', 'pantry',
      'basement', 'attic', 'balcony', 'patio', 'deck'
    ]),
    floor: z.number(),
    dimensions: z.object({
      width: z.number(),
      length: z.number(),
      height: z.number().default(9),
      area: z.number(),
    }),
    position: z.object({
      x: z.number().describe('X coordinate on floorplan'),
      y: z.number().describe('Y coordinate on floorplan'),
    }),
    features: z.array(z.string()).optional(),
    windows: z.number().default(0),
    doors: z.array(z.object({
      to: z.string().describe('Room ID this door connects to'),
      type: z.enum(['standard', 'double', 'sliding', 'french', 'pocket']),
      width: z.number().default(3),
    })),
  })),
  
  features: z.object({
    exterior: z.object({
      siding: z.enum(['vinyl', 'wood', 'brick', 'stone', 'stucco', 'metal', 'composite']),
      roofType: z.enum(['gable', 'hip', 'flat', 'shed', 'mansard', 'gambrel']),
      roofMaterial: z.enum(['asphalt', 'metal', 'tile', 'slate', 'wood']),
      foundationType: z.enum(['slab', 'crawlspace', 'basement', 'pier']),
    }),
    interior: z.object({
      flooring: z.record(z.enum(['hardwood', 'tile', 'carpet', 'laminate', 'vinyl', 'concrete'])),
      ceilingHeight: z.number().default(9),
      hasOpenFloorPlan: z.boolean(),
      hasVaultedCeilings: z.boolean(),
    }),
    systems: z.object({
      heating: z.enum(['forced-air', 'radiant', 'baseboard', 'heat-pump', 'geothermal']),
      cooling: z.enum(['central-ac', 'split-system', 'window-units', 'evaporative', 'none']),
      electrical: z.enum(['100-amp', '150-amp', '200-amp', '400-amp']),
      plumbing: z.object({
        bathrooms: z.number(),
        kitchens: z.number(),
        waterHeater: z.enum(['tank', 'tankless', 'solar', 'hybrid']),
      }),
    }),
    sustainability: z.object({
      solarPanels: z.boolean(),
      energyEfficiencyRating: z.enum(['standard', 'energy-star', 'leed-certified', 'passive-house']).optional(),
      rainwaterHarvesting: z.boolean().optional(),
      grayWaterRecycling: z.boolean().optional(),
    }).optional(),
  }),
  
  aesthetics: z.object({
    colorScheme: z.object({
      primary: z.string(),
      secondary: z.string(),
      accent: z.string(),
    }),
    materials: z.array(z.string()),
    lightingDesign: z.enum(['ambient', 'task', 'accent', 'decorative', 'mixed']),
    landscaping: z.object({
      style: z.enum(['formal', 'informal', 'xeriscape', 'native', 'modern']),
      features: z.array(z.string()).optional(),
    }).optional(),
  }),
});

export type ArchitecturalSpec = z.infer<typeof ArchitecturalSpecSchema>;

// ============= AGENT SYSTEM =============

export class ArchitectureDesignSystem {
  private visionParser: OpenAIAgent;
  private salesmanAgent: OpenAIAgent;
  private qualityJudge: OpenAIAgent;
  private floorplanGenerator: any;
  private renderGenerator: any;

  constructor(openaiKey: string, replicateKey: string) {
    // Agent 1: Salesman/Orchestrator - Guides clients and gathers requirements
    this.salesmanAgent = new OpenAIAgent(openaiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.7, // Higher temperature for more natural conversation
      systemPrompt: `You are a professional architectural consultant and salesman. Your role is to:

1. **Listen carefully** to client visions and requirements
2. **Ask clarifying questions** to gather missing information
3. **Explain the process** of turning their vision into reality
4. **Guide them through** what information you need to create their dream home
5. **Be enthusiastic and professional** - you're selling a premium service

When a client describes their vision, analyze what they've provided and what's missing. Then:
- Acknowledge what they've shared
- Ask specific questions about missing details (size, style, rooms, features, budget)
- Explain what you'll create for them (detailed plans, 3D renders, etc.)
- Build excitement about the final result

Be conversational, professional, and thorough. Don't just accept vague descriptions - dig deeper to get the details needed for a perfect design.`,
    });

    // Agent 2: Vision Parser - Converts natural language to structured JSON
    this.visionParser = new OpenAIAgent(openaiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.3, // Low temperature for consistency
      systemPrompt: `You are an expert architectural designer who converts client visions into precise technical specifications.
      
      Your task is to take any description of a building/house and output a complete, valid JSON specification following the exact schema provided.
      
      Important rules:
      1. All measurements must be realistic and to scale
      2. Room positions must not overlap
      3. Total room areas should approximately equal the total square footage
      4. Doors must connect to adjacent rooms
      5. Be precise with dimensions - everything should fit together perfectly
      6. If information is not provided, make reasonable architectural assumptions
      7. Ensure the output is valid JSON that matches the schema exactly`,
      responseFormat: ArchitecturalSpecSchema,
    });

    // Agent 3: Quality Judge - Reviews work before client presentation
    this.qualityJudge = new OpenAIAgent(openaiKey, {
      model: 'gpt-4-turbo-preview',
      temperature: 0.4, // Balanced for analytical thinking
      systemPrompt: `You are the Chief Architect and Quality Control Manager. Your role is to:

1. **Review all design work** before it goes to the client
2. **Compare specifications against original client vision** for accuracy
3. **Identify discrepancies** between client requirements and generated designs
4. **Provide detailed feedback** to the design team for improvements
5. **Ensure professional quality** standards are met

When reviewing work, analyze:
- Does the specification match the client's stated requirements?
- Are room sizes and layouts practical and functional?
- Do the style choices align with client preferences?
- Are there any architectural inconsistencies or problems?
- Is the design buildable and up to professional standards?

Provide constructive feedback for improvements or approve for client presentation.`,
    });

    // Store keys for image generation
    this.floorplanGenerator = { replicateKey };
    this.renderGenerator = { replicateKey };
  }

  /**
   * Consultation Mode: Salesman agent analyzes vision and guides client
   */
  async consultationMode(vision: string): Promise<{
    success: boolean;
    consultation: string;
    questions: string[];
    readiness: 'ready' | 'needs_more_info';
    completeness: number;
    nextSteps: string;
  }> {
    const prompt = `A client has shared their vision for a home design project:

"${vision}"

As their architectural consultant, analyze what they've provided and respond with:

1. Professional acknowledgment of their vision
2. Assessment of what information is complete vs. missing
3. Specific questions to gather missing details (dimensions, room count, style preferences, budget, etc.)
4. Explanation of our design process and what they'll receive
5. Next steps to move forward

Be enthusiastic but thorough. If their vision is complete enough to proceed, let them know. If not, guide them on what else you need.`;

    const consultation = await this.salesmanAgent.execute(prompt);

    // Analyze completeness
    const completeness = this.assessVisionCompleteness(vision);
    const readiness = completeness >= 0.7 ? 'ready' : 'needs_more_info';
    
    const questions = this.generateFollowUpQuestions(vision);

    return {
      success: true,
      consultation: consultation || 'Thank you for sharing your vision! Let me analyze this and provide some guidance.',
      questions,
      readiness,
      completeness: Math.round(completeness * 100),
      nextSteps: readiness === 'ready' 
        ? 'We have enough information to begin creating your architectural designs!' 
        : 'Let\'s gather a few more details to ensure we create the perfect design for you.'
    };
  }

  /**
   * Assess how complete a vision description is
   */
  private assessVisionCompleteness(vision: string): number {
    const visionLower = vision.toLowerCase();
    let score = 0.2; // Base score for providing any description
    
    // Check for key information categories
    const categories = [
      { patterns: [/\d+\s*(sq|square)\s*(ft|feet)/i, /footprint/i], weight: 0.15, name: 'size' },
      { patterns: [/\d+\s*stor/i, /single|two|three/i], weight: 0.1, name: 'stories' },
      { patterns: [/bedroom|bath|kitchen|living|office/i], weight: 0.15, name: 'rooms' },
      { patterns: [/colonial|modern|traditional|contemporary|victorian/i], weight: 0.1, name: 'style' },
      { patterns: [/\d+ft\s*x\s*\d+ft/i, /width|depth|length/i], weight: 0.15, name: 'dimensions' },
      { patterns: [/budget|cost|\$\d+/i], weight: 0.1, name: 'budget' },
      { patterns: [/materials|brick|wood|stone|siding/i], weight: 0.05, name: 'materials' }
    ];
    
    for (const category of categories) {
      const hasInfo = category.patterns.some(pattern => pattern.test(visionLower));
      if (hasInfo) score += category.weight;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Generate follow-up questions based on missing information
   */
  private generateFollowUpQuestions(vision: string): string[] {
    const visionLower = vision.toLowerCase();
    const questions: string[] = [];
    
    if (!/\d+\s*(sq|square)\s*(ft|feet)/i.test(visionLower) && !/footprint/i.test(visionLower)) {
      questions.push('What\'s your target square footage or building footprint?');
    }
    
    if (!/\d+ft\s*x\s*\d+ft/i.test(visionLower) && !/width|depth|length/i.test(visionLower)) {
      questions.push('Do you have specific lot dimensions or building size requirements?');
    }
    
    if (!/(colonial|modern|traditional|contemporary|victorian|minimalist|industrial)/i.test(visionLower)) {
      questions.push('What architectural style appeals to you most?');
    }
    
    if (!/budget|cost|\$\d+/i.test(visionLower)) {
      questions.push('What\'s your target budget range for this project?');
    }
    
    if (!/(bedroom.*\d+|\d+.*bedroom)/i.test(visionLower)) {
      questions.push('How many bedrooms do you need?');
    }
    
    if (!/(bathroom.*\d+|\d+.*bathroom)/i.test(visionLower)) {
      questions.push('How many bathrooms would you like?');
    }
    
    if (!/materials|exterior|siding|roofing/i.test(visionLower)) {
      questions.push('Do you have preferences for exterior materials or finishes?');
    }
    
    return questions.slice(0, 5); // Limit to 5 questions to avoid overwhelming
  }

  /**
   * Step 1: Parse vision to structured JSON
   */
  async parseVision(vision: string): Promise<ArchitecturalSpec> {
    const prompt = `Convert this architectural vision into a detailed technical specification:

    "${vision}"

    Generate a complete architectural specification with:
    - Exact room dimensions and positions
    - All rooms properly connected with doors
    - Realistic measurements (room sizes, ceiling heights, etc.)
    - Complete feature specifications
    - Proper room layout that makes architectural sense

    Output valid JSON matching the ArchitecturalSpec schema.`;

    const result = await this.visionParser.execute(prompt, {
      structuredOutput: true,
    });

    // Parse and validate the JSON
    try {
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      return ArchitecturalSpecSchema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse architectural spec:', error);
      throw new Error('Failed to generate valid architectural specification');
    }
  }

  /**
   * Step 2: Generate floorplan from JSON
   */
  async generateFloorplan(spec: ArchitecturalSpec): Promise<string> {
    // Convert the JSON spec to a detailed floorplan prompt
    const floorplanPrompt = this.specToFloorplanPrompt(spec);

    const result = await replicateImageTool.execute({
      prompt: floorplanPrompt,
      model: 'sdxl',
      negativePrompt: 'blurry, distorted, unrealistic, artistic, 3D, perspective view, furniture, decorations',
      width: 1024,
      height: 1024,
      numOutputs: 1,
      guidanceScale: 9, // High guidance for accuracy
      steps: 60,
      style: 'technical architectural drawing, CAD style, precise measurements, professional floorplan',
    });

    if (result.error) {
      throw new Error(`Floorplan generation failed: ${result.message}`);
    }

    return result.images[0];
  }

  /**
   * Step 3: Generate 3D rendering from floorplan
   */
  async generate3DRender(
    floorplanUrl: string,
    spec: ArchitecturalSpec,
    viewType: 'exterior' | 'interior' | 'aerial' = 'exterior'
  ): Promise<string> {
    // Create a prompt that describes the 3D visualization
    const renderPrompt = this.specTo3DPrompt(spec, viewType);

    const result = await replicateImageTool.execute({
      prompt: renderPrompt,
      model: 'photorealistic',
      negativePrompt: 'cartoon, illustration, sketch, draft, unfinished, low quality',
      width: 1920,
      height: 1080,
      numOutputs: 1,
      guidanceScale: 8,
      steps: 50,
      style: 'architectural visualization, photorealistic rendering, professional 3D render, vray, octane render',
    });

    if (result.error) {
      throw new Error(`3D render generation failed: ${result.message}`);
    }

    return result.images[0];
  }

  /**
   * Convert spec to floorplan generation prompt
   */
  private specToFloorplanPrompt(spec: ArchitecturalSpec): string {
    const roomDescriptions = spec.rooms.map(room => 
      `${room.name}: ${room.dimensions.width}ft × ${room.dimensions.length}ft at position (${room.position.x}, ${room.position.y})`
    ).join(', ');

    return `Professional architectural floorplan, top-down view, black and white technical drawing.
    Building: ${spec.project.type} ${spec.project.style} style, ${spec.project.stories} stories, ${spec.project.totalSquareFeet} sq ft.
    
    Rooms layout:
    ${roomDescriptions}
    
    Show:
    - Clean lines with wall thickness
    - Door openings and swings
    - Window placements
    - Room labels with dimensions
    - North arrow and scale
    - Professional CAD-style drawing
    - Grid lines and measurements
    - No furniture or decorations
    - Technical architectural standards`;
  }

  /**
   * Convert spec to 3D rendering prompt
   */
  private specTo3DPrompt(spec: ArchitecturalSpec, viewType: string): string {
    const materials = spec.aesthetics.materials.join(', ');
    const colors = `${spec.aesthetics.colorScheme.primary} and ${spec.aesthetics.colorScheme.secondary}`;

    switch (viewType) {
      case 'exterior':
        return `Photorealistic exterior architectural rendering of a ${spec.project.style} style ${spec.project.type} building.
        ${spec.project.stories} stories, ${spec.features.exterior.siding} siding, ${spec.features.exterior.roofType} roof with ${spec.features.exterior.roofMaterial}.
        Color scheme: ${colors}. Materials: ${materials}.
        Professional architectural visualization, golden hour lighting, landscaped yard, high-end real estate photography style.
        Ultra-realistic, 8K quality, architectural digest quality.`;

      case 'interior':
        return `Photorealistic interior architectural rendering, ${spec.project.style} style.
        Open concept living space with ${spec.features.interior.ceilingHeight}ft ceilings.
        ${spec.features.interior.hasVaultedCeilings ? 'Vaulted ceilings,' : ''} 
        modern finishes, ${materials}, color palette of ${colors}.
        Professional interior photography, natural lighting, staged furniture, architectural digest style.`;

      case 'aerial':
        return `Aerial view architectural rendering of ${spec.project.type} property.
        Show the full ${spec.dimensions.lot.area} sq ft lot with ${spec.dimensions.building.footprint} sq ft building footprint.
        ${spec.project.style} architecture, professional drone photography style.
        Show roof detail, landscaping, property boundaries, neighborhood context.`;

      default:
        return '';
    }
  }

  /**
   * Iterative Refinement: Client provides feedback and requests changes
   */
  async refineDesign(
    originalSpec: ArchitecturalSpec,
    feedback: string,
    currentImages?: { floorplan?: string; renders?: Array<{ type: string; url: string }> }
  ): Promise<{
    success: boolean;
    updatedSpec: ArchitecturalSpec;
    changesExplanation: string;
    newFloorplan?: string;
    newRenders?: Array<{ type: string; url: string }>;
  }> {
    const refinementPrompt = `You are refining an architectural design based on client feedback.

Original Specification:
${JSON.stringify(originalSpec, null, 2)}

Client Feedback:
"${feedback}"

Based on this feedback, create an updated architectural specification that addresses their concerns while maintaining structural integrity and good design principles.

Key areas to consider:
1. Room sizes and layout adjustments
2. Style and aesthetic changes
3. Feature additions or modifications
4. Structural feasibility
5. Cost implications of changes

Provide the updated specification and explain what changes you made and why.`;

    try {
      const updatedSpecRaw = await this.visionParser.execute(refinementPrompt, {
        structuredOutput: true,
      });
      
      const updatedSpec = typeof updatedSpecRaw === 'string' 
        ? JSON.parse(updatedSpecRaw) 
        : updatedSpecRaw;

      const validatedSpec = ArchitecturalSpecSchema.parse(updatedSpec);

      // Generate explanation of changes
      const changesPrompt = `Compare these two architectural specifications and explain the key changes made:

BEFORE: ${JSON.stringify(originalSpec, null, 2)}

AFTER: ${JSON.stringify(validatedSpec, null, 2)}

CLIENT FEEDBACK: "${feedback}"

Provide a clear, professional explanation of what was changed and why, addressing the client's feedback.`;

      const changesExplanation = await this.salesmanAgent.execute(changesPrompt);

      // Optionally regenerate images for major changes
      let newFloorplan, newRenders;
      if (this.hasSignificantChanges(originalSpec, validatedSpec)) {
        console.log('🔄 Significant changes detected, regenerating visuals...');
        newFloorplan = await this.generateFloorplan(validatedSpec);
        
        const exteriorRender = await this.generate3DRender(newFloorplan, validatedSpec, 'exterior');
        newRenders = [{ type: 'exterior', url: exteriorRender }];
      }

      return {
        success: true,
        updatedSpec: validatedSpec,
        changesExplanation: changesExplanation || 'Design updated based on your feedback.',
        newFloorplan,
        newRenders,
      };

    } catch (error: any) {
      console.error('Refinement error:', error);
      return {
        success: false,
        updatedSpec: originalSpec, // Return original if refinement fails
        changesExplanation: `Failed to process refinement: ${error.message}`,
      };
    }
  }

  /**
   * Determine if changes are significant enough to regenerate images
   */
  private hasSignificantChanges(original: ArchitecturalSpec, updated: ArchitecturalSpec): boolean {
    // Check for major structural changes
    const significantChanges = [
      original.project.totalSquareFeet !== updated.project.totalSquareFeet,
      original.project.stories !== updated.project.stories,
      original.project.style !== updated.project.style,
      original.rooms.length !== updated.rooms.length,
      JSON.stringify(original.dimensions) !== JSON.stringify(updated.dimensions),
      JSON.stringify(original.features.exterior) !== JSON.stringify(updated.features.exterior),
    ];

    return significantChanges.some(change => change);
  }

  /**
   * Generate multiple design variations
   */
  async generateVariations(
    spec: ArchitecturalSpec,
    variationType: 'style' | 'layout' | 'size' = 'style',
    count: number = 3
  ): Promise<{
    success: boolean;
    variations: Array<{
      spec: ArchitecturalSpec;
      description: string;
      floorplan?: string;
      renders?: Array<{ type: string; url: string }>;
    }>;
  }> {
    const variations = [];

    try {
      for (let i = 0; i < count; i++) {
        const variationPrompt = `Create a design variation of this architectural specification:

${JSON.stringify(spec, null, 2)}

Variation Type: ${variationType}
Variation #: ${i + 1}

Generate a ${variationType} variation that maintains the same basic requirements but explores different approaches. Make meaningful changes while keeping the design practical and appealing.`;

        const variationSpec = await this.visionParser.execute(variationPrompt, {
          structuredOutput: true,
        });

        const validatedVariation = ArchitecturalSpecSchema.parse(
          typeof variationSpec === 'string' ? JSON.parse(variationSpec) : variationSpec
        );

        const description = `${variationType.charAt(0).toUpperCase() + variationType.slice(1)} Variation ${i + 1}: ${this.describeVariation(spec, validatedVariation)}`;

        variations.push({
          spec: validatedVariation,
          description,
          // Could generate images for each variation if needed
        });
      }

      return { success: true, variations };

    } catch (error: any) {
      console.error('Variations generation error:', error);
      return { success: false, variations: [] };
    }
  }

  /**
   * Describe what makes a variation different
   */
  private describeVariation(original: ArchitecturalSpec, variation: ArchitecturalSpec): string {
    const differences = [];
    
    if (original.project.style !== variation.project.style) {
      differences.push(`${variation.project.style} style instead of ${original.project.style}`);
    }
    
    if (original.features.exterior.siding !== variation.features.exterior.siding) {
      differences.push(`${variation.features.exterior.siding} siding`);
    }
    
    if (original.features.exterior.roofType !== variation.features.exterior.roofType) {
      differences.push(`${variation.features.exterior.roofType} roof design`);
    }
    
    return differences.length > 0 
      ? differences.join(', ') 
      : 'Alternative layout and design approach';
  }

  /**
   * Internal Quality Review - Judge reviews work before client presentation
   */
  async internalQualityReview(
    originalVision: string,
    specification: ArchitecturalSpec,
    floorplan?: string,
    renders?: Array<{ type: string; url: string }>
  ): Promise<{
    approved: boolean;
    score: number;
    feedback: string;
    improvements: string[];
    criticalIssues: string[];
  }> {
    const reviewPrompt = `You are reviewing architectural work before client presentation.

ORIGINAL CLIENT VISION:
"${originalVision}"

GENERATED SPECIFICATION:
${JSON.stringify(specification, null, 2)}

VISUAL DELIVERABLES:
${floorplan ? `- Floor Plan: Generated` : '- Floor Plan: Missing'}
${renders ? `- 3D Renders: ${renders.length} generated (${renders.map(r => r.type).join(', ')})` : '- 3D Renders: None'}

As the Chief Architect, provide your professional review:

1. **Accuracy**: Does the specification match the client's vision?
2. **Completeness**: Are all client requirements addressed?
3. **Quality**: Is this professional-grade work?
4. **Buildability**: Is this design structurally sound and practical?
5. **Style Consistency**: Does the style choice align with client preferences?

Rate the work (1-10) and provide:
- Specific feedback for improvements
- Critical issues that must be fixed
- Approval status (approve for client or send back for revision)

Be thorough and constructive - our reputation depends on quality.`;

    const review = await this.qualityJudge.execute(reviewPrompt);
    
    // Parse the review to extract structured feedback
    const score = this.extractScore(review);
    const approved = score >= 7; // Minimum threshold for client presentation
    const improvements = this.extractImprovements(review);
    const criticalIssues = this.extractCriticalIssues(review);

    return {
      approved,
      score,
      feedback: review || 'Quality review completed.',
      improvements,
      criticalIssues,
    };
  }

  /**
   * Iterative Internal Improvement Process
   */
  async iterativeQualityImprovement(
    originalVision: string,
    maxIterations: number = 3
  ): Promise<{
    finalSpec: ArchitecturalSpec;
    floorplan: string;
    renders: Array<{ type: string; url: string }>;
    iterationsCount: number;
    qualityScore: number;
    reviewHistory: Array<{ iteration: number; score: number; feedback: string }>;
  }> {
    let currentSpec: ArchitecturalSpec | null = null;
    let currentFloorplan: string = '';
    let currentRenders: Array<{ type: string; url: string }> = [];
    let iteration = 0;
    const reviewHistory = [];

    console.log('🔄 Starting iterative quality improvement process...');

    while (iteration < maxIterations) {
      iteration++;
      console.log(`\n🏗️ Iteration ${iteration}/${maxIterations}`);

      try {
        // Step 1: Generate/regenerate specification
        if (iteration === 1) {
          console.log('📋 Generating initial specification...');
          currentSpec = await this.parseVision(originalVision);
        } else {
          // Use feedback from previous review to improve
          const lastReview = reviewHistory[reviewHistory.length - 1];
          console.log('🔧 Improving specification based on feedback...');
          
          const improvementPrompt = `The previous design received this feedback:

${lastReview.feedback}

CURRENT SPECIFICATION:
${JSON.stringify(currentSpec || {}, null, 2)}

ORIGINAL CLIENT VISION:
"${originalVision}"

Improve the specification to address the feedback while staying true to the client's vision.`;

          const improvedSpecRaw = await this.visionParser.execute(improvementPrompt, {
            structuredOutput: true,
          });
          
          currentSpec = ArchitecturalSpecSchema.parse(
            typeof improvedSpecRaw === 'string' ? JSON.parse(improvedSpecRaw) : improvedSpecRaw
          );
        }

        // Step 2: Generate visuals
        console.log('🎨 Generating floorplan and renders...');
        currentFloorplan = await this.generateFloorplan(currentSpec);
        
        const exteriorRender = await this.generate3DRender(currentFloorplan, currentSpec, 'exterior');
        const interiorRender = await this.generate3DRender(currentFloorplan, currentSpec, 'interior');
        currentRenders = [
          { type: 'exterior', url: exteriorRender },
          { type: 'interior', url: interiorRender },
        ];

        // Step 3: Internal quality review
        console.log('👨‍💼 Quality review in progress...');
        const review = await this.internalQualityReview(
          originalVision,
          currentSpec,
          currentFloorplan,
          currentRenders
        );

        reviewHistory.push({
          iteration,
          score: review.score,
          feedback: review.feedback,
        });

        console.log(`📊 Quality Score: ${review.score}/10`);
        
        if (review.approved) {
          console.log('✅ Design approved for client presentation!');
          break;
        } else {
          console.log('❌ Needs improvement, continuing to next iteration...');
          if (review.criticalIssues.length > 0) {
            console.log('🚨 Critical issues:', review.criticalIssues);
          }
        }

      } catch (error) {
        console.error(`❌ Error in iteration ${iteration}:`, error);
        // Continue with previous iteration's results if available
        break;
      }
    }

    const finalScore = reviewHistory[reviewHistory.length - 1]?.score || 0;
    
    return {
      finalSpec: currentSpec!,
      floorplan: currentFloorplan,
      renders: currentRenders,
      iterationsCount: iteration,
      qualityScore: finalScore,
      reviewHistory,
    };
  }

  /**
   * Generate 3 custom home design variations with quality control
   */
  async generateThreeCustomDesigns(
    originalVision: string
  ): Promise<{
    designs: Array<{
      name: string;
      specification: ArchitecturalSpec;
      floorplan: string;
      renders: Array<{ type: string; url: string }>;
      qualityScore: number;
      description: string;
    }>;
    totalTime: string;
  }> {
    console.log('🏡 Generating 3 custom home designs with quality control...');
    const startTime = Date.now();
    
    const designPromises = [
      this.generateSingleQualityDesign(originalVision, 'Option A', 'primary interpretation'),
      this.generateSingleQualityDesign(originalVision, 'Option B', 'alternative style approach'),
      this.generateSingleQualityDesign(originalVision, 'Option C', 'premium upgraded version'),
    ];

    const designs = await Promise.all(designPromises);
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log(`✅ Generated 3 quality-controlled designs in ${duration}s`);
    
    return {
      designs,
      totalTime: duration,
    };
  }

  /**
   * Generate a single quality-controlled design
   */
  private async generateSingleQualityDesign(
    vision: string,
    name: string,
    variation: string
  ): Promise<{
    name: string;
    specification: ArchitecturalSpec;
    floorplan: string;
    renders: Array<{ type: string; url: string }>;
    qualityScore: number;
    description: string;
  }> {
    console.log(`🎯 Generating ${name} (${variation})...`);
    
    const modifiedVision = `${vision} (${variation} - create a ${variation} of this vision)`;
    
    const result = await this.iterativeQualityImprovement(modifiedVision, 2); // 2 iterations max per design
    
    const description = this.generateDesignDescription(result.finalSpec, variation);
    
    return {
      name,
      specification: result.finalSpec,
      floorplan: result.floorplan,
      renders: result.renders,
      qualityScore: result.qualityScore,
      description,
    };
  }

  /**
   * Helper methods for parsing review feedback
   */
  private extractScore(review: string): number {
    const scoreMatch = review.match(/(?:score|rating|rate).*?(\d+)(?:\/10|\s*out\s*of\s*10)/i);
    if (scoreMatch) return parseInt(scoreMatch[1]);
    
    // Fallback: look for standalone numbers
    const numberMatch = review.match(/(\d+)\/10/);
    if (numberMatch) return parseInt(numberMatch[1]);
    
    return 5; // Default middle score if can't parse
  }

  private extractImprovements(review: string): string[] {
    const improvements = [];
    const lines = review.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('improve') || 
          line.toLowerCase().includes('enhance') ||
          line.toLowerCase().includes('consider') ||
          line.toLowerCase().includes('suggestion')) {
        improvements.push(line.trim());
      }
    }
    
    return improvements.slice(0, 5); // Limit to 5 improvements
  }

  private extractCriticalIssues(review: string): string[] {
    const issues = [];
    const lines = review.split('\n');
    
    for (const line of lines) {
      if (line.toLowerCase().includes('critical') || 
          line.toLowerCase().includes('must fix') ||
          line.toLowerCase().includes('major issue') ||
          line.toLowerCase().includes('problem')) {
        issues.push(line.trim());
      }
    }
    
    return issues;
  }

  private generateDesignDescription(spec: ArchitecturalSpec, variation: string): string {
    const style = spec.project.style;
    const sqft = spec.project.totalSquareFeet;
    const stories = spec.project.stories;
    const bedrooms = spec.rooms.filter(r => r.type === 'bedroom').length;
    const bathrooms = spec.rooms.filter(r => r.type === 'bathroom').length;
    
    return `${style} ${stories}-story home with ${sqft} sq ft featuring ${bedrooms} bedrooms and ${bathrooms} bathrooms. This ${variation} emphasizes ${style.toLowerCase()} architectural elements with modern functionality.`;
  }

  /**
   * Execute full pipeline
   */
  async executeFullPipeline(
    vision: string,
    options?: {
      generateMultipleViews?: boolean;
      includeInterior?: boolean;
    }
  ): Promise<{
    specification: ArchitecturalSpec;
    floorplan: string;
    renders: Array<{ type: string; url: string }>;
  }> {
    console.log('Step 1: Parsing architectural vision...');
    const spec = await this.parseVision(vision);
    
    console.log('Step 2: Generating floorplan...');
    const floorplan = await this.generateFloorplan(spec);
    
    console.log('Step 3: Generating 3D renders...');
    const renders = [];
    
    // Always generate exterior view
    const exteriorRender = await this.generate3DRender(floorplan, spec, 'exterior');
    renders.push({ type: 'exterior', url: exteriorRender });
    
    if (options?.generateMultipleViews) {
      const aerialRender = await this.generate3DRender(floorplan, spec, 'aerial');
      renders.push({ type: 'aerial', url: aerialRender });
    }
    
    if (options?.includeInterior) {
      const interiorRender = await this.generate3DRender(floorplan, spec, 'interior');
      renders.push({ type: 'interior', url: interiorRender });
    }
    
    return {
      specification: spec,
      floorplan,
      renders,
    };
  }
}

// ============= USAGE EXAMPLE =============

export async function createArchitecturalDesign(vision: string) {
  const system = new ArchitectureDesignSystem(
    process.env.OPENAI_API_KEY!,
    process.env.REPLICATE_API_TOKEN!
  );

  try {
    const result = await system.executeFullPipeline(vision, {
      generateMultipleViews: true,
      includeInterior: true,
    });

    return {
      success: true,
      ...result,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}
