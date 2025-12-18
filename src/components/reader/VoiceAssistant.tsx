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

      assistantRef.current.onError((error) => {
        console.error('Voice assistant error:', error);
        setIsListening(false);
      });
    }

    return () => {
      assistantRef.current?.stopListening();
      assistantRef.current?.stopSpeaking();
    };
  }, []);

  const handleStartListening = () => {
    if (assistantRef.current) {
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
          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        ) : (
          <svg className="w-8 h-8 mx-auto" fill="currentColor" viewBox="0 0 24 24">
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
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      {lastCommand && !isListening && (
        <div className="fixed bottom-32 right-8 z-50 bg-background border border-border rounded-lg shadow-xl p-3 animate-fade-in">
          <p className="text-xs text-muted-foreground">Last command:</p>
          <p className="text-sm font-medium text-foreground">&quot;{lastCommand}&quot;</p>
        </div>
      )}

      {/* Voice Commands Panel */}
      {showPanel && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
            aria-hidden="true"
          />
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-3xl max-h-[85vh] bg-background border border-border rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col"
            role="dialog"
            aria-label="Voice Commands"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-muted/30">
              <div>
                <h2 className="text-3xl font-bold text-foreground">Voice Assistant</h2>
                <p className="text-base text-muted-foreground mt-1">Control SmartReader with your voice</p>
              </div>
              <button
                onClick={() => setShowPanel(false)}
                className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="Close"
              >
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable content area */}
            <div className="overflow-y-auto p-6">
              <div className="flex flex-col gap-6">
                {/* Navigation */}
                <div className="p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    Navigation
                  </h3>
                  <div className="space-y-4 text-base">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Next page&quot; • &quot;Previous page&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;First page&quot; • &quot;Last page&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Go to page 5&quot;</p>
                    </div>
                  </div>
                </div>

                {/* Zoom */}
                <div className="p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                      </svg>
                    </div>
                    Zoom & Font
                  </h3>
                  <div className="space-y-4 text-base">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Zoom in&quot; • &quot;Zoom out&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Reset zoom&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Increase font&quot; • &quot;Decrease font&quot;</p>
                    </div>
                  </div>
                </div>

                {/* Reading */}
                <div className="p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      </svg>
                    </div>
                    Text-to-Speech
                  </h3>
                  <div className="space-y-4 text-base">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Read aloud&quot; • &quot;Start reading&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Pause reading&quot; • &quot;Resume reading&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Stop reading&quot;</p>
                    </div>
                  </div>
                </div>

                {/* AI Features */}
                <div className="p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    AI Features
                  </h3>
                  <div className="space-y-4 text-base">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Summarize&quot; • &quot;Give me a summary&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Open chat&quot; • &quot;Chat with document&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <p className="text-foreground/90 font-medium">Ask questions: &quot;What is...?&quot;</p>
                    </div>
                  </div>
                </div>

                {/* View & Theme */}
                <div className="p-6 rounded-xl border border-border bg-card hover:border-accent/50 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    View & Theme
                  </h3>
                  <div className="space-y-4 text-base">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Switch view&quot; • &quot;PDF view&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Dark mode&quot; • &quot;Light mode&quot;</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                      <p className="text-foreground/90 font-medium">&quot;Open accessibility&quot;</p>
                    </div>
                  </div>
                </div>

                {/* How to use */}
                <div className="p-6 rounded-xl border border-border bg-muted/30">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center flex-shrink-0">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-foreground mb-2">How to use</h4>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        Click the floating microphone button and speak naturally. The assistant will understand your command and execute it automatically.
                      </p>
                    </div>
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
