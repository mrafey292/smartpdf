"use client";

import { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import dynamic from 'next/dynamic';
import { TextToSpeechService } from '@/lib/tts';
import { ReaderRef } from '@/types';

// Dynamically import pdfjs to avoid SSR issues
let pdfjs: any = null;
if (typeof window !== 'undefined') {
  import('react-pdf').then((module) => {
    pdfjs = module.pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  });
}

interface AccessibilitySettings {
  fontSize: number;
  fontFamily: 'default' | 'dyslexic' | 'mono';
  lineHeight: number;
  letterSpacing: number;
  theme: 'light' | 'dark' | 'high-contrast';
  colorOverlay: 'none' | 'yellow' | 'blue' | 'green';
  ttsEnabled: boolean;
  ttsSpeed: number;
  readerMode: boolean;
}

interface TextBlock {
  text: string;
  fontSize: number;
  fontName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface StructuredContent {
  type: 'heading' | 'paragraph' | 'text';
  content: string;
  level?: number;
}

interface TextReaderProps {
  file: File | null;
  settings: AccessibilitySettings;
  onOpenAccessibility: () => void;
}

export const TextReader = forwardRef<ReaderRef, TextReaderProps>(({ file, settings, onOpenAccessibility }, ref) => {
  const [allContent, setAllContent] = useState<StructuredContent[]>([]);
  const [pageBreaks, setPageBreaks] = useState<number[]>([]); // Indices where pages start
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);
  const ttsServiceRef = useRef<TextToSpeechService | null>(null);

  // Initialize TTS service
  useEffect(() => {
    if (typeof window !== 'undefined') {
      ttsServiceRef.current = new TextToSpeechService();
    }
    return () => {
      // Cleanup: stop any ongoing speech
      if (ttsServiceRef.current) {
        ttsServiceRef.current.stop();
      }
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case 'ArrowLeft':
        case 'h':
          e.preventDefault();
          goToPrevPage();
          break;
        case 'ArrowRight':
        case 'l':
          e.preventDefault();
          goToNextPage();
          break;
        case 'Home':
          e.preventDefault();
          scrollToPage(1);
          break;
        case 'End':
          e.preventDefault();
          scrollToPage(pageBreaks.length);
          break;
        case ' ':
          e.preventDefault();
          if (settings.ttsEnabled) {
            handlePlayPause();
          }
          break;
        case 's':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            handleStop();
          }
          break;
        case 'a':
          e.preventDefault();
          onOpenAccessibility();
          break;
        case '?':
          e.preventDefault();
          setShowShortcuts(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [settings.ttsEnabled, isPlaying, isPaused, pageBreaks.length, currentPage]);

  useEffect(() => {
    if (!file) return;

    const extractStructuredText = async () => {
      setLoading(true);
      try {
        // Handle different file types
        if (file.type === 'application/pdf') {
          // Wait for pdfjs to load
          if (!pdfjs) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (!pdfjs) {
              throw new Error('PDF.js not loaded');
            }
          }

          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
          const allStructured: StructuredContent[] = [];
          const breaks: number[] = [0]; // First page starts at index 0

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            
            // Add page separator if not first page
            if (i > 1) {
              allStructured.push({
                type: 'paragraph',
                content: '───────────────────',
              });
              breaks.push(allStructured.length); // Track where this page starts
            }
            
            // Group text items by their properties
            const blocks: TextBlock[] = textContent.items.map((item: any) => ({
              text: item.str,
              fontSize: item.transform[0],
              fontName: item.fontName,
              x: item.transform[4],
              y: item.transform[5],
              width: item.width,
              height: item.height,
            }));

            // Analyze and structure the content
            const structured = analyzeStructure(blocks);
            allStructured.push(...structured);
          }

          setAllContent(allStructured);
          setPageBreaks(breaks);
        } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // Handle DOCX files
          const mammoth = await import('mammoth');
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.convertToHtml({ arrayBuffer });
          
          // Convert HTML to structured content
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = result.value;
          
          const structured: StructuredContent[] = [];
          tempDiv.childNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as HTMLElement;
              const text = element.textContent || '';
              
              if (text.trim()) {
                if (element.tagName.match(/^H[1-6]$/)) {
                  const level = parseInt(element.tagName.charAt(1));
                  structured.push({
                    type: 'heading',
                    content: text,
                    level,
                  });
                } else {
                  structured.push({
                    type: 'paragraph',
                    content: text,
                  });
                }
              }
            }
          });
          
          setAllContent(structured);
          setPageBreaks([0]); // Single page for DOCX
        } else if (file.type === 'text/plain') {
          // Handle TXT files
          const text = await file.text();
          const paragraphs = text.split(/\n\n+/);
          
          const structured: StructuredContent[] = paragraphs
            .filter(p => p.trim())
            .map(paragraph => ({
              type: 'paragraph' as const,
              content: paragraph.trim(),
            }));
          
          setAllContent(structured);
          setPageBreaks([0]); // Single page for TXT
        }

        setLoading(false);
      } catch (error) {
        console.error('Error extracting text:', error);
        setLoading(false);
      }
    };

    extractStructuredText();
  }, [file]);

  // Handle TTS when settings change
  useEffect(() => {
    if (!settings.ttsEnabled && ttsServiceRef.current) {
      ttsServiceRef.current.stop();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [settings.ttsEnabled]);

  const getAllText = (): string => {
    return allContent.map(item => item.content).join('\n\n');
  };

  const scrollToPage = (pageNum: number) => {
    const pageElement = document.getElementById(`text-page-${pageNum}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < pageBreaks.length) {
      scrollToPage(currentPage + 1);
    }
  };

  useImperativeHandle(ref, () => ({
    nextPage: goToNextPage,
    prevPage: goToPrevPage,
    goToPage: (page) => {
      if (page >= 1 && page <= pageBreaks.length) scrollToPage(page);
    },
    firstPage: () => scrollToPage(1),
    lastPage: () => scrollToPage(pageBreaks.length),
  }), [currentPage, pageBreaks]);

  const handlePlayPause = async () => {
    if (!ttsServiceRef.current || !settings.ttsEnabled) return;

    if (isPlaying && !isPaused) {
      // Pause
      ttsServiceRef.current.pause();
      setIsPaused(true);
    } else if (isPaused) {
      // Resume
      ttsServiceRef.current.resume();
      setIsPaused(false);
    } else {
      // Check if TTS is supported first
      if (!ttsServiceRef.current.isSupported()) {
        alert('Text-to-speech is not supported in your browser. Please try Chrome, Edge, or Safari.');
        return;
      }

      // Start playing
      const documentText = getAllText();
      console.log('Text to read (first 200 chars):', documentText.substring(0, 200));
      console.log('Total text length:', documentText.length);
      
      if (!documentText || documentText.trim().length === 0) {
        alert('No text available to read on this page.');
        return;
      }
      
      setIsPlaying(true);
      setIsPaused(false);
      
      try {
        await ttsServiceRef.current.speak(documentText, {
          rate: settings.ttsSpeed,
          onEnd: () => {
            console.log('Reading completed');
            setIsPlaying(false);
            setIsPaused(false);
          },
          onError: (error) => {
            console.error('TTS error:', error);
            setIsPlaying(false);
            setIsPaused(false);
            alert(error.message);
          }
        });
      } catch (error) {
        console.error('Unexpected TTS error:', error);
        setIsPlaying(false);
        setIsPaused(false);
        alert('An unexpected error occurred while trying to use text-to-speech.');
      }
    }
  };

  const handleStop = () => {
    if (ttsServiceRef.current) {
      ttsServiceRef.current.stop();
      setIsPlaying(false);
      setIsPaused(false);
    }
  };

  const analyzeStructure = (blocks: TextBlock[]): StructuredContent[] => {
    if (blocks.length === 0) return [];

    // Calculate average font size to detect headings
    const fontSizes = blocks.map(b => b.fontSize).filter(s => s > 0);
    const avgFontSize = fontSizes.reduce((a, b) => a + b, 0) / fontSizes.length;
    
    const structured: StructuredContent[] = [];
    let currentParagraph = '';
    let lastY = blocks[0]?.y || 0;
    const lineThreshold = avgFontSize * 1.5; // If Y difference is larger, it's a new paragraph

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const text = block.text.trim();
      
      if (!text) continue;

      // Detect headings based on font size
      const isHeading = block.fontSize > avgFontSize * 1.3;
      const yDiff = Math.abs(block.y - lastY);
      const isNewParagraph = yDiff > lineThreshold;

      if (isHeading) {
        // Save previous paragraph if exists
        if (currentParagraph) {
          structured.push({
            type: 'paragraph',
            content: currentParagraph.trim()
          });
          currentParagraph = '';
        }

        // Determine heading level based on font size
        let level = 1;
        if (block.fontSize > avgFontSize * 2) level = 1;
        else if (block.fontSize > avgFontSize * 1.6) level = 2;
        else level = 3;

        structured.push({
          type: 'heading',
          content: text,
          level
        });
      } else if (isNewParagraph && currentParagraph) {
        // Start new paragraph
        structured.push({
          type: 'paragraph',
          content: currentParagraph.trim()
        });
        currentParagraph = text + ' ';
      } else {
        // Continue current paragraph
        currentParagraph += text + ' ';
      }

      lastY = block.y;
    }

    // Add remaining paragraph
    if (currentParagraph) {
      structured.push({
        type: 'paragraph',
        content: currentParagraph.trim()
      });
    }

    return structured;
  };

  const getFontFamily = () => {
    switch (settings.fontFamily) {
      case 'dyslexic':
        return 'OpenDyslexic, Comic Sans MS, sans-serif';
      case 'mono':
        return 'Consolas, Monaco, monospace';
      default:
        return '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  };

  const getOverlayColor = () => {
    switch (settings.colorOverlay) {
      case 'yellow':
        return 'rgba(255, 255, 150, 0.15)';
      case 'blue':
        return 'rgba(173, 216, 230, 0.15)';
      case 'green':
        return 'rgba(144, 238, 144, 0.15)';
      default:
        return 'transparent';
    }
  };

  const getPageNumber = (index: number): number => {
    for (let i = pageBreaks.length - 1; i >= 0; i--) {
      if (index >= pageBreaks[i]) {
        return i + 1;
      }
    }
    return 1;
  };

  const renderContent = (item: StructuredContent, index: number) => {
    const pageNum = getPageNumber(index);
    const isPageStart = pageBreaks.includes(index);
    
    const baseStyle: React.CSSProperties = {
      fontFamily: getFontFamily(),
      lineHeight: settings.lineHeight,
      letterSpacing: `${settings.letterSpacing}px`,
      color: 'var(--foreground)',
      marginBottom: '1rem',
    };

    if (item.type === 'heading') {
      const headingSize = settings.fontSize * (item.level === 1 ? 2 : item.level === 2 ? 1.5 : 1.25);
      const level = item.level || 1;
      
      const headingStyle: React.CSSProperties = {
        ...baseStyle,
        fontSize: `${headingSize}px`,
        fontWeight: 'bold',
        marginTop: level === 1 ? '2rem' : '1.5rem',
        marginBottom: '1rem',
      };

      const HeadingTag = `h${level}` as 'h1' | 'h2' | 'h3' | 'h4';
      
      return (
        <div key={index} id={isPageStart ? `text-page-${pageNum}` : undefined} className={isPageStart ? 'scroll-mt-4' : ''}>
          <HeadingTag style={headingStyle}>{item.content}</HeadingTag>
        </div>
      );
    }

    return (
      <div key={index} id={isPageStart ? `text-page-${pageNum}` : undefined} className={isPageStart ? 'scroll-mt-4' : ''}>
        <p
          style={{
            ...baseStyle,
            fontSize: `${settings.fontSize}px`,
            textAlign: 'justify',
            marginBottom: '1.5rem',
          }}
        >
          {item.content}
        </p>
      </div>
    );
  };

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No document loaded</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg font-medium text-foreground mb-2">Extracting text...</div>
          <div className="text-sm text-muted-foreground">Analyzing document structure</div>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No document loaded</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="text-lg font-medium text-foreground mb-2">Extracting text...</div>
          <div className="text-sm text-muted-foreground">Preparing accessible view</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setShowShortcuts(false)}
            aria-hidden="true"
          />
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background border border-border rounded-xl shadow-2xl z-50"
            style={{ width: '32rem', maxHeight: '80vh', overflow: 'auto' }}
          >
            <div className="border-b border-border" style={{ padding: '1.25rem 1.5rem' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                  <h2 className="text-lg font-bold text-foreground">Keyboard Shortcuts</h2>
                </div>
                <button
                  onClick={() => setShowShortcuts(false)}
                  className="p-1.5 rounded-lg hover:bg-muted transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div style={{ padding: '1.5rem' }}>
              <div className="space-y-4">
                {/* Navigation */}
                {pageBreaks.length > 1 && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Navigation</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Previous page</span>
                        <div className="flex gap-2">
                          <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>←</kbd>
                          <span className="text-xs text-muted-foreground">or</span>
                          <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>H</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Next page</span>
                        <div className="flex gap-2">
                          <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>→</kbd>
                          <span className="text-xs text-muted-foreground">or</span>
                          <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>L</kbd>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">First page</span>
                        <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>Home</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Last page</span>
                        <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>End</kbd>
                      </div>
                    </div>
                  </div>
                )}

                {/* Text-to-Speech */}
                {settings.ttsEnabled && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-3">Text-to-Speech</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Play/Pause reading</span>
                        <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>Space</kbd>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-foreground">Stop reading</span>
                        <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>Ctrl+S</kbd>
                      </div>
                    </div>
                  </div>
                )}

                {/* General */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">General</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Switch to PDF view</span>
                      <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>V</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Open accessibility settings</span>
                      <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>A</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Toggle shortcuts</span>
                      <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>?</kbd>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toolbar */}
      <div className="border-b border-border" style={{ padding: '1rem 3rem', backgroundColor: 'var(--muted)/30' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Page Navigation - Only show for PDFs with multiple pages */}
            {pageBreaks.length > 1 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={goToPrevPage}
                  disabled={currentPage <= 1}
                  className="rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1.5rem' }}
                  aria-label="Previous page"
                >
                  ←
                </button>
                <span className="text-sm font-medium text-foreground">
                  Page {currentPage} of {pageBreaks.length}
                </span>
                <button
                  onClick={goToNextPage}
                  disabled={currentPage >= pageBreaks.length}
                  className="rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1.5rem' }}
                  aria-label="Next page"
                >
                  →
                </button>
              </div>
            )}

            {pageBreaks.length === 1 && (
              <div className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
                ✓ Accessible Text Mode
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {/* TTS Controls */}
            {settings.ttsEnabled && (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePlayPause}
                  className="rounded-lg font-medium transition-all hover:shadow-md flex items-center gap-2"
                  style={{ 
                    backgroundColor: 'var(--accent)', 
                    color: 'white', 
                    padding: '0.5rem 1rem' 
                  }}
                  aria-label={isPlaying && !isPaused ? 'Pause reading' : 'Play reading'}
                >
                  {isPlaying && !isPaused ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                      </svg>
                      Pause
                    </>
                  ) : isPaused ? (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Resume
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Read Aloud
                    </>
                  )}
                </button>
                {isPlaying && (
                  <button
                    onClick={handleStop}
                    className="rounded-lg font-medium transition-all hover:shadow-md flex items-center gap-2"
                    style={{ 
                      backgroundColor: 'var(--muted)', 
                      color: 'var(--foreground)', 
                      padding: '0.5rem 1rem',
                      border: '1px solid var(--border)'
                    }}
                    aria-label="Stop reading"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" />
                    </svg>
                    Stop
                  </button>
                )}
              </div>
            )}
            
            {/* Accessibility Button */}
            <button
              onClick={onOpenAccessibility}
              className="rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1rem' }}
              aria-label="Open accessibility settings"
            >
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
                Accessibility
              </span>
            </button>

            {/* Keyboard Shortcuts Button */}
            <button
              onClick={() => setShowShortcuts(true)}
              className="rounded-lg font-medium transition-colors hover:bg-muted"
              style={{ padding: '0.25rem 0.75rem', border: '1px solid var(--border)' }}
              aria-label="Show keyboard shortcuts"
              title="Keyboard shortcuts"
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm">?</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Text Content */}
      <div 
        className="flex-1 overflow-y-auto"
        style={{
          backgroundColor: getOverlayColor(),
        }}
      >
        <div 
          className="max-w-4xl mx-auto"
          style={{
            padding: '3rem 2rem',
          }}
        >
          {allContent.map((item, index) => renderContent(item, index))}
        </div>
      </div>
    </div>
  );
});
