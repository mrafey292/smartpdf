import { GoogleGenerativeAI } from '@google/generative-ai';

// Lazy initialization to avoid build-time errors
let genAI: GoogleGenerativeAI | null = null;

function getGenAI() {
  if (!genAI) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    
    genAI = new GoogleGenerativeAI(apiKey);
  }
  
  return genAI;
}

/**
 * Get Gemini model for text generation
 * Using gemini-2.5-flash-lite for fast responses, good for chat
 */
export function getGeminiModel(modelName: string = 'gemini-2.5-flash-lite') {
  return getGenAI().getGenerativeModel({ model: modelName });
}

/**
 * Get Gemini Pro model for more complex tasks
 * Using gemini-2.5-flash-lite for better quality responses
 */
export function getGeminiProModel() {
  return getGenAI().getGenerativeModel({ model: 'gemini-2.5-flash-lite' });
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
 * Chat with document context
 */
export async function chatWithDocument(
  documentText: string,
  question: string,
  conversationHistory: Array<{ role: string; text: string }> = []
) {
  return withRetry(async () => {
    const model = getGeminiModel();
    
    // Build context with document and conversation history
    let contextPrompt = `You are an AI assistant helping users understand a document. Here is the document content:\n\n${documentText}\n\n`;
    
    if (conversationHistory.length > 0) {
      contextPrompt += "Previous conversation:\n";
      conversationHistory.forEach(msg => {
        contextPrompt += `${msg.role}: ${msg.text}\n`;
      });
      contextPrompt += "\n";
    }
    
    contextPrompt += `User question: ${question}\n\nProvide a helpful, accurate answer based on the document content. If the answer is not in the document, say so.`;

    const result = await model.generateContent(contextPrompt);
    const response = await result.response;
    return response.text();
  });
}

/**
 * Summarize document
 */
export async function summarizeDocument(
  documentText: string,
  summaryType: 'brief' | 'detailed' | 'key-points' = 'brief'
) {
  return withRetry(async () => {
    const model = getGeminiProModel();
    
    let prompt = '';
    
    switch (summaryType) {
      case 'brief':
        prompt = `Provide a brief 2-3 sentence summary of the following document:\n\n${documentText}`;
        break;
      case 'detailed':
        prompt = `Provide a detailed summary of the following document, covering all main points and important details:\n\n${documentText}`;
        break;
      case 'key-points':
        prompt = `Extract and list the key points from the following document in bullet points:\n\n${documentText}`;
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
export async function extractKeyConcepts(documentText: string) {
  return withRetry(async () => {
    const model = getGeminiModel();
    
    const prompt = `Analyze the following document and extract the main concepts, topics, and themes. Format as a list:\n\n${documentText}`;

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
export async function generateStudyQuestions(documentText: string, count: number = 5) {
  return withRetry(async () => {
    const model = getGeminiModel();
    
    const prompt = `Based on the following document, generate ${count} thought-provoking study questions that would help a student understand the material better:\n\n${documentText}`;

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
