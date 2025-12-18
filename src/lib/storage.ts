// IndexedDB utilities for storing large files like PDFs

const DB_NAME = 'SmartReaderDB';
const STORE_NAME = 'documents';
const DB_VERSION = 1;

interface StoredDocument {
  id: string;
  name: string;
  data: ArrayBuffer;
  type: string;
  uploadedAt: Date;
  extractedText?: string;
}

/**
 * Open or create the IndexedDB database
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Store a document in IndexedDB
 */
export async function storeDocument(file: File): Promise<string> {
  const db = await openDB();
  const arrayBuffer = await file.arrayBuffer();
  
  const doc: StoredDocument = {
    id: 'current', // Using a fixed ID to always store the current document
    name: file.name,
    data: arrayBuffer,
    type: file.type,
    uploadedAt: new Date(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(doc);

    request.onsuccess = () => resolve(doc.id);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Retrieve the current document from IndexedDB
 */
export async function getCurrentDocument(): Promise<StoredDocument | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current');

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Update the extracted text for the current document
 */
export async function updateExtractedText(text: string): Promise<void> {
  const db = await openDB();
  const doc = await getCurrentDocument();
  
  if (!doc) return;

  doc.extractedText = text;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(doc);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Delete the current document from IndexedDB
 */
export async function deleteCurrentDocument(): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete('current');

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    
    transaction.oncomplete = () => db.close();
  });
}

/**
 * Get document as base64 (for compatibility with existing code)
 */
export async function getCurrentDocumentAsBase64(): Promise<string | null> {
  const doc = await getCurrentDocument();
  if (!doc) return null;

  const bytes = new Uint8Array(doc.data);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  return btoa(binary);
}
