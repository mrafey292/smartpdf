import { NextRequest, NextResponse } from 'next/server';
import { extractKeyConcepts, generateStudyQuestions } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface AnalyzeRequest {
  documentText: string;
  analysisType: 'key-concepts' | 'study-questions';
  questionCount?: number; // For study-questions type
}

export async function POST(request: NextRequest) {
  try {
    const body: AnalyzeRequest = await request.json();
    
    const { documentText, analysisType, questionCount = 5 } = body;

    // Validate input
    if (!documentText || !analysisType) {
      return NextResponse.json(
        { error: 'Missing required fields: documentText and analysisType' },
        { status: 400 }
      );
    }

    // Validate document text length
    if (documentText.length > 100000) {
      return NextResponse.json(
        { error: 'Document text is too long. Please provide a shorter excerpt.' },
        { status: 400 }
      );
    }

    let result: string;

    switch (analysisType) {
      case 'key-concepts':
        result = await extractKeyConcepts(documentText);
        break;
      
      case 'study-questions':
        if (questionCount < 1 || questionCount > 20) {
          return NextResponse.json(
            { error: 'questionCount must be between 1 and 20' },
            { status: 400 }
          );
        }
        result = await generateStudyQuestions(documentText, questionCount);
        break;
      
      default:
        return NextResponse.json(
          { error: 'Invalid analysisType. Must be "key-concepts" or "study-questions"' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      analysisType,
      result,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in analyze API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to analyze document',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
