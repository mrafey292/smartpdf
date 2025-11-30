/**
 * Text-to-Speech utility using Web Speech API
 */
export class TextToSpeechService {
  private synthesis: SpeechSynthesis | null = null;
  private utterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synthesis = window.speechSynthesis;
    }
  }

  /**
   * Speak the given text
   */
  speak(text: string, options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voice?: SpeechSynthesisVoice;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }): void {
    if (!this.synthesis) {
      console.error('Text-to-speech not supported');
      return;
    }

    // Cancel any ongoing speech
    this.stop();

    this.utterance = new SpeechSynthesisUtterance(text);
    
    if (options?.rate) this.utterance.rate = options.rate;
    if (options?.pitch) this.utterance.pitch = options.pitch;
    if (options?.volume) this.utterance.volume = options.volume;
    if (options?.voice) this.utterance.voice = options.voice;

    if (options?.onEnd) {
      this.utterance.onend = options.onEnd;
    }

    if (options?.onError) {
      this.utterance.onerror = (event) => {
        options.onError?.(new Error(event.error));
      };
    }

    this.synthesis.speak(this.utterance);
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
