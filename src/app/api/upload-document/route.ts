import { NextRequest, NextResponse } from 'next/server';
import { uploadDocumentTool } from '@/lib/tools/document-search-tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { content, filename, id } = body;

    if (!content || !filename) {
      return NextResponse.json(
        { error: true, message: 'Content and filename are required' },
        { status: 400 }
      );
    }

    const result = await uploadDocumentTool.execute({
      content,
      filename,
      id
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Upload document error:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to upload document' },
      { status: 500 }
    );
  }
}