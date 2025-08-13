import { NextRequest, NextResponse } from 'next/server';
import { replicateImageEditTool, fluxKontextTool } from '@/lib/tools/image-tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      imageUrl,
      operation = 'kontext-edit',
      prompt,
      strength = 0.85,
      maskUrl,
      scale,
      style,
      guidanceScale = 7.5,
      steps = 28,
    } = body;

    if (!imageUrl) {
      return NextResponse.json(
        { error: true, message: 'Image URL is required' },
        { status: 400 }
      );
    }

    let result;

    // Use Flux Kontext for advanced editing
    if (operation === 'kontext-edit' && prompt) {
      result = await fluxKontextTool.execute({
        imageUrl,
        prompt,
        strength,
        guidanceScale,
        steps,
        preserveStructure: true,
      });
    } else {
      // Use regular edit tool for other operations
      result = await replicateImageEditTool.execute({
        imageUrl,
        operation,
        prompt,
        maskUrl,
        scale,
        style,
        strength,
      });
    }

    if (result.error) {
      return NextResponse.json(
        { error: true, message: result.message },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Image editing error:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to edit image' },
      { status: 500 }
    );
  }
}