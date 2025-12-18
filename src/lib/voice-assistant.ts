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

    this.recognition.onresult = async (event: any) => {
      const transcript = event.results[0][0].transcript;
      const confidence = event.results[0][0].confidence;
      
      console.log('Voice input:', transcript, 'Confidence:', confidence);
      
      try {
        const result = await this.parseCommand(transcript, confidence);
        this.onCommandCallback?.(result);
      } catch (error) {
        console.error('Error parsing command:', error);
        this.onCommandCallback?.({ command: 'unknown', text: transcript, confidence });
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.onErrorCallback?.(event.error);
      this.isListening = false;
      this.onListeningChangeCallback?.(false);
    };
  }

  private async parseCommand(text: string, confidence: number): Promise<CommandResult> {
    try {
      const response = await fetch('/api/parse-command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to parse command');
      }

      const data = await response.json();
      return {
        command: data.command,
        parameters: data.parameters,
        text: text,
        confidence: confidence
      };
    } catch (error) {
      console.error('Error calling parse-command API:', error);
      return { command: 'unknown', text, confidence };
    }
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
