"use client";

import { ThemeToggle } from "./ThemeToggle";

export function Navbar() {
  return (
    <nav className="sticky top-0 w-full backdrop-blur-md bg-background/70 border-b border-border z-50 transition-colors duration-300">
      <div className="w-full h-16 flex items-center justify-between" style={{ paddingLeft: '3rem', paddingRight: '3rem' }}>
        <div className="flex items-center gap-3">
           <div className="w-8 h-8 rounded-lg bg-foreground flex items-center justify-center shadow-sm">
              <svg className="w-5 h-5 text-background" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
           </div>
           <span className="font-bold text-lg tracking-tight text-foreground">SmartReader</span>
        </div>
        
        <div className="flex items-center gap-6">
            <a href="#" className="hidden sm:block font-medium transition-colors px-3 py-2 rounded-lg hover:bg-muted" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '1rem' }}>Home</a>
            <a href="#" className="hidden sm:block font-medium transition-colors px-3 py-2 rounded-lg hover:bg-muted" style={{ textDecoration: 'none', color: 'var(--accent)', fontSize: '1rem' }}>Library</a>
            <div className="hidden sm:block h-4 w-px bg-border"></div>
            <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
