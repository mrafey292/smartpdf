import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAICacheManager } from '@google/generative-ai/server';

// Lazy initialization to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null;
let cacheManager: GoogleAICacheManager | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    genAI = new GoogleGenerativeAI(apiKey);
  }
  return genAI;
}

function getCacheManager() {
  if (!cacheManager) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    cacheManager = new GoogleAICacheManager(apiKey);
  }
  return cacheManager;
}

/**
 * Get Gemini model for text generation
 */
export function getGeminiModel(modelName: string = 'gemini-2.5-flash-lite') {
  return getGenAI().getGenerativeModel({ model: modelName });
}

/**
 * Get Gemini Pro model
 */
export function getGeminiProModel() {
  return getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
}

/**
 * Create or retrieve a context cache for a document.
 * This allows us to send the document once and refer to it by name in future calls.
 * Note: Context caching requires a minimum of 32,768 tokens.
 * For smaller documents, we'll return the standard model.
 */
export async function getModelWithCaching(text: string, cacheName?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not set');

  // If we already have a cache name, try to use it
  if (cacheName) {
    try {
      return getGenAI().getGenerativeModelFromCachedContent({
        name: cacheName,
      } as any);
    } catch (error) {
      console.warn('Failed to use existing cache, falling back to standard model:', error);
    }
  }

  // Estimate token count (rough approximation: 1 token ~= 4 chars)
  const estimatedTokens = text.length / 4;

  // Gemini Context Caching requires at least 32k tokens
  if (estimatedTokens > 32768) {
    try {
      const manager = getCacheManager();
      const cache = await manager.create({
        model: 'models/gemini-2.5-flash-lite', // Use 1.5 Flash for caching support
        displayName: 'document-context',
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        ttlSeconds: 3600, // 1 hour cache
      });

      return {
        model: getGenAI().getGenerativeModelFromCachedContent(cache),
        cacheName: cache.name
      };
    } catch (error) {
      console.error('Error creating context cache:', error);
    }
  }

  // Fallback to standard model if text is too small or caching fails
  return {
    model: getGeminiModel(),
    cacheName: undefined
  };
}

/**
 * Helper to handle API calls with retries and better error handling
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes('429') || error.message?.includes('quota'))) {
      console.log(`Quota exceeded, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

/**
 * Create a context cache for a document.
 * This allows us to send the document once and refer to it by name in future calls.
 * Note: Context caching requires a minimum of 32,768 tokens.
 */
export async function createDocumentCache(text: string) {
  // Estimate token count (rough approximation: 1 token ~= 4 chars)
  const estimatedTokens = text.length / 4;

  // Gemini Context Caching requires at least 32k tokens
  if (estimatedTokens > 32768) {
    try {
      const manager = getCacheManager();
      const cache = await manager.create({
        model: 'models/gemini-2.5-flash-lite',
        displayName: 'document-context',
        contents: [
          {
            role: 'user',
            parts: [{ text }],
          },
        ],
        ttlSeconds: 3600, // 1 hour cache
      });
      return cache.name;
    } catch (error) {
      console.error('Error creating context cache:', error);
      return undefined;
    }
  }
  return undefined;
}

/**
 * Chat with document context
 */
