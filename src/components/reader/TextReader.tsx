"use client";

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';

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

export function TextReader({ file, settings, onOpenAccessibility }: TextReaderProps) {
  const [pages, setPages] = useState<StructuredContent[][]>([]);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!file || !pdfjs) return;

    const extractStructuredText = async () => {
      setLoading(true);
      try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
        const allPages: StructuredContent[][] = [];

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          
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
          allPages.push(structured);
        }

        setPages(allPages);
        setLoading(false);
      } catch (error) {
        console.error('Error extracting text:', error);
        setLoading(false);
      }
    };

    extractStructuredText();
  }, [file]);

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

  const renderContent = (item: StructuredContent, index: number) => {
    const baseStyle: React.CSSProperties = {
      fontFamily: getFontFamily(),
      lineHeight: settings.lineHeight,
      letterSpacing: `${settings.letterSpacing}px`,
      color: 'var(--foreground)',
      marginBottom: '1rem',
    };

    if (item.type === 'heading') {
      const headingSize = settings.fontSize * (item.level === 1 ? 2 : item.level === 2 ? 1.5 : 1.25);
      const HeadingTag = `h${item.level}` as keyof JSX.IntrinsicElements;
      
      return (
        <HeadingTag
          key={index}
          style={{
            ...baseStyle,
            fontSize: `${headingSize}px`,
            fontWeight: 'bold',
            marginTop: item.level === 1 ? '2rem' : '1.5rem',
            marginBottom: '1rem',
          }}
        >
          {item.content}
        </HeadingTag>
      );
    }

    return (
      <p
        key={index}
        style={{
          ...baseStyle,
          fontSize: `${settings.fontSize}px`,
          textAlign: 'justify',
          marginBottom: '1.5rem',
        }}
      >
        {item.content}
      </p>
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

  const currentPageContent = pages[currentPage] || [];

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
      {/* Navigation */}
      <div className="border-b border-border" style={{ padding: '1rem 3rem', backgroundColor: 'var(--muted)/30' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
              disabled={currentPage === 0}
              className="rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1.5rem' }}
            >
              ←
            </button>
            <span className="text-sm font-medium text-foreground">
              Page {currentPage + 1} of {pages.length}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(pages.length - 1, currentPage + 1))}
              disabled={currentPage === pages.length - 1}
              className="rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1.5rem' }}
            >
              →
            </button>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              ✓ Accessible Text Mode
            </div>
            
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
          {currentPageContent.map((item, index) => renderContent(item, index))}
        </div>
      </div>
    </div>
  );
}
