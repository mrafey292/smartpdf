"use client";

import { useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import { ChatMessage, ChatResponse } from '@/types';

// Component to format AI responses with better typography
function FormattedMessage({ text }: { text: string }) {
  const parseInlineFormatting = (content: string): ReactNode[] => {
    const parts = content.split(/(\*\*.*?\*\*|\*.*?\*)/g);
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index}>{part.slice(2, -2)}</strong>;
      } else if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
        return <em key={index}>{part.slice(1, -1)}</em>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const formatText = (content: string) => {
    const lines = content.split('\n');
    const elements: ReactNode[] = [];
    let listItems: string[] = [];
    let inList = false;
    let key = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key++}`} className="space-y-1.5 my-2" style={{ paddingLeft: '1rem' }}>
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm leading-relaxed flex gap-2">
                <span style={{ color: 'var(--accent)', marginTop: '0.15rem' }}>•</span>
                <span className="flex-1">{parseInlineFormatting(item)}</span>
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line) => {
      const trimmed = line.trim();
      
      if (!trimmed) {
        flushList();
        return;
      }

      // Headers (ending with : or starting with ##)
      if (trimmed.endsWith(':') && !trimmed.startsWith('-') && !trimmed.startsWith('*')) {
        flushList();
        const headerText = trimmed.replace(/^##\s*/, '').replace(/:$/, '');
        elements.push(
          <h4 key={`header-${key++}`} className="font-semibold text-sm mt-3 mb-1.5">
            {parseInlineFormatting(headerText)}
          </h4>
        );
        return;
      }

      // Numbered lists
      if (/^\d+\.\s/.test(trimmed)) {
        const content = trimmed.replace(/^\d+\.\s*/, '');
        if (!inList) inList = true;
        listItems.push(content);
        return;
      }

      // Bullet points
      if (/^[-*•]\s/.test(trimmed)) {
        const content = trimmed.replace(/^[-*•]\s*/, '');
        if (!inList) inList = true;
        listItems.push(content);
        return;
      }

      // Bold text (matches **text** or **text:**)
      if (trimmed.startsWith('**') && (trimmed.includes('**', 2))) {
        flushList();
        const text = trimmed.replace(/^\*\*/, '').replace(/\*\*/, '');
        elements.push(
          <p key={`bold-${key++}`} className="font-semibold text-sm my-2">
            {parseInlineFormatting(text)}
          </p>
        );
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`para-${key++}`} className="text-sm leading-relaxed mb-2">
          {parseInlineFormatting(trimmed)}
        </p>
      );
    });

    flushList();
    return elements;
  };

  return <div className="formatted-message">{formatText(text)}</div>;
}

interface ChatPanelProps {
  documentText: string;
  isOpen: boolean;
  onClose: () => void;
  initialQuestion?: string;
}

export function ChatPanel({ documentText, isOpen, onClose, initialQuestion }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle initial question from voice assistant
  useEffect(() => {
    if (isOpen && initialQuestion && messages.length === 0) {
      setInput(initialQuestion);
      // We don't auto-send to give user a chance to review/edit
    }
  }, [isOpen, initialQuestion]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          question: input,
          conversationHistory: messages
        })
      });

      const data: ChatResponse = await response.json();

      if (data.success && data.answer) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          text: data.answer,
          timestamp: data.timestamp
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || 'Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Chat Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-[28rem] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Document Chat"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border" style={{ padding: '1rem 1.5rem' }}>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold text-foreground">AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Ask questions about this document</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="p-2 rounded-lg hover:bg-muted transition-colors"
                aria-label="Clear chat"
                title="Clear chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close chat"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '1rem 1.25rem' }}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-6">
              <div className="rounded-full p-4 mb-4" style={{ backgroundColor: 'var(--muted)' }}>
                <svg className="w-12 h-12" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="font-semibold text-foreground mb-2">Start a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-xs">Ask me anything about this document and I'll help you understand it better!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className="max-w-[80%] rounded-2xl shadow-sm"
                    style={{
                      padding: message.role === 'user' ? '0.75rem 1rem' : '0.875rem 1rem',
                      backgroundColor: message.role === 'user' ? 'var(--accent)' : 'var(--background)',
                      color: message.role === 'user' ? 'white' : 'var(--foreground)',
                      border: message.role === 'assistant' ? '1px solid var(--border)' : 'none'
                    }}
                  >
                    <div className="text-sm leading-relaxed">
                      {message.role === 'assistant' ? (
                        <FormattedMessage text={message.text} />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.text}</p>
                      )}
                    </div>
                    <p className="text-xs mt-2.5 flex items-center gap-1.5" style={{ opacity: 0.5 }}>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-5 py-4 shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
                    <div className="flex gap-1.5 items-center">
                      <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '0ms' }}></div>
                      <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '150ms' }}></div>
                      <div className="w-2.5 h-2.5 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border" style={{ padding: '1rem 1.25rem' }}>
          <div className="flex gap-2.5">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Ask a question about the document..."
              disabled={loading}
              className="flex-1 rounded-xl border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition-all disabled:opacity-50"
              style={{ padding: '0.75rem 1rem' }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="rounded-xl font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md flex items-center gap-2"
              style={{
                padding: '0.75rem 1.25rem',
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
              aria-label="Send message"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted-foreground" style={{ marginTop: '0.625rem', paddingLeft: '0.25rem', paddingRight: '0.25rem' }}>
            Press Enter to send • AI responses may take a few seconds
          </p>
        </div>
      </div>
    </>
  );
}
