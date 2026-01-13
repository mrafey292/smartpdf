import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Lazy initialization to avoid build-time errors
 */
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
    if (!genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
        genAI = new GoogleGenerativeAI(apiKey);
    }
    return genAI;
}

/**
 * Generate embedding for a text using Google's text-embedding-004 model
 * @param text The text to embed
 * @returns Embedding vector (768 dimensions)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });

        const result = await model.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Generate embeddings for multiple texts in batch
 * @param texts Array of texts to embed
 * @returns Array of embedding vectors
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
    try {
        const model = getGenAI().getGenerativeModel({ model: 'text-embedding-004' });

        // Process in batches to avoid rate limits
        const batchSize = 100;
        const embeddings: number[][] = [];

        for (let i = 0; i < texts.length; i += batchSize) {
            const batch = texts.slice(i, i + batchSize);

            const batchPromises = batch.map(text => model.embedContent(text));
            const results = await Promise.all(batchPromises);

            embeddings.push(...results.map(r => r.embedding.values));

            console.log(`Generated embeddings for batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)}`);
        }

        return embeddings;
    } catch (error) {
        console.error('Error generating embeddings:', error);
        throw new Error(`Failed to generate embeddings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Split text into semantic chunks respecting headers and paragraphs
 * @param text The text to chunk
 * @param maxChunkSize Maximum size of each chunk in characters (default: 1000)
 * @returns Array of chunks with metadata
 */
export function createSemanticChunks(
    text: string,
    maxChunkSize: number = 1000
): Array<{
    text: string;
    startChar: number;
    endChar: number;
    heading?: string;
}> {
    const chunks: Array<{
        text: string;
        startChar: number;
        endChar: number;
        heading?: string;
    }> = [];

    // Split by markdown headers first
    const sections = text.split(/(?=^#{1,6}\s)/m);

    let currentPosition = 0;

    for (const section of sections) {
        if (!section.trim()) continue;

        // Extract heading if present
        const headingMatch = section.match(/^(#{1,6}\s+.+)$/m);
        const heading = headingMatch ? headingMatch[1].replace(/^#+\s+/, '') : undefined;

        // If section is small enough, keep it as one chunk
        if (section.length <= maxChunkSize) {
            chunks.push({
                text: section.trim(),
                startChar: currentPosition,
                endChar: currentPosition + section.length,
                heading,
            });
            currentPosition += section.length;
            continue;
        }

        // Split large sections by paragraphs
        const paragraphs = section.split(/\n\n+/);
        let currentChunk = '';
        let chunkStartChar = currentPosition;

        for (const paragraph of paragraphs) {
            // If adding this paragraph would exceed max size, save current chunk
            if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
                chunks.push({
                    text: currentChunk.trim(),
                    startChar: chunkStartChar,
                    endChar: chunkStartChar + currentChunk.length,
                    heading,
                });
                currentChunk = '';
                chunkStartChar = currentPosition;
            }

            currentChunk += paragraph + '\n\n';
            currentPosition += paragraph.length + 2; // +2 for \n\n
        }

        // Add remaining chunk
        if (currentChunk.trim()) {
            chunks.push({
                text: currentChunk.trim(),
                startChar: chunkStartChar,
                endChar: currentPosition,
                heading,
            });
        }
    }

    return chunks;
}

/**
 * Extract page number from text markers like [PAGE_BREAK_5]
 * @param text The text to search
 * @returns Page number or undefined
 */
export function extractPageNumber(text: string): number | undefined {
    const match = text.match(/\[PAGE_BREAK_(\d+)\]/);
    return match ? parseInt(match[1], 10) : undefined;
}

/**
 * Determine which page a chunk belongs to based on page break markers
 * @param fullText The full document text
 * @param chunkStartChar Starting character position of the chunk
 * @returns Page number or undefined
 */
export function getPageNumberForChunk(fullText: string, chunkStartChar: number): number | undefined {
    // Find all page break markers before this chunk
    const textBeforeChunk = fullText.substring(0, chunkStartChar);
    const pageBreaks = textBeforeChunk.match(/\[PAGE_BREAK_(\d+)\]/g);

    if (!pageBreaks || pageBreaks.length === 0) {
        return 1; // First page
    }

    // Get the last page break before this chunk
    const lastBreak = pageBreaks[pageBreaks.length - 1];
    const match = lastBreak.match(/\[PAGE_BREAK_(\d+)\]/);

    return match ? parseInt(match[1], 10) : undefined;
}
