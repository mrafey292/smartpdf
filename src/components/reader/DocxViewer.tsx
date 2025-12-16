"use client";

import { useState, useEffect } from 'react';
import mammoth from 'mammoth';

interface DocxViewerProps {
  file: File;
}

export function DocxViewer({ file }: DocxViewerProps) {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadDocx = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        
        setHtmlContent(result.value);
        
        // Log any messages or warnings
        if (result.messages.length > 0) {
          console.log('DOCX conversion messages:', result.messages);
        }
      } catch (err) {
        console.error('Error loading DOCX:', err);
        setError('Failed to load DOCX file');
      } finally {
        setIsLoading(false);
      }
    };

    loadDocx();
  }, [file]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center text-destructive">
          <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="docx-viewer h-full overflow-auto"
      style={{
        padding: '2rem',
        backgroundColor: 'var(--background)',
      }}
    >
      <div 
        className="max-w-4xl mx-auto shadow-lg rounded-lg"
        style={{
          padding: '3rem',
          minHeight: '100%',
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        <div 
          className="docx-content prose prose-sm sm:prose lg:prose-lg dark:prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: htmlContent }}
          style={{
            color: 'var(--foreground)',
          }}
        />
      </div>
      
      <style jsx global>{`
        .docx-content {
          line-height: 1.8;
        }
        
        .docx-content h1 {
          font-size: 2em;
          font-weight: bold;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        
        .docx-content h2 {
          font-size: 1.5em;
          font-weight: bold;
          margin-top: 0.8em;
          margin-bottom: 0.4em;
        }
        
        .docx-content h3 {
          font-size: 1.25em;
          font-weight: bold;
          margin-top: 0.6em;
          margin-bottom: 0.3em;
        }
        
        .docx-content p {
          margin-bottom: 1em;
        }
        
        .docx-content ul, .docx-content ol {
          margin-left: 2em;
          margin-bottom: 1em;
        }
        
        .docx-content li {
          margin-bottom: 0.5em;
        }
        
        .docx-content table {
          border-collapse: collapse;
          width: 100%;
          margin-bottom: 1em;
        }
        
        .docx-content table td, .docx-content table th {
          border: 1px solid var(--border);
          padding: 0.5em;
        }
        
        .docx-content table th {
          background-color: var(--muted);
          font-weight: bold;
        }
        
        .docx-content strong, .docx-content b {
          font-weight: bold;
        }
        
        .docx-content em, .docx-content i {
          font-style: italic;
        }
        
        .docx-content img {
          max-width: 100%;
          height: auto;
          margin: 1em 0;
        }
      `}</style>
    </div>
  );
}
