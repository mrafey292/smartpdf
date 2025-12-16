"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { Navbar } from '@/components/ui/Navbar';
import { TextReader } from '@/components/reader/TextReader';
import { AccessibilitySidebar } from '@/components/reader/AccessibilitySidebar';
import { ChatPanel } from '@/components/reader/ChatPanel';
import { SummaryPanel } from '@/components/reader/SummaryPanel';
import { getCurrentDocument } from '@/lib/storage';

// Dynamically import PDFViewer to avoid SSR issues with react-pdf
const PDFViewer = dynamic(() => import('@/components/pdf/PDFViewer').then(mod => ({ default: mod.PDFViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading PDF viewer...</div>
});

// Dynamically import DocxViewer
const DocxViewer = dynamic(() => import('@/components/reader/DocxViewer').then(mod => ({ default: mod.DocxViewer })), {
  ssr: false,
  loading: () => <div className="flex items-center justify-center h-full">Loading DOCX viewer...</div>
});

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

const defaultSettings: AccessibilitySettings = {
  fontSize: 16,
  fontFamily: 'default',
  lineHeight: 1.6,
  letterSpacing: 0,
  theme: 'light',
  colorOverlay: 'none',
  ttsEnabled: false,
  ttsSpeed: 1,
  readerMode: false,
};

export default function ReaderPage() {
  const [file, setFile] = useState<File | null>(null);
  const [documentText, setDocumentText] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSummaryOpen, setIsSummaryOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [viewMode, setViewMode] = useState<'pdf' | 'docx' | 'text'>('text'); // Default to text mode for accessibility
  const [isDarkMode, setIsDarkMode] = useState(false);
  const router = useRouter();

  // Extract text from PDF for AI features
  const extractTextFromPDF = async (pdfFile: File) => {
    try {
      // Dynamically import pdfjs
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      let fullText = '';
      
      // Extract text from all pages
      for (let i = 1; i <= Math.min(pdf.numPages, 50); i++) { // Limit to first 50 pages for performance
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n\n';
      }
      
      setDocumentText(fullText);
    } catch (error) {
      console.error('Error extracting text:', error);
      setDocumentText('Failed to extract text from PDF');
    }
  };

  // Extract text from DOCX for AI features
  const extractTextFromDOCX = async (docxFile: File) => {
    try {
      // Dynamically import mammoth
      const mammoth = await import('mammoth');
      
      const arrayBuffer = await docxFile.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      setDocumentText(result.value);
    } catch (error) {
      console.error('Error extracting text from DOCX:', error);
      setDocumentText('Failed to extract text from DOCX');
    }
  };

  // Extract text from TXT
  const extractTextFromTXT = async (txtFile: File) => {
    try {
      const text = await txtFile.text();
      setDocumentText(text);
    } catch (error) {
      console.error('Error reading text file:', error);
      setDocumentText('Failed to read text file');
    }
  };

  // Extract text based on file type
  const extractTextFromDocument = async (file: File) => {
    if (file.type === 'application/pdf') {
      await extractTextFromPDF(file);
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      await extractTextFromDOCX(file);
    } else if (file.type === 'text/plain') {
      await extractTextFromTXT(file);
    } else {
      setDocumentText('Unsupported file type');
    }
  };

  useEffect(() => {
    // Get file from IndexedDB
    const loadDocument = async () => {
      try {
        const storedDoc = await getCurrentDocument();
        
        if (storedDoc) {
          // Reconstruct the file from ArrayBuffer
          const blob = new Blob([storedDoc.data], { type: storedDoc.type });
          const reconstructedFile = new File([blob], storedDoc.name, { type: storedDoc.type });
          setFile(reconstructedFile);
          
          // Extract text for AI features based on file type
          await extractTextFromDocument(reconstructedFile);
          
          // Set view mode based on file type
          // Only PDFs support PDF view mode, others default to text
          if (storedDoc.type === 'application/pdf') {
            setViewMode('text'); // Start with text for accessibility
          } else {
            setViewMode('text'); // DOCX and TXT only have text view
          }
        } else {
          // No file found, redirect to home
          router.push('/');
        }
      } catch (error) {
        console.error('Error loading document:', error);
        router.push('/');
      }
    };

    loadDocument();

    // Load saved settings
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Check current theme
    setIsDarkMode(document.documentElement.classList.contains('dark'));

    // Watch for theme changes
    const observer = new MutationObserver(() => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme']
    });

    return () => observer.disconnect();
  }, [router]);

  const handleSettingsChange = (newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    localStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
  };

  // Keyboard shortcut for switching view mode (only for PDFs)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Toggle view mode for PDF and DOCX files
      if (e.key === 'v') {
        e.preventDefault();
        if (file?.type === 'application/pdf') {
          setViewMode(prev => prev === 'text' ? 'pdf' : 'text');
        } else if (file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          setViewMode(prev => prev === 'text' ? 'docx' : 'text');
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [file]);

  return (
    <div className="h-screen flex flex-col bg-background text-foreground">
      {!settings.readerMode && <Navbar />}
      
      {/* View Mode Toggle */}
      {!settings.readerMode && (
        <div className="border-b border-border" style={{ padding: '0.75rem 3rem', backgroundColor: 'var(--muted)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">View Mode:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('text')}
                  className={`py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    viewMode === 'text' ? 'shadow-md' : ''
                  }`}
                  style={{
                    paddingLeft: '1rem',
                    paddingRight: '1rem',
                    backgroundColor: viewMode === 'text' ? 'var(--accent)' : 'var(--background)',
                    color: viewMode === 'text' ? 'white' : 'var(--foreground)',
                  }}
                >
                  <img 
                    src="/icons/text.png" 
                    alt="" 
                    className="w-4 h-4" 
                    style={{ filter: isDarkMode ? 'brightness(0) invert(1)' : 'none' }}
                  />
                  Text
                </button>
                {/* Show PDF view for PDF files */}
                {file?.type === 'application/pdf' && (
                  <button
                    onClick={() => setViewMode('pdf')}
                    className={`py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      viewMode === 'pdf' ? 'shadow-md' : ''
                    }`}
                    style={{
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      backgroundColor: viewMode === 'pdf' ? 'var(--accent)' : 'var(--background)',
                      color: viewMode === 'pdf' ? 'white' : 'var(--foreground)',
                    }}
                  >
                    <img 
                      src="/icons/pdf.png" 
                      alt="" 
                      className="w-4 h-4" 
                      style={{ filter: isDarkMode ? 'brightness(0) invert(1)' : 'none' }}
                    />
                    PDF
                  </button>
                )}
                {/* Show DOCX view for DOCX files */}
                {file?.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' && (
                  <button
                    onClick={() => setViewMode('docx')}
                    className={`py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                      viewMode === 'docx' ? 'shadow-md' : ''
                    }`}
                    style={{
                      paddingLeft: '1rem',
                      paddingRight: '1rem',
                      backgroundColor: viewMode === 'docx' ? 'var(--accent)' : 'var(--background)',
                      color: viewMode === 'docx' ? 'white' : 'var(--foreground)',
                    }}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    DOCX
                  </button>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsChatOpen(true)}
                className="rounded-lg text-sm font-medium transition-all flex items-center gap-2 hover:shadow-md"
                style={{
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingTop: '0.375rem',
                  paddingBottom: '0.375rem',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
                AI Chat
              </button>
              <button
                onClick={() => setIsSummaryOpen(true)}
                className="rounded-lg text-sm font-medium transition-all flex items-center gap-2 hover:shadow-md"
                style={{
                  paddingLeft: '1rem',
                  paddingRight: '1rem',
                  paddingTop: '0.375rem',
                  paddingBottom: '0.375rem',
                  backgroundColor: 'var(--background)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                AI Insights
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {viewMode === 'text' ? (
          <TextReader 
            file={file}
            settings={settings}
            onOpenAccessibility={() => setIsSidebarOpen(prev => !prev)}
          />
        ) : viewMode === 'pdf' ? (
          <PDFViewer 
            file={file} 
            onOpenAccessibility={() => setIsSidebarOpen(prev => !prev)}
            accessibilitySettings={settings}
          />
        ) : viewMode === 'docx' ? (
          <DocxViewer file={file!} />
        ) : null}
      </div>
      <AccessibilitySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
      <ChatPanel
        documentText={documentText || 'Loading document...'}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
      <SummaryPanel
        documentText={documentText || 'Loading document...'}
        isOpen={isSummaryOpen}
        onClose={() => setIsSummaryOpen(false)}
      />
    </div>
  );
}
