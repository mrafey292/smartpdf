import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel } from '@/lib/gemini';

const COMMANDS = [
  'summarize',
  'chat',
  'next-page',
  'previous-page',
  'first-page',
  'last-page',
  'zoom-in',
  'zoom-out',
  'reset-zoom',
  'read-aloud',
  'stop-reading',
  'pause-reading',
  'resume-reading',
  'increase-font',
  'decrease-font',
  'dark-mode',
  'light-mode',
  'accessibility',
  'switch-view',
  'go-to-page',
  'ask-question',
  'unknown'
];

const SYSTEM_PROMPT = `
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
6. Be flexible with natural language. "Read this for me" -> 'read-aloud'. "Make it bigger" -> 'zoom-in'. "Night mode" -> 'dark-mode'.

Output Format:
Return ONLY a valid JSON object. Do not include markdown formatting or explanations.
{
  "command": "one-of-the-commands",
  "parameters": { ... } // Optional, only for go-to-page or ask-question
}
`;

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const model = getGeminiModel();
    
    const result = await model.generateContent([
      SYSTEM_PROMPT,
      `User Input: "${text}"`
    ]);

    const response = result.response;
    let jsonString = response.text();
    
    // Clean up potential markdown code blocks
    jsonString = jsonString.replace(/```json\n?|\n?```/g, '').trim();

    try {
      const parsed = JSON.parse(jsonString);
      
      // Validate command
      if (!COMMANDS.includes(parsed.command)) {
        return NextResponse.json({ 
          command: 'unknown', 
          text 
        });
      }

      return NextResponse.json({
        ...parsed,
        text // Return original text for reference
      });
    } catch (e) {
      console.error('Failed to parse Gemini response:', jsonString);
      return NextResponse.json({ command: 'unknown', text });
    }

  } catch (error) {
    console.error('Error parsing command:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
