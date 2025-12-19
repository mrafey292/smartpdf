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
  private isAlwaysListening: boolean = false;
  private isWaitingForCommand: boolean = false;
  private wakeWord: string = 'smart reader';
  private onCommandCallback?: (result: CommandResult) => void;
  private onListeningChangeCallback?: (isListening: boolean) => void;
  private onWakeWordDetectedCallback?: () => void;
  private onErrorCallback?: (error: string) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Initialize speech recognition
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true; // Always continuous for wake word
        this.recognition.interimResults = true;
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
      
      // If always listening is enabled, restart recognition
      if (this.isAlwaysListening) {
        try {
          this.recognition.start();
        } catch (e) {
          // Ignore errors if already started
        }
      }
    };

    this.recognition.onresult = async (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const transcript = (finalTranscript || interimTranscript).toLowerCase();
      
      // State 1: Waiting for Wake Word
      if (!this.isWaitingForCommand) {
        if (transcript.includes(this.wakeWord)) {
          console.log('Wake word detected!');
          this.isWaitingForCommand = true;
          this.onWakeWordDetectedCallback?.();
          
          // Play a subtle beep sound
          this.playNotificationSound();

          // If there's more text after the wake word in the same result, process it
          const commandAfterWake = transcript.split(this.wakeWord).pop()?.trim();
          if (commandAfterWake && finalTranscript) {
            this.processCommand(commandAfterWake, event.results[event.results.length - 1][0].confidence);
          }
        }
      } 
      // State 2: Waiting for Command after Wake Word
      else if (finalTranscript) {
        const commandText = finalTranscript.trim();
        if (commandText) {
          this.processCommand(commandText, event.results[event.results.length - 1][0].confidence);
        }
      }
    };

    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' && this.isAlwaysListening) {
        return; // Ignore no-speech errors in always listening mode
      }
      this.onErrorCallback?.(event.error);
    };
  }

  private async processCommand(text: string, confidence: number) {
    // Don't process if it's just the wake word again
    if (text.toLowerCase() === this.wakeWord) return;

    try {
      const result = await this.parseCommand(text, confidence);
      this.onCommandCallback?.(result);
    } catch (error) {
      console.error('Error parsing command:', error);
    } finally {
      this.isWaitingForCommand = false;
    }
  }

  private playNotificationSound() {
    if (typeof window === 'undefined') return;
    
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
    oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.1); // Drop to A4
    
    gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.start();
    oscillator.stop(audioCtx.currentTime + 0.2);
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

  public onWakeWordDetected(callback: () => void) {
    this.onWakeWordDetectedCallback = callback;
  }

  public onError(callback: (error: string) => void) {
    this.onErrorCallback = callback;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public setAlwaysListening(enabled: boolean) {
    this.isAlwaysListening = enabled;
    if (enabled) {
      this.recognition.continuous = true;
      if (!this.isListening) {
        this.startListening();
      }
    } else {
      this.recognition.continuous = false;
      this.stopListening();
    }
  }

  public getIsAlwaysListening(): boolean {
    return this.isAlwaysListening;
  }
}
