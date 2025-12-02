"use client";

import { useState, type ReactNode } from 'react';
import { SummaryResponse, AnalysisResponse } from '@/types';

interface SummaryPanelProps {
  documentText: string;
  isOpen: boolean;
  onClose: () => void;
}

// Component to format and render AI response with proper markdown-like formatting
function FormattedContent({ content }: { content: string }) {
  // Function to parse inline formatting (bold and italic text)
  const parseInlineFormatting = (text: string): ReactNode[] => {
    const parts: ReactNode[] = [];
    let currentText = text;
    let partKey = 0;

    // Combined regex to match both **bold** and *italic*
    const formattingRegex = /(\*\*.*?\*\*|\*.*?\*)/g;
    let lastIndex = 0;
    let match;

    while ((match = formattingRegex.exec(currentText)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(currentText.substring(lastIndex, match.index));
      }
      
      const matchedText = match[0];
      
      // Check if it's bold (**text**)
      if (matchedText.startsWith('**') && matchedText.endsWith('**')) {
        const boldText = matchedText.slice(2, -2);
        parts.push(
          <strong key={`bold-${partKey++}`} className="font-semibold">
            {boldText}
          </strong>
        );
      }
      // Check if it's italic (*text*) - but not part of **
      else if (matchedText.startsWith('*') && matchedText.endsWith('*') && !matchedText.startsWith('**')) {
        const italicText = matchedText.slice(1, -1);
        parts.push(
          <em key={`italic-${partKey++}`} className="italic">
            {italicText}
          </em>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < currentText.length) {
      parts.push(currentText.substring(lastIndex));
    }

    return parts.length > 0 ? parts : [text];
  };

  // Split content into paragraphs and format lists
  const formatContent = (text: string) => {
    const lines = text.split('\n');
    const elements: ReactNode[] = [];
    let listItems: string[] = [];
    let inList = false;
    let key = 0;

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${key++}`} className="space-y-2 mb-4" style={{ paddingLeft: '1.5rem' }}>
            {listItems.map((item, idx) => (
              <li key={idx} className="text-sm text-foreground" style={{ listStyleType: 'disc' }}>
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
        inList = false;
      }
    };

    lines.forEach((line, idx) => {
      const trimmedLine = line.trim();
      
      // Skip empty lines
      if (!trimmedLine) {
        flushList();
        return;
      }

      // Check for headers (lines ending with : or starting with ##)
      if (trimmedLine.endsWith(':') && !trimmedLine.includes('**')) {
        flushList();
        const headerText = trimmedLine.replace(/^##\s*/, '').replace(/:$/, '');
        elements.push(
          <h4 key={`header-${key++}`} className="font-semibold text-foreground mb-2 mt-3" style={{ fontSize: '0.95rem' }}>
            {parseInlineFormatting(headerText)}
          </h4>
        );
        return;
      }

      if (trimmedLine.startsWith('##')) {
        flushList();
        const headerText = trimmedLine.replace(/^##\s*/, '');
        elements.push(
          <h4 key={`header-${key++}`} className="font-semibold text-foreground mb-2 mt-3" style={{ fontSize: '0.95rem' }}>
            {parseInlineFormatting(headerText)}
          </h4>
        );
        return;
      }

      // Check for numbered lists (1. 2. etc)
      if (/^\d+\.\s/.test(trimmedLine)) {
        flushList();
        const content = trimmedLine.replace(/^\d+\.\s*/, '');
        if (!inList || listItems.length === 0) {
          inList = true;
        }
        listItems.push(content);
        return;
      }

      // Check for bullet points (-, *, •)
      if (/^[-*•]\s/.test(trimmedLine)) {
        const content = trimmedLine.replace(/^[-*•]\s*/, '');
        if (!inList) {
          inList = true;
        }
        listItems.push(content);
        return;
      }

      // Regular paragraph
      flushList();
      elements.push(
        <p key={`para-${key++}`} className="text-sm text-foreground mb-3 leading-relaxed">
          {parseInlineFormatting(trimmedLine)}
        </p>
      );
    });

    flushList(); // Flush any remaining list items
    return elements;
  };

  return <div className="formatted-content">{formatContent(content)}</div>;
}

interface SummaryResult {
  type: 'brief' | 'detailed' | 'key-points';
  content: string;
  timestamp: number;
}

interface AnalysisResult {
  type: 'key-concepts' | 'study-questions';
  content: string;
  timestamp: number;
}

interface SummaryPanelProps {
  documentText: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SummaryPanel({ documentText, isOpen, onClose }: SummaryPanelProps) {
  const [summaries, setSummaries] = useState<SummaryResult[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'summary' | 'analysis'>('summary');
  const [summaryType, setSummaryType] = useState<'brief' | 'detailed' | 'key-points'>('brief');
  const [analysisType, setAnalysisType] = useState<'key-concepts' | 'study-questions'>('key-concepts');

  const generateSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          summaryType,
          simplify: false
        })
      });

      const data: SummaryResponse = await response.json();

      if (data.success && data.summary) {
        const newSummary: SummaryResult = {
          type: summaryType,
          content: data.summary,
          timestamp: Date.now()
        };
        setSummaries(prev => [newSummary, ...prev]);
      } else {
        throw new Error(data.error || 'Failed to generate summary');
      }
    } catch (error) {
      console.error('Summary error:', error);
      const errorSummary: SummaryResult = {
        type: summaryType,
        content: 'Failed to generate summary. Please try again.',
        timestamp: Date.now()
      };
      setSummaries(prev => [errorSummary, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  const generateAnalysis = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/analyze-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          analysisType,
          questionCount: 10
        })
      });

      const data: AnalysisResponse = await response.json();

      if (data.success && data.result) {
        const newAnalysis: AnalysisResult = {
          type: analysisType,
          content: data.result,
          timestamp: Date.now()
        };
        setAnalyses(prev => [newAnalysis, ...prev]);
      } else {
        throw new Error(data.error || 'Failed to analyze document');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      const errorAnalysis: AnalysisResult = {
        type: analysisType,
        content: 'Failed to analyze document. Please try again.',
        timestamp: Date.now()
      };
      setAnalyses(prev => [errorAnalysis, ...prev]);
    } finally {
      setLoading(false);
    }
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
      
      {/* Summary Panel */}
      <div 
        className="fixed right-0 top-0 h-full w-[32rem] bg-background border-l border-border z-50 flex flex-col shadow-2xl"
        role="dialog"
        aria-label="Document Summary & Analysis"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border" style={{ padding: '1.5rem' }}>
          <div className="flex items-center gap-2">
            <svg className="w-6 h-6" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <div>
              <h2 className="text-lg font-bold text-foreground">AI Insights</h2>
              <p className="text-xs text-muted-foreground">Summaries & Analysis</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            aria-label="Close panel"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'summary' ? 'border-b-2' : ''
            }`}
            style={{
              borderColor: activeTab === 'summary' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'summary' ? 'var(--accent)' : 'var(--muted-foreground)'
            }}
          >
            Summary
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              activeTab === 'analysis' ? 'border-b-2' : ''
            }`}
            style={{
              borderColor: activeTab === 'analysis' ? 'var(--accent)' : 'transparent',
              color: activeTab === 'analysis' ? 'var(--accent)' : 'var(--muted-foreground)'
            }}
          >
            Analysis
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ padding: '1.5rem' }}>
          {activeTab === 'summary' ? (
            <div>
              {/* Summary Type Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Summary Type
                </label>
                <select
                  value={summaryType}
                  onChange={(e) => setSummaryType(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2"
                >
                  <option value="brief">Brief Summary</option>
                  <option value="detailed">Detailed Summary</option>
                  <option value="key-points">Key Points</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateSummary}
                disabled={loading}
                className="w-full rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  backgroundColor: 'var(--accent)',
                  color: 'white'
                }}
              >
                {loading ? 'Generating...' : 'Generate Summary'}
              </button>

              {/* Summary Content */}
              <div className="space-y-4">
                {summaries.map((summary, idx) => (
                  <div key={summary.timestamp} className="rounded-xl border border-border shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
                    <div className="border-b border-border" style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--muted)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <h3 className="text-sm font-semibold text-foreground">
                            {summary.type === 'brief' ? 'Brief Summary' : summary.type === 'detailed' ? 'Detailed Summary' : 'Key Points'}
                          </h3>
                        </div>
                        <button
                          onClick={() => setSummaries(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded hover:bg-background/50 transition-colors"
                          aria-label="Remove summary"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: '1rem 1.25rem' }}>
                      <FormattedContent content={summary.content} />
                    </div>
                  </div>
                ))}
              </div>

              {loading && (
                <div className="rounded-xl border border-border" style={{ padding: '2rem 1.5rem', backgroundColor: 'var(--muted)' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground">Generating summary...</p>
                  </div>
                </div>
              )}

              {summaries.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center" style={{ backgroundColor: 'var(--muted)', opacity: 0.7 }}>
                  <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">No summary yet</p>
                  <p className="text-xs text-muted-foreground">Click the button above to generate an AI summary</p>
                </div>
              )}
            </div>
          ) : (
            <div>
              {/* Analysis Type Selector */}
              <div style={{ marginBottom: '1rem' }}>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Analysis Type
                </label>
                <select
                  value={analysisType}
                  onChange={(e) => setAnalysisType(e.target.value as any)}
                  className="w-full rounded-lg border border-border bg-background text-foreground px-3 py-2"
                >
                  <option value="key-concepts">Key Concepts</option>
                  <option value="study-questions">Study Questions</option>
                </select>
              </div>

              {/* Generate Button */}
              <button
                onClick={generateAnalysis}
                disabled={loading}
                className="w-full rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  padding: '0.75rem 1rem',
                  marginBottom: '1.5rem',
                  backgroundColor: 'var(--accent)',
                  color: 'white'
                }}
              >
                {loading ? 'Analyzing...' : 'Analyze Document'}
              </button>

              {/* Analysis Content */}
              <div className="space-y-4">
                {analyses.map((analysis, idx) => (
                  <div key={analysis.timestamp} className="rounded-xl border border-border shadow-sm" style={{ backgroundColor: 'var(--background)' }}>
                    <div className="border-b border-border" style={{ padding: '0.75rem 1rem', backgroundColor: 'var(--muted)' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <svg className="w-4 h-4" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                          </svg>
                          <h3 className="text-sm font-semibold text-foreground">
                            {analysis.type === 'key-concepts' ? 'Key Concepts' : 'Study Questions'}
                          </h3>
                        </div>
                        <button
                          onClick={() => setAnalyses(prev => prev.filter((_, i) => i !== idx))}
                          className="p-1 rounded hover:bg-background/50 transition-colors"
                          aria-label="Remove analysis"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div style={{ padding: '1rem 1.25rem' }}>
                      <FormattedContent content={analysis.content} />
                    </div>
                  </div>
                ))}
              </div>

              {loading && (
                <div className="rounded-xl border border-border" style={{ padding: '2rem 1.5rem', backgroundColor: 'var(--muted)' }}>
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '0ms' }}></div>
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '150ms' }}></div>
                      <div className="w-3 h-3 rounded-full animate-bounce" style={{ backgroundColor: 'var(--accent)', animationDelay: '300ms' }}></div>
                    </div>
                    <p className="text-sm text-muted-foreground">Analyzing document...</p>
                  </div>
                </div>
              )}

              {analyses.length === 0 && !loading && (
                <div className="rounded-xl border-2 border-dashed border-border p-8 text-center" style={{ backgroundColor: 'var(--muted)', opacity: 0.7 }}>
                  <svg className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--muted-foreground)', opacity: 0.5 }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <p className="text-sm text-muted-foreground mb-1 font-medium">No analysis yet</p>
                  <p className="text-xs text-muted-foreground">Click the button above to analyze the document</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
