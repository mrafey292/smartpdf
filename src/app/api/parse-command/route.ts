import { NextRequest, NextResponse } from 'next/server';
import { parseVoiceCommand } from '@/lib/gemini';

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

export async function POST(req: NextRequest) {
  let text = '';
  try {
    const body = await req.json();
    text = body.text;

    if (!text) {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 });
    }

    const parsed = await parseVoiceCommand(text);
    
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

  } catch (error) {
    console.error('Error parsing command:', error);
    return NextResponse.json({ command: 'unknown', text: text || '' });
  }
}
