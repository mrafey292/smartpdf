import { NextRequest, NextResponse } from 'next/server';
import { summarizeDocument, simplifyText } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SummarizeRequest {
  documentText: string;
  summaryType?: 'brief' | 'detailed' | 'key-points';
  simplify?: boolean;
  readingLevel?: 'elementary' | 'middle-school' | 'high-school';
  cacheName?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: SummarizeRequest = await request.json();
    
    const { 
      documentText, 
      summaryType = 'brief',
      simplify = false,
      readingLevel = 'high-school',
      cacheName
    } = body;

    // Validate input
    if (!documentText && !cacheName) {
      return NextResponse.json(
        { error: 'Missing required field: documentText or cacheName' },
        { status: 400 }
      );
    }

    // Validate document text length
    if (documentText && documentText.length > 100000) {
      return NextResponse.json(
        { error: 'Document text is too long. Please provide a shorter excerpt.' },
        { status: 400 }
      );
    }

    // Validate summaryType
    if (!['brief', 'detailed', 'key-points'].includes(summaryType)) {
      return NextResponse.json(
        { error: 'Invalid summaryType. Must be "brief", "detailed", or "key-points"' },
        { status: 400 }
      );
    }

    // Generate summary
    let summary = await summarizeDocument(documentText, summaryType, cacheName);

    // Optionally simplify the summary for accessibility
    if (simplify) {
      summary = await simplifyText(summary, readingLevel);
    }

    return NextResponse.json({
      success: true,
      summary,
      summaryType,
      simplified: simplify,
      readingLevel: simplify ? readingLevel : undefined,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in summarize API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to summarize document',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
