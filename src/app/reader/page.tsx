"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/ui/Navbar';
import { PDFViewer } from '@/components/pdf/PDFViewer';
import { TextReader } from '@/components/reader/TextReader';
import { AccessibilitySidebar } from '@/components/reader/AccessibilitySidebar';

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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>('text'); // Default to text mode for accessibility
  const router = useRouter();

  useEffect(() => {
    // Get file from localStorage (temporary solution)
    const storedFileName = localStorage.getItem('currentFileName');
    const storedFileData = localStorage.getItem('currentFileData');
    
    if (storedFileName && storedFileData) {
      // Reconstruct the file from base64
      const byteString = atob(storedFileData);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }
      const blob = new Blob([ab], { type: 'application/pdf' });
      const reconstructedFile = new File([blob], storedFileName, { type: 'application/pdf' });
      setFile(reconstructedFile);
    } else {
      // No file found, redirect to home
      router.push('/');
    }

    // Load saved settings
    const savedSettings = localStorage.getItem('accessibilitySettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, [router]);

  useEffect(() => {
    // Apply theme changes
    if (settings.theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
      document.documentElement.classList.add('dark');
    } else if (settings.theme === 'high-contrast') {
      document.documentElement.setAttribute('data-theme', 'high-contrast');
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  const handleSettingsChange = (newSettings: AccessibilitySettings) => {
    setSettings(newSettings);
    localStorage.setItem('accessibilitySettings', JSON.stringify(newSettings));
  };
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
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'text' ? 'shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: viewMode === 'text' ? 'var(--accent)' : 'var(--background)',
                    color: viewMode === 'text' ? 'white' : 'var(--foreground)',
                  }}
                >
                  📄 Text (Accessible)
                </button>
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                    viewMode === 'pdf' ? 'shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: viewMode === 'pdf' ? 'var(--accent)' : 'var(--background)',
                    color: viewMode === 'pdf' ? 'white' : 'var(--foreground)',
                  }}
                >
                  🖼️ PDF (Original)
                </button>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">
              {viewMode === 'text' 
                ? 'Text mode supports all accessibility features' 
                : 'PDF mode shows original formatting'}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        {viewMode === 'text' ? (
          <TextReader 
            file={file}
            settings={settings}
            onOpenAccessibility={() => setIsSidebarOpen(true)}
          />
        ) : (
          <PDFViewer 
            file={file} 
            onOpenAccessibility={() => setIsSidebarOpen(true)}
            accessibilitySettings={settings}
          />
        )}
      </div>
      <AccessibilitySidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        settings={settings}
        onSettingsChange={handleSettingsChange}
      />
    </div>
  );
}
