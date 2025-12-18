"use client";

import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { ReaderRef } from '@/types';

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

export const PDFViewer = forwardRef<ReaderRef, PDFViewerProps>(({ file, onOpenAccessibility, accessibilitySettings }, ref) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [scale, setScale] = useState<number>(1.0);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setCurrentPage(1);
  }

  function scrollToPage(pageNum: number) {
    const pageElement = document.getElementById(`pdf-page-${pageNum}`);
    if (pageElement) {
      pageElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setCurrentPage(pageNum);
    }
  }

  useImperativeHandle(ref, () => ({
    nextPage: () => {
      if (currentPage < numPages) scrollToPage(currentPage + 1);
    },
    prevPage: () => {
      if (currentPage > 1) scrollToPage(currentPage - 1);
    },
    goToPage: (page) => {
      if (page >= 1 && page <= numPages) scrollToPage(page);
    },
    firstPage: () => scrollToPage(1),
    lastPage: () => scrollToPage(numPages),
    zoomIn: () => setScale(s => Math.min(s + 0.2, 3.0)),
    zoomOut: () => setScale(s => Math.max(s - 0.2, 0.5)),
    resetZoom: () => setScale(1.0),
    play: () => {}, // Not implemented for PDF view
    pause: () => {}, // Not implemented for PDF view
    stop: () => {}, // Not implemented for PDF view
  }), [currentPage, numPages]);

  function goToPrevPage() {
    if (currentPage > 1) {
      scrollToPage(currentPage - 1);
    }
  }

  function goToNextPage() {
    if (currentPage < numPages) {
      scrollToPage(currentPage + 1);
    }
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
          scrollToPage(numPages);
          break;
        case '+':
        case '=':
          e.preventDefault();
          zoomIn();
          break;
        case '-':
        case '_':
          e.preventDefault();
          zoomOut();
          break;
        case '0':
          e.preventDefault();
          resetZoom();
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
  }, [numPages, currentPage]);

  if (!file) {
    return null;
  }

  return (
    <div className="flex flex-col h-full bg-background">
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

                {/* Zoom */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Zoom</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Zoom in</span>
                      <div className="flex gap-2">
                        <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>+</kbd>
                        <span className="text-xs text-muted-foreground">or</span>
                        <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>=</kbd>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Zoom out</span>
                      <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>-</kbd>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Reset zoom</span>
                      <kbd className="text-xs font-semibold rounded border border-border" style={{ padding: '0.375rem 0.625rem', backgroundColor: 'var(--muted)' }}>0</kbd>
                    </div>
                  </div>
                </div>

                {/* General */}
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">General</h3>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-foreground">Switch to text view</span>
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
      <div className="flex items-center justify-between border-b border-border bg-muted/30" style={{ padding: '1rem 3rem' }}>
        <div className="flex items-center gap-4">
          {/* Page Navigation */}
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
              Page {currentPage} of {numPages}
            </span>
            <button
              onClick={goToNextPage}
              disabled={currentPage >= numPages}
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

      {/* PDF Display - All pages in scrollable view */}
      <div className="flex-1 overflow-auto p-8"
        style={{
          fontSize: `${accessibilitySettings.fontSize}px`,
          lineHeight: accessibilitySettings.lineHeight,
          letterSpacing: `${accessibilitySettings.letterSpacing}px`,
        }}
      >
        <div className="flex flex-col items-center gap-4">
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
            {Array.from(new Array(numPages), (el, index) => (
              <div 
                key={`page_${index + 1}`} 
                id={`pdf-page-${index + 1}`}
                className="mb-4 scroll-mt-4"
              >
                <Page
                  pageNumber={index + 1}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className="shadow-2xl"
                />
                <div className="text-center mt-2 text-sm text-muted-foreground">
                  Page {index + 1}
                </div>
              </div>
            ))}
          </Document>
        </div>
      </div>
    </div>
  );
});
