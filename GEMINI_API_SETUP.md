# Gemini API Integration - Setup Guide

## 🚀 Setup Instructions

### 1. Get Your Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Environment Variables

Add your API key to `.env.local`:

```env
GEMINI_API_KEY=your_actual_api_key_here
```

⚠️ **Important**: Never commit your `.env.local` file to version control!

### 3. Test the Setup

Start the development server:

```bash
npm run dev
```

The Gemini integration is now ready to use!

---

## 📚 API Endpoints

### 1. Chat with Document

**Endpoint**: `POST /api/chat`

Ask questions about your PDF document with conversation context.

**Request Body**:
```json
{
  "documentText": "Your extracted PDF text content...",
  "question": "What is the main topic of this document?",
  "conversationHistory": [
    {
      "role": "user",
      "text": "Previous question",
      "timestamp": 1234567890
    },
    {
      "role": "assistant",
      "text": "Previous answer",
      "timestamp": 1234567891
    }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "answer": "The main topic is...",
  "timestamp": 1234567892
}
```

**Example Usage**:
```typescript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentText: extractedText,
    question: "Explain the key findings",
    conversationHistory: chatHistory
  })
});

const data = await response.json();
console.log(data.answer);
```

---

### 2. Summarize Document

**Endpoint**: `POST /api/summarize`

Generate summaries of your document with optional simplification for accessibility.

**Request Body**:
```json
{
  "documentText": "Your extracted PDF text content...",
  "summaryType": "brief",
  "simplify": true,
  "readingLevel": "high-school"
}
```

**Parameters**:
- `summaryType`: `"brief"` | `"detailed"` | `"key-points"`
- `simplify`: `boolean` (optional, default: false)
- `readingLevel`: `"elementary"` | `"middle-school"` | `"high-school"` (optional)

**Response**:
```json
{
  "success": true,
  "summary": "This document discusses...",
  "summaryType": "brief",
  "simplified": true,
  "readingLevel": "high-school",
  "timestamp": 1234567890
}
```

**Example Usage**:
```typescript
const response = await fetch('/api/summarize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentText: extractedText,
    summaryType: 'key-points',
    simplify: true,
    readingLevel: 'middle-school'
  })
});

const data = await response.json();
console.log(data.summary);
```

---

### 3. Analyze Document

**Endpoint**: `POST /api/analyze-document`

Extract key concepts or generate study questions from your document.

**Request Body**:
```json
{
  "documentText": "Your extracted PDF text content...",
  "analysisType": "key-concepts"
}
```

**Parameters**:
- `analysisType`: `"key-concepts"` | `"study-questions"`
- `questionCount`: `number` (1-20, only for `"study-questions"`)

**Response**:
```json
{
  "success": true,
  "analysisType": "key-concepts",
  "result": "1. Main Concept\n2. Secondary Concept...",
  "timestamp": 1234567890
}
```

**Example Usage**:
```typescript
// Extract key concepts
const conceptsResponse = await fetch('/api/analyze-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentText: extractedText,
    analysisType: 'key-concepts'
  })
});

// Generate study questions
const questionsResponse = await fetch('/api/analyze-document', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    documentText: extractedText,
    analysisType: 'study-questions',
    questionCount: 10
  })
});
```

---

## 🛠️ Utility Functions

The `src/lib/gemini.ts` file provides utility functions you can use in your components:

### Available Functions

```typescript
// Chat with document
chatWithDocument(documentText, question, conversationHistory)

// Summarization
summarizeDocument(documentText, summaryType)

// Extract key concepts
extractKeyConcepts(documentText)

// Generate study questions
generateStudyQuestions(documentText, count)

// Simplify text for accessibility
simplifyText(text, readingLevel)

// Explain accessibility features
explainAccessibility(documentText, feature)
```

---

## 💡 Best Practices

1. **Text Length Limits**: Keep document text under 100,000 characters per request
2. **Error Handling**: Always handle API errors gracefully
3. **Loading States**: Show loading indicators during API calls
4. **Caching**: Consider caching responses for frequently asked questions
5. **Rate Limiting**: Be mindful of API rate limits

---

## 🔍 Example: Building a Chat Component

```typescript
'use client';

import { useState } from 'react';
import { ChatMessage } from '@/types';

export function DocumentChat({ documentText }: { documentText: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentText,
          question: input,
          conversationHistory: messages
        })
      });

      const data = await response.json();

      if (data.success) {
        const assistantMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          text: data.answer,
          timestamp: data.timestamp
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error('Chat error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="messages">
        {messages.map(msg => (
          <div key={msg.id} className={msg.role}>
            {msg.text}
          </div>
        ))}
      </div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
        disabled={loading}
      />
      <button onClick={sendMessage} disabled={loading}>
        {loading ? 'Sending...' : 'Send'}
      </button>
    </div>
  );
}
```

---

## 📊 Token Usage & Costs

- Gemini 1.5 Flash: Fast and cost-effective, good for chat
- Gemini 1.5 Pro: Higher quality, better for complex analysis

Monitor your usage at [Google AI Studio](https://makersuite.google.com/)

---

## 🐛 Troubleshooting

### "GEMINI_API_KEY is not set"
- Check that `.env.local` exists in the root directory
- Verify the API key is correctly formatted
- Restart the development server after adding the key

### API Rate Limits
- Implement request queuing
- Add retry logic with exponential backoff
- Consider caching frequent requests

### Large Documents
- Split documents into smaller chunks
- Summarize sections before analyzing
- Use pagination for long conversations

---

## 🔐 Security Notes

- API keys are server-side only (not exposed to client)
- Environment variables are not committed to git
- Validate and sanitize all user inputs
- Implement rate limiting for production

---

## 📝 Next Steps

1. Add your Gemini API key to `.env.local`
2. Test the API endpoints
3. Build UI components to integrate with the APIs
4. Implement error handling and loading states
5. Add caching for better performance

Happy coding! 🚀
