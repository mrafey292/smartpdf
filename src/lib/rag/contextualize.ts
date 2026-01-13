import { getGeminiModel } from '../gemini';

/**
 * Contextualize a user question based on chat history
 * This resolves pronouns and references to create a standalone search query
 * 
 * @param question The current user question
 * @param chatHistory Previous conversation messages
 * @returns Standalone, contextualized query
 */
export async function contextualizeQuestion(
    question: string,
    chatHistory: Array<{ role: 'user' | 'assistant'; text: string }>
): Promise<string> {
    // If no history, return the question as-is
    if (!chatHistory || chatHistory.length === 0) {
        return question;
    }

    try {
        const model = getGeminiModel();

        // Format chat history
        const historyText = chatHistory
            .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
            .join('\n');

        const prompt = `
Given the following conversation history and a new user question, rewrite the question to be a standalone search query that can be understood without the conversation context.

Rules:
1. Resolve all pronouns (it, that, this, they, etc.) to their actual referents from the conversation
2. Include necessary context from previous messages
3. Keep the query concise but complete
4. If the question is already standalone, return it as-is
5. Do not add extra information or change the intent
6. Return ONLY the rewritten question, nothing else

Conversation History:
${historyText}

Current Question: ${question}

Standalone Question:`.trim();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const contextualizedQuery = response.text().trim();

        console.log('Original question:', question);
        console.log('Contextualized query:', contextualizedQuery);

        return contextualizedQuery;
    } catch (error) {
        console.error('Error contextualizing question:', error);
        // Fallback to original question if contextualization fails
        return question;
    }
}

/**
 * Generate a response using retrieved context and chat history
 * 
 * @param question The user's question
 * @param retrievedContext Array of relevant text chunks
 * @param chatHistory Previous conversation messages
 * @returns AI-generated response
 */
export async function generateRAGResponse(
    question: string,
    retrievedContext: Array<{ text: string; pageNumber?: number; score: number }>,
    chatHistory: Array<{ role: 'user' | 'assistant'; text: string }> = []
): Promise<string> {
    try {
        const model = getGeminiModel();

        // Format retrieved context
        const contextText = retrievedContext
            .map((chunk, idx) => {
                const pageInfo = chunk.pageNumber ? ` (Page ${chunk.pageNumber})` : '';
                return `[Context ${idx + 1}${pageInfo}]:\n${chunk.text}`;
            })
            .join('\n\n---\n\n');

        // Format chat history
        const historyText = chatHistory.length > 0
            ? chatHistory
                .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}`)
                .join('\n')
            : '';

        const systemInstruction = `You are a helpful AI assistant helping users understand documents. Answer questions accurately based on the provided context from the document.

Rules:
1. Base your answer primarily on the retrieved context
2. If the context doesn't contain enough information, say so clearly
3. Cite page numbers when relevant
4. Be concise but thorough
5. Maintain conversation continuity using the chat history
6. If asked about something not in the context, acknowledge the limitation`;

        const prompt = `
${systemInstruction}

${historyText ? `Previous Conversation:\n${historyText}\n\n` : ''}Retrieved Context from Document:
${contextText}

User Question: ${question}

Answer:`.trim();

        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    } catch (error) {
        console.error('Error generating RAG response:', error);
        throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
