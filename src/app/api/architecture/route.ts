import { NextRequest, NextResponse } from 'next/server';
import { ArchitectureDesignSystem } from '@/lib/agents/architecture-agent';

export async function POST(request: NextRequest) {
  console.log('🏗️ Architecture API called - Enhanced Pipeline');
  
  // Check if API keys are available
  const openaiKey = process.env.OPENAI_API_KEY;
  const replicateKey = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
  
  if (!openaiKey || !replicateKey) {
    console.error('Missing required API keys:', { openai: !!openaiKey, replicate: !!replicateKey });
    return NextResponse.json(
      { error: true, message: 'Required API keys not configured' },
      { status: 500 }
    );
  }
  
  try {
    const body = await request.json();
    const { vision, mode = 'full', options = {} } = body;

    if (!vision) {
      return NextResponse.json(
        { error: true, message: 'Architecture vision description is required' },
        { status: 400 }
      );
    }

    console.log('🎯 Processing vision:', vision.substring(0, 100) + '...');
    console.log('🔧 Mode:', mode, 'Options:', options);

    // Initialize the enhanced architecture design system
    const designSystem = new ArchitectureDesignSystem(openaiKey, replicateKey);

    let result;

    switch (mode) {
      case 'consultation':
        // Salesman mode - analyze vision and suggest what's needed
        result = await designSystem.consultationMode(vision);
        break;

      case 'specification':
        // Just generate the JSON specification
        result = {
          success: true,
          specification: await designSystem.parseVision(vision),
          mode: 'specification'
        };
        break;

      case 'floorplan':
        // Generate specification + floorplan
        const spec = await designSystem.parseVision(vision);
        const floorplan = await designSystem.generateFloorplan(spec);
        result = {
          success: true,
          specification: spec,
          floorplan,
          mode: 'floorplan'
        };
        break;

      case 'three-designs':
        // Generate 3 polished custom designs with internal quality control
        console.log('🏡 Generating 3 quality-controlled custom designs...');
        result = await designSystem.generateThreeCustomDesigns(vision);
        result.mode = 'three-designs';
        break;

      case 'quality-controlled':
        // Single design with iterative quality improvement
        console.log('🔄 Generating quality-controlled design...');
        const qualityResult = await designSystem.iterativeQualityImprovement(vision);
        result = {
          success: true,
          specification: qualityResult.finalSpec,
          floorplan: qualityResult.floorplan,
          renders: qualityResult.renders,
          qualityScore: qualityResult.qualityScore,
          iterations: qualityResult.iterationsCount,
          reviewHistory: qualityResult.reviewHistory,
          mode: 'quality-controlled'
        };
        break;

      case 'full':
      default:
        // Complete pipeline: Vision → JSON → Floorplan → 3D Renders
        console.log('🚀 Executing full architecture pipeline...');
        const startTime = Date.now();
        
        result = await designSystem.executeFullPipeline(vision, {
          generateMultipleViews: options.multipleViews !== false,
          includeInterior: options.includeInterior !== false,
        });
        
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        result.generationTime = duration;
        result.mode = 'full';
        
        console.log(`✅ Full pipeline completed in ${duration}s`);
        break;
    }

    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error('❌ Architecture pipeline error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: true, 
        message: error.message || 'Failed to generate architecture design',
        details: error.stack?.split('\n').slice(0, 3).join('\n')
      },
      { status: 500 }
    );
  }
}

