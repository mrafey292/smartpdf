import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  PDFDocument,
  Annotation,
  Bookmark,
  ReadingProgress,
  AccessibilitySettings,
} from '@/types';

interface PDFStore {
  // Current document
  currentDocument: PDFDocument | null;
  setCurrentDocument: (doc: PDFDocument | null) => void;
  
  // Annotations
  annotations: Annotation[];
  addAnnotation: (annotation: Annotation) => void;
  updateAnnotation: (id: string, updates: Partial<Annotation>) => void;
  deleteAnnotation: (id: string) => void;
  getAnnotationsByPage: (page: number) => Annotation[];
  
  // Bookmarks
  bookmarks: Bookmark[];
  addBookmark: (bookmark: Bookmark) => void;
  deleteBookmark: (id: string) => void;
  
  // Reading progress
  readingProgress: Record<string, ReadingProgress>;
  updateReadingProgress: (documentId: string, progress: ReadingProgress) => void;
  
  // Accessibility settings
  accessibilitySettings: AccessibilitySettings;
  updateAccessibilitySettings: (settings: Partial<AccessibilitySettings>) => void;
}

const defaultAccessibilitySettings: AccessibilitySettings = {
  fontSize: 16,
  fontFamily: 'default',
  lineHeight: 1.5,
  letterSpacing: 0,
  theme: 'light',
  ttsEnabled: false,
  ttsRate: 1,
  keyboardNavigationEnabled: true,
};

export const usePDFStore = create<PDFStore>()(
  persist(
    (set, get) => ({
      currentDocument: null,
      setCurrentDocument: (doc) => set({ currentDocument: doc }),
      
      annotations: [],
      addAnnotation: (annotation) =>
        set((state) => ({ annotations: [...state.annotations, annotation] })),
      updateAnnotation: (id, updates) =>
        set((state) => ({
          annotations: state.annotations.map((a) =>
            a.id === id ? { ...a, ...updates, updatedAt: new Date() } : a
          ),
        })),
      deleteAnnotation: (id) =>
        set((state) => ({
          annotations: state.annotations.filter((a) => a.id !== id),
        })),
      getAnnotationsByPage: (page) => {
        const state = get();
        return state.annotations.filter(
          (a) => a.page === page && a.documentId === state.currentDocument?.id
        );
      },
      
      bookmarks: [],
      addBookmark: (bookmark) =>
        set((state) => ({ bookmarks: [...state.bookmarks, bookmark] })),
      deleteBookmark: (id) =>
        set((state) => ({
          bookmarks: state.bookmarks.filter((b) => b.id !== id),
        })),
      
      readingProgress: {},
      updateReadingProgress: (documentId, progress) =>
        set((state) => ({
          readingProgress: {
            ...state.readingProgress,
            [documentId]: progress,
          },
        })),
      
      accessibilitySettings: defaultAccessibilitySettings,
      updateAccessibilitySettings: (settings) =>
        set((state) => ({
          accessibilitySettings: {
            ...state.accessibilitySettings,
            ...settings,
          },
        })),
    }),
    {
      name: 'pdf-reader-storage',
    }
  )
);
