"use client";

import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up the worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

interface PDFViewerProps {
  file: File | null;
  onOpenAccessibility: () => void;
  accessibilitySettings: AccessibilitySettings;
}

export function PDFViewer({ file, onOpenAccessibility, accessibilitySettings }: PDFViewerProps) {
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber(prev => Math.max(1, prev - 1));
  }

  function goToNextPage() {
    setPageNumber(prev => Math.min(numPages, prev + 1));
  }

  function zoomIn() {
    setScale(prev => Math.min(2.0, prev + 0.1));
  }

  function zoomOut() {
    setScale(prev => Math.max(0.5, prev - 0.1));
  }

  function resetZoom() {
    setScale(1.0);
  }

  if (!file) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/30" style={{ padding: '1rem 3rem' }}>
        <div className="flex items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={goToPrevPage}
              disabled={pageNumber <= 1}
              className="rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1.5rem' }}
              aria-label="Previous page"
            >
              ←
            </button>
            <span className="text-sm font-medium text-foreground">
              Page {pageNumber} of {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={pageNumber >= numPages}
              className="rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.25rem 1.5rem' }}
              aria-label="Next page"
            >
              →
            </button>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              className="rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', padding: '0.25rem 1rem' }}
              aria-label="Zoom out"
            >
              −
            </button>
            <span className="text-sm font-medium text-foreground min-w-[60px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              className="rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', padding: '0.25rem 1rem' }}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              onClick={resetZoom}
              className="rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--muted)', color: 'var(--foreground)', padding: '0.25rem 1rem' }}
              aria-label="Reset zoom"
            >
              Reset
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-sm text-muted-foreground mr-4">
            {file.name}
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

      {/* PDF Display */}
      <div className="flex-1 overflow-auto p-8 flex justify-center"
        style={{
          fontSize: `${accessibilitySettings.fontSize}px`,
          lineHeight: accessibilitySettings.lineHeight,
          letterSpacing: `${accessibilitySettings.letterSpacing}px`,
        }}
      >
        <Document
          file={file}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center justify-center p-8">
              <div className="text-muted-foreground">Loading PDF...</div>
            </div>
          }
          error={
            <div className="flex items-center justify-center p-8">
              <div className="text-red-500">Failed to load PDF. Please try another file.</div>
            </div>
          }
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="shadow-2xl"
          />
        </Document>
      </div>
    </div>
  );
}
