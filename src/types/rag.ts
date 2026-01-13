/**
 * RAG System Type Definitions
 */

// PDF Batch Processing
export interface PDFBatch {
    batchNumber: number;
    startPage: number;
    endPage: number;
    text: string;
    markdown?: string;
    error?: string;
}

// Document Chunking
export interface DocumentChunk {
    id: string;
    fileId: string;
    text: string;
    pageNumber?: number;
    chunkIndex: number;
    metadata: {
        startChar: number;
        endChar: number;
        heading?: string;
    };
}

// Embedding Vector
export interface EmbeddingVector {
    id: string;
    values: number[];
    metadata: {
        fileId: string;
        text: string;
        pageNumber?: number;
        chunkIndex: number;
        heading?: string;
    };
}

// Retrieval Result
export interface RetrievalResult {
    id: string;
    score: number;
    metadata: {
        fileId: string;
        text: string;
        pageNumber?: number;
        chunkIndex: number;
        heading?: string;
    };
}

// Ingestion API Types
export interface IngestionRequest {
    file: File;
    fileId?: string; // Optional custom ID
}

export interface IngestionResponse {
    success: boolean;
    fileId: string;
    markdown?: string; // Full accessible view
    totalPages?: number;
    totalChunks?: number;
    processingTime?: number;
    error?: string;
    details?: string;
}

// RAG Chat API Types
export interface RAGChatRequest {
    fileId: string;
    question: string;
    conversationHistory?: Array<{
        role: 'user' | 'assistant';
        text: string;
    }>;
    topK?: number; // Number of chunks to retrieve (default: 5)
}

export interface RAGChatResponse {
    success: boolean;
    answer?: string;
    retrievedChunks?: Array<{
        text: string;
        pageNumber?: number;
        score: number;
    }>;
    contextualizedQuery?: string; // The rewritten query
    timestamp: number;
    error?: string;
    details?: string;
}

// Legacy Chat Response (for backward compatibility)
export interface ChatResponse {
    success: boolean;
    answer?: string;
    timestamp: number;
    error?: string;
    details?: string;
}

// Processing Status
export interface ProcessingStatus {
    stage: 'parsing' | 'batching' | 'converting' | 'chunking' | 'embedding' | 'indexing' | 'complete' | 'error';
    progress: number; // 0-100
    message: string;
    currentBatch?: number;
    totalBatches?: number;
}