export async function chatWithDocument(
  documentText: string,
  question: string,
  conversationHistory: Array<{ role: string; text: string }> = [],
  cacheName?: string
) {
  return withRetry(async () => {
    let model;
    let prompt = '';

    if (cacheName) {
      try {
        model = getGenAI().getGenerativeModelFromCachedContent({ name: cacheName } as any);
        prompt = `User question: ${question}\n\nProvide a helpful, accurate answer based on the document content.`;
      } catch (error) {
        console.warn('Cache failed, falling back to standard model');
        model = getGeminiModel();
        prompt = `You are an AI assistant helping users understand a document. Here is the document content:\n\n${documentText}\n\nUser question: ${question}`;
      }
    } else {
      model = getGeminiModel();
      prompt = `You are an AI assistant helping users understand a document. Here is the document content:\n\n${documentText}\n\nUser question: ${question}`;
    }

    // Add history if present
    if (conversationHistory.length > 0) {
      let historyText = "\nPrevious conversation:\n";
      conversationHistory.forEach(msg => {
        historyText += `${msg.role}: ${msg.text}\n`;
      });
      prompt = historyText + prompt;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Summarize document
 */
export async function summarizeDocument(
  documentText: string,
  summaryType: 'brief' | 'detailed' | 'key-points' = 'brief',
  cacheName?: string
) {
  return withRetry(async () => {
    let model;
    let promptPrefix = '';

    if (cacheName) {
      try {
        model = getGenAI().getGenerativeModelFromCachedContent({ name: cacheName } as any);
      } catch (error) {
        model = getGeminiProModel();
        promptPrefix = `Document content:\n\n${documentText}\n\n`;
      }
    } else {
      model = getGeminiProModel();
      promptPrefix = `Document content:\n\n${documentText}\n\n`;
    }

    let prompt = '';
    switch (summaryType) {
      case 'brief':
        prompt = `${promptPrefix}Provide a brief 2-3 sentence summary of the document.`;
        break;
      case 'detailed':
        prompt = `${promptPrefix}Provide a detailed summary of the document, covering all main points and important details.`;
        break;
      case 'key-points':
        prompt = `${promptPrefix}Extract and list the key points from the document in bullet points.`;
        break;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Extract key concepts from document
 */
export async function extractKeyConcepts(documentText: string, cacheName?: string) {
  return withRetry(async () => {
    let model;
    let prompt = '';

    if (cacheName) {
      try {
        model = getGenAI().getGenerativeModelFromCachedContent({ name: cacheName } as any);
        prompt = `Analyze the document and extract the main concepts, topics, and themes. Format as a list.`;
      } catch (error) {
        model = getGeminiModel();
        prompt = `Analyze the following document and extract the main concepts, topics, and themes. Format as a list:\n\n${documentText}`;
      }
    } else {
      model = getGeminiModel();
      prompt = `Analyze the following document and extract the main concepts, topics, and themes. Format as a list:\n\n${documentText}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Extract structured text from a document using Gemini's multimodal capabilities
 */
export async function extractStructuredText(fileBase64: string, mimeType: string) {
  return withRetry(async () => {
    const model = getGeminiProModel();

    const prompt = `
      You are an expert document parser. Your task is to extract all text from the provided document and format it in clean, structured Markdown.
      
      Rules:
      1. Preserve all headings (H1, H2, etc.) using appropriate Markdown syntax.
      2. Format tables correctly using Markdown table syntax.
      3. Preserve lists (bulleted or numbered).
      4. Maintain the logical flow and structure of the document.
      5. IMPORTANT: Whenever you encounter a new page in the document, insert a marker like this: [PAGE_BREAK_n] where n is the page number (e.g., [PAGE_BREAK_1], [PAGE_BREAK_2]).
      6. Do not add any commentary or intro/outro text. Just the extracted content.
      7. If there are images with text, extract that text as well.
      8. If there are mathematical formulas, use LaTeX if possible or clear text representation.
      
      Return ONLY the Markdown content.
    `;

    const result = await model.generateContent([
      {
        inlineData: {
          data: fileBase64,
          mimeType: mimeType
        }
      },
      { text: prompt }
    ]);

    const response = await result.response;
    return response.text();
  });
}

/**
 * Answer questions about accessibility features in the document
 */
export async function explainAccessibility(documentText: string, feature: string) {
  return withRetry(async () => {
    const model = getGeminiModel();

    const prompt = `Based on this document, explain how it relates to or discusses "${feature}" in simple, accessible language:\n\n${documentText}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Generate study questions from document
 */
export async function generateStudyQuestions(documentText: string, count: number = 5, cacheName?: string) {
  return withRetry(async () => {
    let model;
    let prompt = '';

    if (cacheName) {
      try {
        model = getGenAI().getGenerativeModelFromCachedContent({ name: cacheName } as any);
        prompt = `Generate ${count} study questions based on the document to help a student test their knowledge. Include answers.`;
      } catch (error) {
        model = getGeminiModel();
        prompt = `Generate ${count} study questions based on the following document to help a student test their knowledge. Include answers:\n\n${documentText}`;
      }
    } else {
      model = getGeminiModel();
      prompt = `Generate ${count} study questions based on the following document to help a student test their knowledge. Include answers:\n\n${documentText}`;
    }

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Simplify complex text for better readability
 */
export async function simplifyText(text: string, readingLevel: 'elementary' | 'middle-school' | 'high-school' = 'high-school') {
  return withRetry(async () => {
    const model = getGeminiModel();

    const levelDescriptions = {
      'elementary': 'elementary school (grades 1-5)',
      'middle-school': 'middle school (grades 6-8)',
      'high-school': 'high school (grades 9-12)'
    };

    const prompt = `Rewrite the following text to be understandable at a ${levelDescriptions[readingLevel]} reading level. Keep the main ideas but use simpler words and shorter sentences:\n\n${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Parse a voice command into a structured action
 */
export async function parseVoiceCommand(text: string) {
  return withRetry(async () => {
    // Use JSON mode to ensure valid JSON output
    const model = getGenAI().getGenerativeModel({
      model: 'gemini-2.5-flash-lite',
      generationConfig: {
        responseMimeType: "application/json",
      }
    });

    const systemPrompt = `
You are a voice command parser for a smart document reader application.
Your task is to map the user's spoken input to one of the predefined commands.

Available Commands:
- Navigation: 'next-page', 'previous-page', 'first-page', 'last-page', 'go-to-page'
- Zoom: 'zoom-in', 'zoom-out', 'reset-zoom'
- Reading (TTS): 'read-aloud', 'stop-reading', 'pause-reading', 'resume-reading'
- Appearance: 'increase-font', 'decrease-font', 'dark-mode', 'light-mode', 'switch-view'
- AI/Tools: 'summarize', 'chat', 'ask-question', 'accessibility'

Rules:
1. If the user asks to go to a specific page (e.g., "page 5", "jump to 10"), use 'go-to-page' and extract the 'pageNumber' parameter (integer).
2. If the user asks a question about the content (e.g., "what is this about?", "explain the first paragraph"), use 'ask-question' and extract the 'question' parameter (string).
3. If the user wants to chat or open the chat, use 'chat'.
4. If the user wants a summary, use 'summarize'.
5. If the input does not match any command clearly, return 'unknown'.
6. Be flexible with natural language. "Read this for me" -> 'read-aloud'. "Make it bigger" -> 'zoom-in'. "Night mode" -> 'dark-mode'. "Next page" -> 'next-page'.

Output Format (JSON):
{
  "command": "one-of-the-commands",
  "parameters": { ... } 
}
`;

    const result = await model.generateContent([
      systemPrompt,
      `User Input: "${text}"`
    ]);

    const response = await result.response;
    let jsonString = response.text().trim();

    // Robust cleaning for JSON mode
    if (jsonString.includes('```')) {
      jsonString = jsonString.replace(/```json\n?|\n?```/g, '').trim();
    }

    try {
      return JSON.parse(jsonString);
    } catch (e) {
      console.error('Failed to parse Gemini JSON:', jsonString);
      // Fallback for simple commands if JSON parsing fails
      const lowerText = text.toLowerCase();
      if (lowerText.includes('next') && lowerText.includes('page')) return { command: 'next-page' };
      if (lowerText.includes('previous') && lowerText.includes('page')) return { command: 'previous-page' };
      throw e;
    }
  });
}
