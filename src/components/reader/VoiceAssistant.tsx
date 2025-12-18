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
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowPanel(false)}
            aria-hidden="true"
          />
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-xl shadow-2xl z-50"
            style={{ width: '32rem', maxHeight: '80vh', overflow: 'auto' }}
            role="dialog"
            aria-label="Voice Commands"
          >
            {/* Header */}
            <div className="border-b border-border" style={{ padding: '1.25rem 1.5rem' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <h2 className="text-lg font-bold text-foreground">Voice Assistant</h2>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              <div className="space-y-12">
                {/* Navigation */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-6">Navigation</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Next / Previous page</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Next page" • "Previous page"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">First / Last page</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"First page" • "Last page"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Go to specific page</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Go to page 5"</span>
                    </div>
                  </div>
                </div>

                {/* Zoom & Font */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-6">Zoom & Font</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Zoom in / out</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Zoom in" • "Zoom out"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Reset zoom</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Reset zoom"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Font size</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Increase font" • "Decrease font"</span>
                    </div>
                  </div>
                </div>

                {/* Text-to-Speech */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-6">Text-to-Speech</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Start reading</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Read aloud" • "Start reading"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Pause / Resume</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Pause reading" • "Resume reading"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Stop reading</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Stop reading"</span>
                    </div>
                  </div>
                </div>

                {/* AI Features */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-6">AI Features</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Summarize</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Summarize" • "Give me a summary"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Chat</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Open chat" • "Chat with document"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Ask questions</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"What is...?"</span>
                    </div>
                  </div>
                </div>

                {/* View & Theme */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-6">View & Theme</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Switch view</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Switch view" • "PDF view"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Theme</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Dark mode" • "Light mode"</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Accessibility</span>
                      <span className="text-xs font-medium px-2 py-1 rounded bg-muted/50 text-muted-foreground">"Open accessibility"</span>
                    </div>
                  </div>
                </div>

                {/* Usage Tip */}
                <div className="pt-2">
                  <p className="text-xs text-muted-foreground italic">
                    Tip: Click the microphone button and speak naturally to execute commands.
                  </p>
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
