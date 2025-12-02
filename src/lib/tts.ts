/**
 * Text-to-Speech utility using Web Speech API
 */
export class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private voicesLoaded: boolean = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
      
      // Load voices
      this.loadVoices();
      
      // Listen for voices changed event (Chrome needs this)
      if (this.synthesis) {
        this.synthesis.addEventListener('voiceschanged', () => {
          this.loadVoices();
        });
      }
    }
  }

  private loadVoices(): void {
    if (this.synthesis) {
      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
      }
    }
  }

  private async ensureVoicesLoaded(): Promise<void> {
    if (this.voicesLoaded) return;
    
    return new Promise((resolve) => {
      if (!this.synthesis) {
        resolve();
        return;
      }

      const voices = this.synthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        resolve();
        return;
      }

      // Wait for voices to load
      const timeout = setTimeout(() => {
        this.voicesLoaded = true;
        resolve();
      }, 1000);

      this.synthesis.addEventListener('voiceschanged', () => {
        clearTimeout(timeout);
        this.voicesLoaded = true;
        resolve();
      }, { once: true });
    });
  }

  /**
   * Speak the given text
   */
  async speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }): Promise<void> {
    if (!this.synthesis) {
      console.error('Text-to-speech not supported');
      options?.onError?.(new Error('Text-to-speech not supported in this browser'));
      return;
    }

    try {
      // Cancel any ongoing speech first
      if (this.synthesis.speaking) {
        this.synthesis.cancel();
        // Wait a bit for cancellation to complete
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      // Ensure voices are loaded
      await this.ensureVoicesLoaded();

      if (!this.synthesis) return;

      // Sanitize and limit text length
      let cleanText = text.trim();
      if (cleanText.length === 0) {
        options?.onError?.(new Error('No text to read'));
        return;
      }

      // Limit to prevent browser issues - more conservative limit
      const maxLength = 3000;
      if (cleanText.length > maxLength) {
        cleanText = cleanText.substring(0, maxLength);
        console.log('Text truncated to', maxLength, 'characters');
      }

      // Create a simple test utterance first to verify TTS is working
      const testUtterance = new SpeechSynthesisUtterance('');
      this.synthesis.speak(testUtterance);
      this.synthesis.cancel();
      
      // Small delay after test
      await new Promise(resolve => setTimeout(resolve, 100));

      this.utterance = new SpeechSynthesisUtterance(cleanText);
      
      // Set values with safe defaults
      this.utterance.rate = Math.max(0.5, Math.min(2, options?.rate ?? 1));
      this.utterance.pitch = Math.max(0, Math.min(2, options?.pitch ?? 1));
      this.utterance.volume = Math.max(0, Math.min(1, options?.volume ?? 1));
      this.utterance.lang = 'en-US';
      
      // Get voices and set a default voice
      const voices = this.synthesis.getVoices();
      console.log('Available voices:', voices.length);
      
      if (voices.length > 0) {
        // Don't set a voice - let browser use default
        // Setting voice can sometimes cause synthesis-failed in some browsers
        console.log('Using browser default voice');
      }

      let hasStarted = false;

      this.utterance.onstart = () => {
        hasStarted = true;
        console.log('Speech started successfully');
      };

      this.utterance.onend = () => {
        console.log('Speech ended');
        options?.onEnd?.();
      };

      this.utterance.onerror = (event) => {
        console.error('Speech synthesis error:', {
          error: event.error,
          type: event.type,
          hasStarted: hasStarted
        });
        
        // If it failed before starting, it's likely a browser/system issue
        if (!hasStarted) {
          const errorMsg = 'Text-to-speech is not available.\n\nThis feature requires:\n• Windows, macOS, Chrome OS, Android, or iOS\n• Chrome, Edge, or Safari browser\n\nLinux systems have limited browser TTS support.\nPlease try on a different device or operating system.';
          options?.onError?.(new Error(errorMsg));
        } else {
          // Failed during playback
          options?.onError?.(new Error('Speech playback was interrupted'));
        }
      };

      // Start speaking
      this.synthesis.speak(this.utterance);
      console.log('Speech synthesis started for text length:', cleanText.length);
      
      // Timeout check - if it doesn't start in 3 seconds, something is wrong
      setTimeout(() => {
        if (!hasStarted && this.synthesis?.speaking) {
          console.error('Speech did not start within timeout');
          this.synthesis?.cancel();
          options?.onError?.(new Error('Speech synthesis timeout. The browser may not support this feature properly.'));
        }
      }, 3000);
      
    } catch (error) {
      console.error('Error starting speech:', error);
      options?.onError?.(error instanceof Error ? error : new Error('Failed to start speech'));
    }
  }

  /**
   * Stop current speech
   */
  stop(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }

  /**
   * Pause current speech
   */
  pause(): void {
    if (this.synthesis) {
      this.synthesis.pause();
    }
  }

  /**
   * Resume paused speech
   */
  resume(): void {
    if (this.synthesis) {
      this.synthesis.resume();
    }
  }

  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis?.speaking ?? false;
  }

  /**
   * Get available voices
   */
  getVoices(): SpeechSynthesisVoice[] {
    return this.synthesis?.getVoices() ?? [];
  }

  /**
   * Check if TTS is supported
   */
  isSupported(): boolean {
    return !!this.synthesis;
  }
}

export const ttsService = new TextToSpeechService();
