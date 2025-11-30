import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

let genAI: GoogleGenerativeAI | null = null;

if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

export interface SummarizeOptions {
  text: string;
  type?: 'document' | 'section' | 'page';
}

export interface SimplifyOptions {
  text: string;
}

export interface QuestionAnswerOptions {
  context: string;
  question: string;
}

export const aiService = {
  /**
   * Summarize text content
   */
  async summarize({ text, type = 'section' }: SummarizeOptions): Promise<string> {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Please provide a clear and concise summary of the following ${type}. 
    Keep it accessible and easy to understand:

    ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  },

  /**
   * Simplify complex text for better readability
   */
  async simplify({ text }: SimplifyOptions): Promise<string> {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Please rewrite the following text in simpler, more accessible language. 
    Use shorter sentences and common words while maintaining the original meaning:

    ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  },

  /**
   * Answer questions about the document
   */
  async answerQuestion({ context, question }: QuestionAnswerOptions): Promise<string> {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    const prompt = `Based on the following context, please answer the question clearly and concisely:

    Context: ${context}

    Question: ${question}

    Answer:`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  },

  /**
   * Generate alt text for images
   */
  async generateAltText(imageData: string): Promise<string> {
    if (!genAI) {
      throw new Error('Gemini API key not configured');
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-pro-vision' });
    
    const prompt = 'Provide a clear, concise description of this image for accessibility purposes.';

    const result = await model.generateContent([prompt, { inlineData: { data: imageData, mimeType: 'image/jpeg' } }]);
    const response = await result.response;
    return response.text();
  },

  /**
   * Check if AI service is configured
   */
  isConfigured(): boolean {
    return !!genAI;
  },
};
