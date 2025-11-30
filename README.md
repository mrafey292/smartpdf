# SmartReader - Accessible AI-Powered PDF Reader

A fully accessible, web-based smart PDF reader built with Next.js, React, and AI capabilities. Designed with WCAG 2.2 AA compliance for users with visual, auditory, and cognitive disabilities.

## 🌟 Features

### Accessibility Features
- ✅ Full screen reader compatibility (NVDA, JAWS, VoiceOver)
- ✅ Keyboard-only navigation with skip links
- ✅ High contrast and dark mode themes
- ✅ Text resizing, zoom, and reflow
- ✅ Text-to-speech (Web Speech API)
- ✅ Dyslexia-friendly font options
- ✅ Color overlays for reading comfort
- ✅ ARIA landmarks and semantic HTML

### AI-Powered Features
- 🤖 Document/section summarization
- 🤖 Natural language Q&A about PDFs
- 🤖 Simplify complex sentences
- 🤖 Alt text generation for images
- 🤖 OCR support (Tesseract.js)

### Annotation & Personalization
- 📝 Highlight text with custom colors
- 📝 Underline and sticky notes
- 📝 Bookmarks for pages/sections
- 📝 Reading progress tracking
- 📝 Save and resume last position
- 📝 Export/import annotations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- A Gemini API key (or OpenAI API key)

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your API keys:
   ```env
   NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key_here
   NEXT_PUBLIC_OPENAI_API_KEY=your_openai_api_key_here
   ```

   Get your API keys:
   - **Gemini**: https://makersuite.google.com/app/apikey
   - **OpenAI**: https://platform.openai.com/api-keys

3. **Run the development server:**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   # or
   bun dev
   ```

4. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
app/
├── src/
│   ├── app/                 # Next.js app router pages
│   │   ├── layout.tsx       # Root layout with accessibility setup
│   │   ├── page.tsx         # Home page
│   │   └── globals.css      # Global styles with a11y variables
│   ├── components/          # React components (to be built)
│   │   ├── pdf/            # PDF viewer components
│   │   ├── ui/             # Reusable UI components
│   │   ├── annotations/    # Annotation tools
│   │   └── accessibility/  # Accessibility controls
│   ├── lib/                # Utility libraries
│   │   ├── ai.ts           # AI service (Gemini/OpenAI)
│   │   ├── tts.ts          # Text-to-speech service
│   │   └── accessibility.ts # Accessibility utilities
│   ├── store/              # State management (Zustand)
│   │   └── pdfStore.ts     # PDF document store
│   └── types/              # TypeScript type definitions
│       └── index.ts        # Shared types
├── public/                 # Static assets
├── .env.local             # Environment variables (create this)
├── .env.example           # Example environment file
├── package.json           # Dependencies
└── next.config.ts         # Next.js config
```

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **PDF Rendering**: react-pdf (PDF.js)
- **AI Integration**: Google Gemini / OpenAI
- **OCR**: Tesseract.js
- **State Management**: Zustand
- **Accessibility Testing**: @axe-core/react
- **Text-to-Speech**: Web Speech API

## ⌨️ Keyboard Shortcuts (Planned)

- **Tab**: Navigate forward through interactive elements
- **Shift + Tab**: Navigate backward
- **Enter/Space**: Activate buttons and links
- **Esc**: Close modals and dialogs
- **Arrow Keys**: Navigate through pages and lists
- **Home/End**: Jump to first/last item

## 🎨 Accessibility Settings

Users can customize:
- Font size (12px - 24px)
- Font family (default, dyslexia-friendly, sans-serif, serif)
- Line height and letter spacing
- Color themes (light, dark, high contrast)
- Color overlays for reading comfort
- Text-to-speech rate and voice

## 🧪 Testing Accessibility

Run accessibility audits:
```bash
npm run lint
```

Use browser extensions:
- **axe DevTools**: https://www.deque.com/axe/devtools/
- **WAVE**: https://wave.webaim.org/extension/
- **Lighthouse**: Built into Chrome DevTools

## 📝 Development Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 🔒 Privacy & Security

- All API calls use HTTPS
- No personal data stored without consent
- Local storage for annotations and preferences
- Users warned before content sent to external APIs

## 🌐 WCAG Compliance

This application aims to meet WCAG 2.2 Level AA standards:
- ✅ Perceivable: Alternative text, captions, adaptable layouts
- ✅ Operable: Keyboard accessible, sufficient time, navigation
- ✅ Understandable: Readable text, predictable navigation
- ✅ Robust: Compatible with assistive technologies

## 📚 Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [WCAG Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [React Accessibility](https://react.dev/learn/accessibility)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

## 💡 Next Steps

1. ✅ Project setup complete
2. 🔄 Build PDF viewer component
3. 🔄 Implement annotation system
4. 🔄 Add accessibility controls panel
5. 🔄 Integrate AI features
6. 🔄 Add comprehensive testing

---

**Built with ♿ accessibility in mind**

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
