import { NextRequest, NextResponse } from 'next/server';
import { chatWithDocument } from '@/lib/gemini';
import { contextualizeQuestion, generateRAGResponse } from '@/lib/rag/contextualize';
import { generateEmbedding } from '@/lib/rag/embeddings';
import { queryVectors } from '@/lib/rag/pinecone';
import type { RAGChatRequest, RAGChatResponse, ChatResponse } from '@/types/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  text: string;
  timestamp?: number;
}

interface LegacyChatRequest {
  documentText: string;
  question: string;
  conversationHistory?: ChatMessage[];
  cacheName?: string;
}

/**
 * POST /api/chat
 * Enhanced chat endpoint with RAG capabilities
 * Supports both legacy (documentText) and new RAG (fileId) modes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Check if this is a RAG request (has fileId) or legacy request (has documentText)
    const isRAGMode = 'fileId' in body;

    if (isRAGMode) {
      return await handleRAGChat(body as RAGChatRequest);
    } else {
      return await handleLegacyChat(body as LegacyChatRequest);
    }
  } catch (error) {
    console.error('Error in chat API:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process chat request',
        details: errorMessage,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}

/**
 * Handle RAG-based chat with vector search
 */
async function handleRAGChat(body: RAGChatRequest): Promise<NextResponse<RAGChatResponse>> {
  const { fileId, question, conversationHistory = [], topK = 5 } = body;

  // Validate input
  if (!fileId || !question) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required fields: fileId and question',
        timestamp: Date.now(),
      } as RAGChatResponse,
      { status: 400 }
    );
  }

  try {
    // Step 1: Contextualize the question using chat history
    console.log('Step 1: Contextualizing question...');
    const contextualizedQuery = await contextualizeQuestion(question, conversationHistory);

    // Step 2: Generate embedding for the contextualized query
    console.log('Step 2: Generating query embedding...');
    const queryEmbedding = await generateEmbedding(contextualizedQuery);

    // Step 3: Search Pinecone for relevant chunks
    console.log('Step 3: Searching Pinecone...');
    const results = await queryVectors(queryEmbedding, topK, fileId);

    if (results.length === 0) {
      return NextResponse.json({
        success: true,
        answer: "I couldn't find any relevant information in the document to answer your question. Could you rephrase or ask something else?",
        retrievedChunks: [],
        contextualizedQuery,
        timestamp: Date.now(),
      } as RAGChatResponse);
    }

    console.log(`Found ${results.length} relevant chunks`);

    // Step 4: Generate response using retrieved context
    console.log('Step 4: Generating response...');
    const retrievedChunks = results.map(r => ({
      text: r.metadata.text,
      pageNumber: r.metadata.pageNumber,
      score: r.score,
    }));

    const answer = await generateRAGResponse(question, retrievedChunks, conversationHistory);

    return NextResponse.json({
      success: true,
      answer,
      retrievedChunks,
      contextualizedQuery,
      timestamp: Date.now(),
    } as RAGChatResponse);

  } catch (error) {
    console.error('Error in RAG chat:', error);
    throw error;
  }
}

/**
 * Handle legacy chat with full document text (backward compatible)
 */
async function handleLegacyChat(body: LegacyChatRequest): Promise<NextResponse<ChatResponse>> {
  const { documentText, question, conversationHistory = [], cacheName } = body;

  // Validate input
  if ((!documentText && !cacheName) || !question) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing required fields: (documentText or cacheName) and question',
        timestamp: Date.now(),
      } as ChatResponse,
      { status: 400 }
    );
  }

  // Validate document text length (Gemini has token limits)
  if (documentText && documentText.length > 100000) {
    return NextResponse.json(
      {
        success: false,
        error: 'Document text is too long. Please use the ingestion API and RAG mode instead.',
        timestamp: Date.now(),
      } as ChatResponse,
      { status: 400 }
    );
  }

  // Convert conversation history to the format expected by gemini.ts
  const formattedHistory = conversationHistory.map(msg => ({
    role: msg.role === 'user' ? 'User' : 'Assistant',
    text: msg.text
  }));

  // Get response from Gemini
  const answer = await chatWithDocument(documentText, question, formattedHistory, cacheName);

  return NextResponse.json({
    success: true,
    answer,
    timestamp: Date.now()
  } as ChatResponse);
}
