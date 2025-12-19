import { NextRequest, NextResponse } from 'next/server';
import { extractStructuredText, createDocumentCache } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to base64
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString('base64');
    const mimeType = file.type;

    // Call Gemini to extract structured text
    const structuredText = await extractStructuredText(base64, mimeType);

    // Create a context cache for future requests (Chat, Summary, etc.)
    // This fulfills the "send only once" requirement for large documents
    const cacheName = await createDocumentCache(structuredText);

    return NextResponse.json({
      success: true,
      text: structuredText,
      cacheName: cacheName,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in extract-text API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to extract text from document',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
