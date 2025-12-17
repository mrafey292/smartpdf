// Voice Assistant for SmartReader
// Uses Web Speech API for voice recognition and synthesis

export type VoiceCommand = 
  | 'summarize'
  | 'chat'
  | 'next-page'
  | 'previous-page'
  | 'first-page'
  | 'last-page'
  | 'zoom-in'
  | 'zoom-out'
  | 'reset-zoom'
  | 'read-aloud'
  | 'stop-reading'
  | 'pause-reading'
  | 'resume-reading'
  | 'increase-font'
  | 'decrease-font'
  | 'dark-mode'
  | 'light-mode'
  | 'accessibility'
  | 'switch-view'
  | 'go-to-page'
  | 'ask-question'
  | 'unknown';

export interface CommandResult {
  command: VoiceCommand;
  parameters?: any;
  text: string;
  confidence: number;
}

export class VoiceAssistant {
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening: boolean = false;
  private wakeWord: string = 'smart reader';
  private onCommandCallback?: (result: CommandResult) => void;
  private onListeningChangeCallback?: (isListening: boolean) => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;
        this.setupRecognitionHandlers();
      }
    }
  }

  private setupRecognitionHandlers() {
    if (!this.recognition) return;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.onListeningChangeCallback?.(true);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.onListeningChangeCallback?.(false);
    };

    this.recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase();
      const confidence = event.results[0][0].confidence;
      
      console.log('Voice input:', transcript, 'Confidence:', confidence);
      
      const result = this.parseCommand(transcript, confidence);
      this.onCommandCallback?.(result);
    };

    this.recognition.onerror = (event: any) => {
      // Suppress console errors for network issues (they're handled in UI)
      if (event.error !== 'network' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
      }
      
      this.onErrorCallback?.(event.error);
      this.isListening = false;
      this.onListeningChangeCallback?.(false);
      
      // Auto-retry for network errors after a delay
      if (event.error === 'network') {
        setTimeout(() => {
          if (!this.isListening) {
            // Don't auto-retry, let user manually retry
            // this.startListening();
          }
        }, 1000);
      }
    };
  }

  private parseCommand(text: string, confidence: number): CommandResult {
    text = text.toLowerCase().trim();

    // Navigation commands
    if (text.includes('next page') || text.includes('go forward') || text.includes('page forward')) {
      return { command: 'next-page', text, confidence };
    }
    if (text.includes('previous page') || text.includes('go back') || text.includes('page back')) {
      return { command: 'previous-page', text, confidence };
    }
    if (text.includes('first page') || text.includes('go to start') || text.includes('beginning')) {
      return { command: 'first-page', text, confidence };
    }
    if (text.includes('last page') || text.includes('go to end') || text.includes('final page')) {
      return { command: 'last-page', text, confidence };
    }

    // Go to specific page
    const pageMatch = text.match(/(?:go to|jump to|open|show) page (\d+)/);
    if (pageMatch) {
      return { command: 'go-to-page', parameters: { pageNumber: parseInt(pageMatch[1]) }, text, confidence };
    }

    // Zoom commands
    if (text.includes('zoom in') || text.includes('make bigger') || text.includes('enlarge')) {
      return { command: 'zoom-in', text, confidence };
    }
    if (text.includes('zoom out') || text.includes('make smaller') || text.includes('shrink')) {
      return { command: 'zoom-out', text, confidence };
    }
    if (text.includes('reset zoom') || text.includes('normal size') || text.includes('default zoom')) {
      return { command: 'reset-zoom', text, confidence };
    }

    // Font size commands
    if (text.includes('increase font') || text.includes('larger text') || text.includes('bigger text')) {
      return { command: 'increase-font', text, confidence };
    }
    if (text.includes('decrease font') || text.includes('smaller text') || text.includes('reduce font')) {
      return { command: 'decrease-font', text, confidence };
    }

    // TTS commands
    if (text.includes('read aloud') || text.includes('start reading') || text.includes('read this') || text.includes('read document')) {
      return { command: 'read-aloud', text, confidence };
    }
    if (text.includes('stop reading') || text.includes('stop speech')) {
      return { command: 'stop-reading', text, confidence };
    }
    if (text.includes('pause reading') || text.includes('pause speech')) {
      return { command: 'pause-reading', text, confidence };
    }
    if (text.includes('resume reading') || text.includes('continue reading')) {
      return { command: 'resume-reading', text, confidence };
    }

    // AI features
    if (text.includes('summarize') || text.includes('summary') || text.includes('give me a summary')) {
      return { command: 'summarize', text, confidence };
    }
    if (text.includes('open chat') || text.includes('start chat') || text.includes('chat with document')) {
      return { command: 'chat', text, confidence };
    }

    // Question asking
    if (text.startsWith('what') || text.startsWith('how') || text.startsWith('why') || 
        text.startsWith('when') || text.startsWith('where') || text.startsWith('who')) {
      return { command: 'ask-question', parameters: { question: text }, text, confidence };
    }

    // Theme commands
    if (text.includes('dark mode') || text.includes('dark theme') || text.includes('switch to dark')) {
      return { command: 'dark-mode', text, confidence };
    }
    if (text.includes('light mode') || text.includes('light theme') || text.includes('switch to light')) {
      return { command: 'light-mode', text, confidence };
    }

    // View switching
    if (text.includes('switch view') || text.includes('change view') || text.includes('toggle view') ||
        text.includes('pdf view') || text.includes('text view') || text.includes('document view')) {
      return { command: 'switch-view', text, confidence };
    }

    // Accessibility
    if (text.includes('accessibility') || text.includes('settings') || text.includes('open settings')) {
      return { command: 'accessibility', text, confidence };
    }

    return { command: 'unknown', text, confidence };
  }

  public isSupported(): boolean {
    return this.recognition !== null && this.synthesis !== null;
  }

  public startListening() {
    if (!this.recognition) {
      this.onErrorCallback?.('Speech recognition not supported');
      return;
    }

    try {
      this.recognition.start();
    } catch (error) {
      console.error('Error starting recognition:', error);
      this.onErrorCallback?.('Failed to start voice recognition');
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
    }
  }

  public speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.synthesis) {
        reject(new Error('Speech synthesis not supported'));
        return;
      }

      // Cancel any ongoing speech
      this.synthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate || 1.0;
      utterance.pitch = options?.pitch || 1.0;
      utterance.volume = options?.volume || 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      this.synthesis.speak(utterance);
    });
  }

  public stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  public onCommand(callback: (result: CommandResult) => void) {
    this.onCommandCallback = callback;
  }

  public onListeningChange(callback: (isListening: boolean) => void) {
    this.onListeningChangeCallback = callback;
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}
