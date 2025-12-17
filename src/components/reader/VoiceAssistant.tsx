"use client";

import { useState, useEffect, useRef } from 'react';
import { VoiceAssistant as VoiceAssistantService, CommandResult } from '@/lib/voice-assistant';

interface VoiceAssistantProps {
  onCommand: (result: CommandResult) => void;
  isEnabled?: boolean;
}

export function VoiceAssistant({ onCommand, isEnabled = true }: VoiceAssistantProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  const [lastCommand, setLastCommand] = useState<string>('');
  const [showPanel, setShowPanel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const assistantRef = useRef<VoiceAssistantService | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      assistantRef.current = new VoiceAssistantService();
      
      setIsSupported(assistantRef.current.isSupported());

      assistantRef.current.onCommand((result) => {
        console.log('Command received:', result);
        setLastCommand(result.text);
        onCommand(result);
        
        // Provide voice feedback
        if (result.command !== 'unknown') {
          assistantRef.current?.speak('Okay, executing command');
        } else {
          assistantRef.current?.speak('Sorry, I didn\'t understand that command');
        }
      });

      assistantRef.current.onListeningChange((listening) => {
        setIsListening(listening);
      });

      assistantRef.current.onError((errorType) => {
        // Only log unexpected errors to console
        if (errorType !== 'network' && errorType !== 'no-speech') {
          console.error('Voice assistant error:', errorType);
        }
        
        setIsListening(false);
        
        // Show user-friendly error messages
        let errorMessage = '';
        switch (errorType) {
          case 'network':
            errorMessage = 'Speech recognition requires internet. Please check your connection and try again.';
            break;
          case 'not-allowed':
          case 'permission-denied':
            errorMessage = 'Microphone permission denied. Please enable microphone access in your browser settings.';
            break;
          case 'no-speech':
            errorMessage = 'No speech detected. Click the button and speak clearly.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone found. Please connect a microphone and try again.';
            break;
          case 'aborted':
            errorMessage = 'Speech recognition was stopped.';
            break;
          default:
            errorMessage = 'Speech recognition error. Please try again.';
        }
        
        setError(errorMessage);
        setTimeout(() => setError(null), 6000); // Clear error after 6 seconds
      });
    }

    return () => {
      assistantRef.current?.stopListening();
      assistantRef.current?.stopSpeaking();
    };
  }, []);

  const handleStartListening = () => {
    if (assistantRef.current) {
      setError(null); // Clear any previous errors
      assistantRef.current.startListening();
    }
  };

  const handleStopListening = () => {
    if (assistantRef.current) {
      assistantRef.current.stopListening();
    }
  };

  if (!isEnabled || !isSupported) {
    return null;
  }

  return (
    <>
      {/* Floating Voice Button */}
      <button
        onClick={() => {
          if (isListening) {
            handleStopListening();
          } else {
            handleStartListening();
          }
        }}
        className="fixed bottom-8 right-8 z-50 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 flex items-center justify-center"
        style={{
          width: '64px',
          height: '64px',
          backgroundColor: isListening ? '#ef4444' : 'var(--accent)',
          color: 'white',
          border: isListening ? '3px solid #fca5a5' : 'none',
          animation: isListening ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : 'none',
        }}
        aria-label={isListening ? 'Stop listening' : 'Start voice assistant'}
        title={isListening ? 'Click to stop' : 'Click to speak'}
      >
        {isListening ? (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        ) : (
          <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        )}
      </button>

      {/* Info button next to voice button */}
      <button
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-8 right-28 z-50 rounded-full shadow-lg transition-all duration-300 hover:scale-110 flex items-center justify-center"
        style={{
          width: '48px',
          height: '48px',
          backgroundColor: 'var(--muted)',
          color: 'var(--foreground)',
          border: '1px solid var(--border)',
        }}
        aria-label="Voice commands help"
        title="View voice commands"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </button>

      {/* Listening indicator */}
      {isListening && (
        <div className="fixed bottom-32 right-8 z-50 bg-background border border-border rounded-lg shadow-xl p-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="flex gap-1">
              <div className="w-1 h-8 bg-accent animate-pulse" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1 h-8 bg-accent animate-pulse" style={{ animationDelay: '150ms' }}></div>
              <div className="w-1 h-8 bg-accent animate-pulse" style={{ animationDelay: '300ms' }}></div>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Listening...</p>
              <p className="text-xs text-muted-foreground">Speak your command</p>
            </div>
          </div>
        </div>
      )}
      {/* Last command display */}
      {lastCommand && !isListening && !error && (
        <div className="fixed bottom-32 right-8 z-50 bg-background border border-border rounded-lg shadow-xl p-3 animate-fade-in">
          <p className="text-xs text-muted-foreground">Last command:</p>
          <p className="text-sm font-medium text-foreground">&quot;{lastCommand}&quot;</p>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="fixed bottom-32 right-8 z-50 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg shadow-xl p-4 animate-fade-in max-w-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-red-900 dark:text-red-100">Voice Assistant Error</p>
              <p className="text-xs text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="ml-auto p-1 hover:bg-red-100 dark:hover:bg-red-800/30 rounded transition-colors"
              aria-label="Dismiss error"
            >
              <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Voice Commands Panel */}
      {showPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
            aria-hidden="true"
          />
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            style={{ width: '40rem', maxHeight: '85vh', backgroundColor: 'var(--background)' }}
            role="dialog"
            aria-label="Voice Commands"
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between border-b border-border shrink-0"
              style={{ padding: '2rem 2rem 1.5rem 2rem', backgroundColor: 'var(--background)' }}
            >
              <div>
                <h2 className="text-3xl font-bold text-foreground" style={{ marginBottom: '0.25rem' }}>Voice Commands</h2>
                <p className="text-base text-muted-foreground">Control SmartReader with your voice</p>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Close commands"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="overflow-y-auto" style={{ padding: '1.5rem 2rem 2rem 2rem' }}>
              {/* Navigation Commands */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  <h3 className="text-xl font-semibold text-foreground">Navigation</h3>
                </div>
                <div className="space-y-2" style={{ marginBottom: '0.5rem' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Next page&quot; • &quot;Previous page&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;First page&quot; • &quot;Last page&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Go to page 5&quot;</p>
                  </div>
                </div>
              </div>

              {/* Zoom & Font Commands */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  <h3 className="text-xl font-semibold text-foreground">Zoom & Font</h3>
                </div>
                <div className="space-y-2" style={{ marginBottom: '0.5rem' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Zoom in&quot; • &quot;Zoom out&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Reset zoom&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Increase font&quot; • &quot;Decrease font&quot;</p>
                  </div>
                </div>
              </div>

              {/* Text-to-Speech Commands */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-foreground">Text-to-Speech</h3>
                </div>
                <div className="space-y-2" style={{ marginBottom: '0.5rem' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Read aloud&quot; • &quot;Start reading&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Pause reading&quot; • &quot;Resume reading&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Stop reading&quot;</p>
                  </div>
                </div>
              </div>

              {/* AI Commands */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-foreground">AI Features</h3>
                </div>
                <div className="space-y-2" style={{ marginBottom: '0.5rem' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Summarize&quot; • &quot;Give me a summary&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Open chat&quot; • &quot;Chat with document&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">Ask questions: &quot;What is...?&quot; &quot;How does...?&quot;</p>
                  </div>
                </div>
              </div>

              {/* View & Theme Commands */}
              <div style={{ marginBottom: '2rem' }}>
                <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <h3 className="text-xl font-semibold text-foreground">View & Theme</h3>
                </div>
                <div className="space-y-2" style={{ marginBottom: '0.5rem' }}>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Switch view&quot; • &quot;PDF view&quot; • &quot;Text view&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Dark mode&quot; • &quot;Light mode&quot;</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full mt-2.5" style={{ backgroundColor: 'var(--accent)', flexShrink: 0 }}></div>
                    <p className="text-base text-foreground/90">&quot;Open accessibility&quot; • &quot;Settings&quot;</p>
                  </div>
                </div>
              </div>

              {/* Tip Section */}
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-base font-semibold text-foreground" style={{ marginBottom: '0.25rem' }}>How to use</h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Click the floating microphone button and speak naturally. The assistant will understand your command and execute it automatically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      <style jsx global>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </>
  );
}
