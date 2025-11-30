/**
 * Utility functions for accessibility features
 */

/**
 * Apply accessibility settings to the document
 */
export function applyAccessibilitySettings(settings: {
  fontSize?: number;
  fontFamily?: string;
  lineHeight?: number;
  letterSpacing?: number;
  theme?: 'light' | 'dark' | 'high-contrast';
  colorOverlay?: string;
}) {
  const root = document.documentElement;

  if (settings.fontSize) {
    root.style.setProperty('--base-font-size', `${settings.fontSize}px`);
  }

  if (settings.fontFamily) {
    root.style.setProperty('--font-family', settings.fontFamily);
  }

  if (settings.lineHeight) {
    root.style.setProperty('--line-height', settings.lineHeight.toString());
  }

  if (settings.letterSpacing) {
    root.style.setProperty('--letter-spacing', `${settings.letterSpacing}px`);
  }

  if (settings.theme) {
    root.setAttribute('data-theme', settings.theme);
  }

  if (settings.colorOverlay) {
    root.style.setProperty('--color-overlay', settings.colorOverlay);
  }
}

/**
 * Focus management utilities
 */
export const focusManager = {
  /**
   * Trap focus within an element
   */
  trapFocus(element: HTMLElement) {
    const focusableElements = element.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    }

    element.addEventListener('keydown', handleKeyDown);
    
    return () => {
      element.removeEventListener('keydown', handleKeyDown);
    };
  },

  /**
   * Set focus to an element and announce it to screen readers
   */
  setFocus(element: HTMLElement, announceText?: string) {
    element.focus();
    
    if (announceText) {
      this.announce(announceText);
    }
  },

  /**
   * Announce text to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  },
};

/**
 * Keyboard navigation helper
 */
export function handleArrowNavigation(
  event: KeyboardEvent,
  items: HTMLElement[],
  currentIndex: number,
  onSelect: (index: number) => void
) {
  let newIndex = currentIndex;

  switch (event.key) {
    case 'ArrowDown':
    case 'ArrowRight':
      event.preventDefault();
      newIndex = (currentIndex + 1) % items.length;
      break;
    case 'ArrowUp':
    case 'ArrowLeft':
      event.preventDefault();
      newIndex = currentIndex - 1 < 0 ? items.length - 1 : currentIndex - 1;
      break;
    case 'Home':
      event.preventDefault();
      newIndex = 0;
      break;
    case 'End':
      event.preventDefault();
      newIndex = items.length - 1;
      break;
    default:
      return;
  }

  items[newIndex]?.focus();
  onSelect(newIndex);
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
}

/**
 * Get contrast ratio between two colors
 */
export function getContrastRatio(color1: string, color2: string): number {
  // Simplified version - in production, use a proper color library
  // This is a placeholder for WCAG contrast checking
  return 0;
}
