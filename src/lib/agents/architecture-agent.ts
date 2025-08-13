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
  private floorplanGenerator: any;
  private renderGenerator: any;

  constructor(openaiKey: string, replicateKey: string) {
    // Agent 1: Vision Parser - Converts natural language to structured JSON
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

    // Store keys for image generation
    this.floorplanGenerator = { replicateKey };
    this.renderGenerator = { replicateKey };
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
