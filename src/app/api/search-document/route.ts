import { NextRequest, NextResponse } from 'next/server';
import { searchDocumentTool, searchSingleWordTool } from '@/lib/tools/document-search-tools';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, documentId, searchTerms, word, caseSensitive = false } = body;

    if (!documentId) {
      return NextResponse.json(
        { error: true, message: 'Document ID is required' },
        { status: 400 }
      );
    }

    let result;

    if (type === 'single-word' && word) {
      result = await searchSingleWordTool.execute({
        documentId,
        word,
        caseSensitive
      });
    } else if (type === 'multiple-words' && searchTerms) {
      result = await searchDocumentTool.execute({
        documentId,
        searchTerms,
        caseSensitive
      });
    } else {
      return NextResponse.json(
        { error: true, message: 'Invalid search type or missing parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Search document error:', error);
    return NextResponse.json(
      { error: true, message: error.message || 'Failed to search document' },
      { status: 500 }
    );
  }
}