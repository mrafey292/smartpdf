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

// Chat Types
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface ChatSession {
  id: string;
  documentId: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

// API Response Types
export interface ChatResponse {
  success: boolean;
  answer?: string;
  timestamp: number;
  error?: string;
  details?: string;
}

export interface SummaryResponse {
  success: boolean;
  summary?: string;
  summaryType: 'brief' | 'detailed' | 'key-points';
  simplified: boolean;
  readingLevel?: 'elementary' | 'middle-school' | 'high-school';
  timestamp: number;
  error?: string;
  details?: string;
}

export interface AnalysisResponse {
  success: boolean;
  analysisType: 'key-concepts' | 'study-questions';
  result?: string;
  timestamp: number;
  error?: string;
  details?: string;
}

// Accessibility Settings
export interface AccessibilitySettings {
  fontSize: number;
  fontFamily: 'default' | 'dyslexia-friendly' | 'sans-serif' | 'serif';
  lineHeight: number;
  letterSpacing: number;
  theme?: 'light' | 'dark' | 'high-contrast';
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

export interface ReaderRef {
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  firstPage: () => void;
  lastPage: () => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  play: () => void;
  pause: () => void;
  stop: () => void;
}
