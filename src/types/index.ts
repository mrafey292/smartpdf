// PDF Document Types
export interface PDFDocument {
  id: string;
  name: string;
  url: string;
  totalPages: number;
  currentPage: number;
  uploadedAt: Date;
}

// Annotation Types
export interface Annotation {
  id: string;
  documentId: string;
  page: number;
  type: 'highlight' | 'underline' | 'note';
  content: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Bookmark Types
export interface Bookmark {
  id: string;
  documentId: string;
  page: number;
  title: string;
  createdAt: Date;
}

// Reading Progress
export interface ReadingProgress {
  documentId: string;
  currentPage: number;
  totalPages: number;
  lastReadAt: Date;
  percentage: number;
}

// AI Features
export interface AISummary {
  id: string;
  documentId: string;
  page?: number;
  content: string;
  type: 'document' | 'section' | 'page';
  createdAt: Date;
}

export interface AIQuestion {
  id: string;
  documentId: string;
  question: string;
  answer: string;
  createdAt: Date;
}

// Accessibility Settings
export interface AccessibilitySettings {
  fontSize: number;
  fontFamily: 'default' | 'dyslexia-friendly' | 'sans-serif' | 'serif';
  lineHeight: number;
  letterSpacing: number;
  theme: 'light' | 'dark' | 'high-contrast';
  colorOverlay?: string;
  ttsEnabled: boolean;
  ttsRate: number;
  ttsVoice?: string;
  keyboardNavigationEnabled: boolean;
}

// User Preferences
export interface UserPreferences {
  accessibility: AccessibilitySettings;
  defaultView: 'single' | 'double' | 'scroll';
  autoSave: boolean;
}
