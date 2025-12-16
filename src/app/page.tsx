"use client";

import { Navbar } from "@/components/ui/Navbar";
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { storeDocument } from '@/lib/storage';

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['application/pdf', 'text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload a PDF, TXT, or DOCX file.');
      return;
    }

    // Handle PDF, DOCX, and TXT files
    if (validTypes.includes(file.type)) {
      try {
        setIsUploading(true);
        
        // Store file in IndexedDB
        await storeDocument(file);
        
        // Store filename and type in localStorage for quick access
        localStorage.setItem('currentFileName', file.name);
        localStorage.setItem('currentFileType', file.type);
        
        // Navigate to reader
        router.push('/reader');
      } catch (error) {
        console.error('Error storing document:', error);
        alert('Failed to upload document. Please try again.');
        setIsUploading(false);
      }
    } else {
      alert('Unsupported file type. Please upload a PDF, TXT, or DOCX file.');
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground transition-colors duration-300">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center p-6" role="main">
        <div className="max-w-3xl mx-auto text-center">
            {/* <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-medium">
                <span>✨ AI-Powered PDF Reader</span>
            </div> */}
            
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-foreground text-balance" style={{ marginBottom: '2rem' }}>
                Simplify your reading experience.
            </h1>
            
            <p className="md:text-xl text-muted-foreground mx-auto text-balance" style={{ marginBottom: '3rem' }}>
                Upload your PDF or DOCX documents and let our AI help you summarize, understand, and interact with your content in a fully accessible environment.
            </p>

            <div className="flex flex-col items-center gap-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.txt,.docx"
                  onChange={handleFileUpload}
                  className="hidden"
                  aria-label="File input"
                />
                <button
                    onClick={handleButtonClick}
                    disabled={isUploading}
                    className="group relative rounded-full font-medium shadow-xl hover:shadow-2xl hover:-translate-y-0.5 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    aria-label="Upload PDF"
                    style={{ backgroundColor: 'var(--accent)', color: 'white', padding: '0.875rem 2.5rem', fontSize: '1.125rem' }}
                >
                    <span className="flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        {isUploading ? 'Uploading...' : 'Upload Document'}
                    </span>
                </button>
                <p className="text-xs text-muted-foreground">
                    Supports PDF, TXT, and DOCX
                </p>
            </div>
        </div>
      </main>

      <footer className="py-8 text-center text-muted-foreground text-sm" role="contentinfo">
        <p>© 2025 SmartReader. Accessible & Minimal.</p>
      </footer>
    </div>
  );
}
