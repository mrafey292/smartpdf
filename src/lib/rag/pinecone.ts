import { Pinecone } from '@pinecone-database/pinecone';

/**
 * Lazy-loaded Pinecone client to avoid build-time errors
 */
let pineconeClient: Pinecone | null = null;

function getPineconeClient(): Pinecone {
    if (!pineconeClient) {
        const apiKey = process.env.PINECONE_API_KEY;
        if (!apiKey) {
            throw new Error('PINECONE_API_KEY is not set in environment variables');
        }
        pineconeClient = new Pinecone({ apiKey });
    }
    return pineconeClient;
}

/**
 * Get the Pinecone index
 */
function getPineconeIndex() {
    const indexName = process.env.PINECONE_INDEX_NAME;
    if (!indexName) {
        throw new Error('PINECONE_INDEX_NAME is not set in environment variables');
    }

    const client = getPineconeClient();
    return client.index(indexName);
}

/**
 * Upsert vectors to Pinecone with metadata
 * @param vectors Array of vectors with embeddings and metadata
 * @param namespace Optional namespace (typically the fileId)
 */
export async function upsertVectors(
    vectors: Array<{
        id: string;
        values: number[];
        metadata: {
            fileId: string;
            text: string;
            pageNumber?: number;
            chunkIndex: number;
            heading?: string;
        };
    }>,
    namespace?: string
): Promise<void> {
    try {
        const index = getPineconeIndex();

        // Pinecone recommends batching upserts in groups of 100
        const batchSize = 100;
        for (let i = 0; i < vectors.length; i += batchSize) {
            const batch = vectors.slice(i, i + batchSize);

            await index.namespace(namespace || '').upsert(batch);

            console.log(`Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
        }

        console.log(`Successfully upserted ${vectors.length} vectors to Pinecone`);
    } catch (error) {
        console.error('Error upserting vectors to Pinecone:', error);
        throw new Error(`Failed to upsert vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Query Pinecone for similar vectors
 * @param queryVector The embedding vector to search for
 * @param topK Number of results to return (default: 5)
 * @param namespace Optional namespace to search in (typically the fileId)
 * @param filter Optional metadata filter
 */
export async function queryVectors(
    queryVector: number[],
    topK: number = 5,
    namespace?: string,
    filter?: Record<string, any>
): Promise<Array<{
    id: string;
    score: number;
    metadata: {
        fileId: string;
        text: string;
        pageNumber?: number;
        chunkIndex: number;
        heading?: string;
    };
}>> {
    try {
        const index = getPineconeIndex();

        const queryResponse = await index.namespace(namespace || '').query({
            vector: queryVector,
            topK,
            includeMetadata: true,
            filter,
        });

        // Type assertion to ensure metadata is properly typed
        return queryResponse.matches.map(match => ({
            id: match.id,
            score: match.score || 0,
            metadata: match.metadata as {
                fileId: string;
                text: string;
                pageNumber?: number;
                chunkIndex: number;
                heading?: string;
            },
        }));
    } catch (error) {
        console.error('Error querying Pinecone:', error);
        throw new Error(`Failed to query vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Delete vectors by fileId (useful for cleanup)
 * @param fileId The file ID to delete vectors for
 */
export async function deleteVectorsByFileId(fileId: string): Promise<void> {
    try {
        const index = getPineconeIndex();

        // Delete all vectors in the namespace (fileId)
        await index.namespace(fileId).deleteAll();

        console.log(`Deleted all vectors for fileId: ${fileId}`);
    } catch (error) {
        console.error('Error deleting vectors from Pinecone:', error);
        throw new Error(`Failed to delete vectors: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}

/**
 * Check if Pinecone is properly configured
 */
export async function checkPineconeConnection(): Promise<boolean> {
    try {
        const client = getPineconeClient();
        const indexName = process.env.PINECONE_INDEX_NAME;

        if (!indexName) {
            throw new Error('PINECONE_INDEX_NAME is not set');
        }

        // Try to describe the index to verify connection
        await client.describeIndex(indexName);
        return true;
    } catch (error) {
        console.error('Pinecone connection check failed:', error);
        return false;
    }
}
