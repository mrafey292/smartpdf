import { NextRequest, NextResponse } from 'next/server';
import { processPDF } from '@/lib/rag/pdf-processor';
import { createSemanticChunks, generateEmbeddings, getPageNumberForChunk } from '@/lib/rag/embeddings';
import { upsertVectors } from '@/lib/rag/pinecone';
import type { IngestionResponse } from '@/types/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes for large PDFs

/**
 * POST /api/ingest
 * Ingest a PDF file: parse, chunk, embed, and index to Pinecone
 */
export async function POST(request: NextRequest) {
    const startTime = Date.now();

    try {
        // Parse multipart form data
        const formData = await request.formData();
        const file = formData.get('file') as File;
        const customFileId = formData.get('fileId') as string | null;

        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' } as IngestionResponse,
                { status: 400 }
            );
        }

        // Validate file type
        if (file.type !== 'application/pdf') {
            return NextResponse.json(
                { error: 'Only PDF files are supported' } as IngestionResponse,
                { status: 400 }
            );
        }

        console.log(`Starting ingestion for file: ${file.name} (${file.size} bytes)`);

        // Generate file ID
        const fileId = customFileId || `pdf_${Date.now()}_${Math.random().toString(36).substring(7)}`;

        // Convert file to buffer
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Step 1: Process PDF (parse, batch, convert to Markdown)
        console.log('Step 1: Processing PDF with batching strategy...');
        const { markdown, numPages, failedBatches } = await processPDF(buffer);

        if (failedBatches.length > 0) {
            console.warn(`Warning: ${failedBatches.length} batches failed during processing`);
        }

        // Step 2: Create semantic chunks
        console.log('Step 2: Creating semantic chunks...');
        const chunks = createSemanticChunks(markdown, 1000);
        console.log(`Created ${chunks.length} semantic chunks`);

        // Step 3: Generate embeddings
        console.log('Step 3: Generating embeddings...');
        const chunkTexts = chunks.map(chunk => chunk.text);
        const embeddings = await generateEmbeddings(chunkTexts);
        console.log(`Generated ${embeddings.length} embeddings`);

        // Step 4: Prepare vectors for Pinecone
        console.log('Step 4: Preparing vectors for Pinecone...');
        const vectors = chunks.map((chunk, idx) => {
            const pageNumber = getPageNumberForChunk(markdown, chunk.startChar);

            return {
                id: `${fileId}_chunk_${idx}`,
                values: embeddings[idx],
                metadata: {
                    fileId,
                    text: chunk.text,
                    pageNumber,
                    chunkIndex: idx,
                    heading: chunk.heading,
                },
            };
        });

        // Step 5: Upsert to Pinecone
        console.log('Step 5: Upserting vectors to Pinecone...');
        await upsertVectors(vectors, fileId);

        const processingTime = Date.now() - startTime;
        console.log(`✓ Ingestion complete in ${processingTime}ms`);

        return NextResponse.json({
            success: true,
            fileId,
            markdown,
            totalPages: numPages,
            totalChunks: chunks.length,
            processingTime,
        } as IngestionResponse);

    } catch (error) {
        console.error('Error in ingestion API:', error);

        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';

        return NextResponse.json(
            {
                success: false,
                fileId: '',
                error: 'Failed to ingest PDF',
                details: errorMessage,
            } as IngestionResponse,
            { status: 500 }
        );
    }
}
