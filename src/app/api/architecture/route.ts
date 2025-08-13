import { NextRequest, NextResponse } from 'next/server';
import { replicateImageTool } from '@/lib/tools/image-tools';

export async function POST(request: NextRequest) {
  console.log('Architecture API called');
  
  // Check if API keys are available
  const replicateKey = process.env.REPLICATE_API_KEY || process.env.NEXT_PUBLIC_REPLICATE_API_KEY;
  console.log('Replicate key exists:', !!replicateKey);
  console.log('Replicate key starts with:', replicateKey?.substring(0, 5));
  
  if (!replicateKey) {
    console.error('No Replicate API key found!');
    return NextResponse.json(
      { error: true, message: 'Replicate API key not configured on server' },
      { status: 500 }
    );
  }
  
  try {
    const body = await request.json();
    const { vision } = body;

    if (!vision) {
      return NextResponse.json(
        { error: true, message: 'Architecture vision is required' },
        { status: 400 }
      );
    }

    console.log('🏗️ Starting architecture pipeline for:', vision);

    // Step 1: Parse vision to JSON specification
    const spec = {
      project: {
        name: 'Modern Home Design',
        type: 'residential',
        style: extractStyle(vision),
        totalSquareFeet: extractSquareFeet(vision),
        stories: extractStories(vision)
      },
      rooms: extractRooms(vision)
    };

    console.log('📊 Generated specification:', spec);

    // Step 2: Generate images in parallel using the best models
    const imagePromises = [
      // Floorplan - Use flux-pro for technical accuracy
      generateImage(
        `architectural floorplan, technical drawing, ${vision}, top view blueprint, room labels, measurements, professional architectural plan, black and white technical drawing`,
        'flux-pro',
        '1:1'
      ),
      
      // Exterior View - Use flux-realism for photorealistic rendering
      generateImage(
        `modern house exterior based on: ${vision}, architectural photography, golden hour lighting, professional real estate photo, ultra realistic, high quality`,
        'flux-realism',
        '16:9'
      ),
      
      // Interior View - Use flux-realism
      generateImage(
        `modern interior design based on: ${vision}, professional interior photography, natural lighting, magazine quality, stylish furniture, high end finishes`,
        'flux-realism',
        '16:9'
      ),
      
      // Aerial View - Use flux-pro for accuracy
      generateImage(
        `aerial view of modern house: ${vision}, drone photography, landscape context, neighborhood view, bird's eye perspective`,
        'flux-pro',
        '16:9'
      )
    ];

    console.log('🎨 Generating 4 images in parallel...');
    const startTime = Date.now();
    
    const imageResults = await Promise.all(imagePromises);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✅ Generated all images in ${duration}s`);

    // Extract URLs from results
    const images = {
      floorplan: imageResults[0].success ? imageResults[0].images[0] : null,
      exterior: imageResults[1].success ? imageResults[1].images[0] : null,
      interior: imageResults[2].success ? imageResults[2].images[0] : null,
      aerial: imageResults[3].success ? imageResults[3].images[0] : null,
    };

    // Check if any images failed
    const failures = imageResults.filter(r => !r.success);
    if (failures.length > 0) {
      console.error('❌ Some images failed:', failures);
    }

    return NextResponse.json({
      success: true,
      specification: spec,
      images,
      generationTime: duration,
      message: `Generated ${4 - failures.length} of 4 images successfully`
    });
    
  } catch (error: any) {
    console.error('Architecture pipeline error:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to generate architecture design' },
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