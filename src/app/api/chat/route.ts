import { NextRequest, NextResponse } from 'next/server';
import { chatWithDocument } from '@/lib/gemini';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp?: number;
}

interface ChatRequest {
  documentText: string;
  question: string;
  conversationHistory?: ChatMessage[];
}

export async function POST(request: NextRequest) {
  try {
    const body: ChatRequest = await request.json();
    
    const { documentText, question, conversationHistory = [] } = body;

    // Validate input
    if (!documentText || !question) {
      return NextResponse.json(
        { error: 'Missing required fields: documentText and question' },
        { status: 400 }
      );
    }

    // Validate document text length (Gemini has token limits)
    if (documentText.length > 100000) {
      return NextResponse.json(
        { error: 'Document text is too long. Please provide a shorter excerpt.' },
        { status: 400 }
      );
    }

    // Convert conversation history to the format expected by gemini.ts
    const formattedHistory = conversationHistory.map(msg => ({
      role: msg.role === 'user' ? 'User' : 'Assistant',
      text: msg.text
    }));

    // Get response from Gemini
    const answer = await chatWithDocument(documentText, question, formattedHistory);

    return NextResponse.json({
      success: true,
      answer,
      timestamp: Date.now()
    });

  } catch (error) {
    console.error('Error in chat API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        error: 'Failed to process chat request',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}