// Refinement endpoint for iterative design improvements
export async function PUT(request: NextRequest) {
  console.log('🔄 Architecture refinement called');
  
  const openaiKey = process.env.OPENAI_API_KEY;
  const replicateKey = process.env.REPLICATE_API_TOKEN || process.env.NEXT_PUBLIC_REPLICATE_API_TOKEN;
  
  if (!openaiKey || !replicateKey) {
    return NextResponse.json(
      { error: true, message: 'Required API keys not configured' },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { originalSpec, feedback, action = 'refine', options = {} } = body;

    if (!originalSpec || !feedback) {
      return NextResponse.json(
        { error: true, message: 'Original specification and feedback are required' },
        { status: 400 }
      );
    }

    const designSystem = new ArchitectureDesignSystem(openaiKey, replicateKey);

    let result;

    switch (action) {
      case 'refine':
        console.log('🎯 Refining design based on feedback...');
        result = await designSystem.refineDesign(originalSpec, feedback);
        break;

      case 'variations':
        console.log('🎨 Generating design variations...');
        result = await designSystem.generateVariations(
          originalSpec, 
          options.variationType || 'style',
          options.count || 3
        );
        break;

      default:
        return NextResponse.json(
          { error: true, message: 'Invalid action. Use "refine" or "variations"' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('❌ Architecture refinement error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: true, 
        message: error.message || 'Failed to refine architecture design',
        details: error.stack?.split('\n').slice(0, 3).join('\n')
      },
      { status: 500 }
    );
  }
}

// Helper function to generate a single image
async function generateImage(prompt: string, model: string, aspectRatio: string) {
  try {
    const result = await replicateImageTool.execute({
      prompt,
      model: model as any,
      aspectRatio,
      numOutputs: 1,
      outputFormat: 'webp',
      outputQuality: 90,
      guidanceScale: 7.5,
      steps: model === 'flux-schnell' ? 4 : 28,
      width: 1024,
      height: aspectRatio === '16:9' ? 576 : 1024,
    });
    
    return result;
  } catch (error: any) {
    console.error(`Failed to generate image with ${model}:`, error.message);
    return { success: false, error: error.message };
  }
}

// Helper functions to extract information from vision text
function extractStyle(vision: string): string {
  const styles = ['modern', 'contemporary', 'traditional', 'colonial', 'victorian', 'minimalist', 'industrial'];
  const visionLower = vision.toLowerCase();
  
  for (const style of styles) {
    if (visionLower.includes(style)) {
      return style;
    }
  }
  return 'modern';
}

function extractSquareFeet(vision: string): number {
  const match = vision.match(/(\d+)\s*(sq|square)\s*(ft|feet)/i);
  if (match) {
    return parseInt(match[1]);
  }
  return 2000; // default
}

function extractStories(vision: string): number {
  const match = vision.match(/(\d+)\s*stor/i);
  if (match) {
    return parseInt(match[1]);
  }
  return vision.toLowerCase().includes('two') ? 2 : 1;
}

function extractRooms(vision: string): Array<{name: string, type: string, area: number}> {
  const rooms = [];
  const visionLower = vision.toLowerCase();
  
  // Common room patterns
  const roomPatterns = [
    { pattern: /(\d+)\s*bedroom/i, type: 'bedroom', baseName: 'Bedroom' },
    { pattern: /master\s*(bedroom|suite)/i, type: 'master_bedroom', name: 'Master Suite' },
    { pattern: /kitchen/i, type: 'kitchen', name: 'Kitchen' },
    { pattern: /living\s*room/i, type: 'living_room', name: 'Living Room' },
    { pattern: /dining\s*room/i, type: 'dining_room', name: 'Dining Room' },
    { pattern: /home\s*office|office/i, type: 'office', name: 'Home Office' },
    { pattern: /garage/i, type: 'garage', name: 'Garage' },
    { pattern: /bathroom/i, type: 'bathroom', name: 'Bathroom' },
  ];
  
  for (const roomPattern of roomPatterns) {
    const match = visionLower.match(roomPattern.pattern);
    if (match) {
      if (roomPattern.baseName && match[1]) {
        // Handle multiple bedrooms
        const count = parseInt(match[1]);
        for (let i = 1; i <= count; i++) {
          rooms.push({
            name: `${roomPattern.baseName} ${i}`,
            type: roomPattern.type,
            area: roomPattern.type === 'master_bedroom' ? 350 : 200
          });
        }
      } else if (roomPattern.name) {
        rooms.push({
          name: roomPattern.name,
          type: roomPattern.type,
          area: getDefaultArea(roomPattern.type)
        });
      }
    }
  }
  
  // If no rooms detected, provide defaults
  if (rooms.length === 0) {
    return [
      { name: 'Living Room', type: 'living_room', area: 400 },
      { name: 'Kitchen', type: 'kitchen', area: 300 },
      { name: 'Master Bedroom', type: 'master_bedroom', area: 350 },
      { name: 'Bedroom 2', type: 'bedroom', area: 200 },
      { name: 'Home Office', type: 'office', area: 150 },
    ];
  }
  
  return rooms;
}

function getDefaultArea(roomType: string): number {
  const areas: Record<string, number> = {
    'master_bedroom': 350,
    'bedroom': 200,
    'kitchen': 300,
    'living_room': 400,
    'dining_room': 250,
    'office': 150,
    'garage': 400,
    'bathroom': 100,
  };
  return areas[roomType] || 200;
}