import { NextRequest, NextResponse } from 'next/server';
import { replicateImageTool } from '@/lib/tools/image-tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      prompt,
      model = 'flux-pro',
      aspectRatio = '1:1',
      numOutputs = 1,
      outputFormat = 'webp',
      outputQuality = 90,
      negativePrompt,
      guidanceScale = 7.5,
      steps,
      seed,
      style,
      raw,
    } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: true, message: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Execute the image generation tool
    const result = await replicateImageTool.execute({
      prompt,
      model,
      aspectRatio,
      numOutputs,
      outputFormat,
      outputQuality,
      negativePrompt,
      guidanceScale,
      steps: steps || (model.startsWith('flux') ? 28 : 50),
      seed,
      style,
      raw,
      width: 1024, // Default, will be overridden by aspect ratio in some models
      height: 1024,
    });

    if (result.error) {
      return NextResponse.json(
        { error: true, message: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to generate image' },
      { status: 500 }
    );
  }
}