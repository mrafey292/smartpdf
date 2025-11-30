"use client";

import { useState } from 'react';

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

interface AccessibilitySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AccessibilitySettings;
  onSettingsChange: (settings: AccessibilitySettings) => void;
}

export function AccessibilitySidebar({ isOpen, onClose, settings, onSettingsChange }: AccessibilitySidebarProps) {
  const updateSetting = <K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K]
  ) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div 
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Sidebar */}
      <div 
        className="fixed right-0 top-0 h-full w-96 bg-background border-l border-border z-50 overflow-y-auto shadow-2xl"
        role="dialog"
        aria-label="Accessibility Settings"
      >
        <div style={{ padding: '2rem' }}>
          {/* Header */}
          <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
            <div>
              <h2 className="text-2xl font-bold text-foreground" style={{ marginBottom: '0.25rem' }}>Accessibility</h2>
              <p className="text-sm text-muted-foreground">Customize your reading experience</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Close settings"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Visual Settings */}
          <div style={{ marginBottom: '2rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <h3 className="text-lg font-semibold text-foreground">Visual Settings</h3>
            </div>
            
            {/* Font Size */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                <label className="text-sm font-medium text-foreground">Font Size</label>
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{settings.fontSize}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="32"
                value={settings.fontSize}
                onChange={(e) => updateSetting('fontSize', parseInt(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((settings.fontSize - 12) / 20) * 100}%, var(--muted) ${((settings.fontSize - 12) / 20) * 100}%, var(--muted) 100%)`
                }}
                aria-label="Adjust font size"
              />
              <div className="flex justify-between text-xs text-muted-foreground" style={{ marginTop: '0.25rem' }}>
                <span>Small</span>
                <span>Large</span>
              </div>
            </div>

            {/* Font Family */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="block text-sm font-medium text-foreground" style={{ marginBottom: '0.75rem' }}>
                Font Family
              </label>
              <select
                value={settings.fontFamily}
                onChange={(e) => updateSetting('fontFamily', e.target.value as any)}
                className="w-full rounded-lg border border-border bg-background text-foreground cursor-pointer hover:border-accent transition-colors"
                style={{ padding: '0.75rem 1rem' }}
              >
                <option value="default">Default Sans-Serif</option>
                <option value="dyslexic">OpenDyslexic (Dyslexia Friendly)</option>
                <option value="mono">Monospace</option>
              </select>
            </div>

            {/* Line Height */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                <label className="text-sm font-medium text-foreground">Line Height</label>
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{settings.lineHeight.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.1"
                value={settings.lineHeight}
                onChange={(e) => updateSetting('lineHeight', parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((settings.lineHeight - 1) / 1.5) * 100}%, var(--muted) ${((settings.lineHeight - 1) / 1.5) * 100}%, var(--muted) 100%)`
                }}
                aria-label="Adjust line height"
              />
              <div className="flex justify-between text-xs text-muted-foreground" style={{ marginTop: '0.25rem' }}>
                <span>Compact</span>
                <span>Spacious</span>
              </div>
            </div>

            {/* Letter Spacing */}
            <div style={{ marginBottom: '1.5rem' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                <label className="text-sm font-medium text-foreground">Letter Spacing</label>
                <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{settings.letterSpacing}px</span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={settings.letterSpacing}
                onChange={(e) => updateSetting('letterSpacing', parseFloat(e.target.value))}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${(settings.letterSpacing / 5) * 100}%, var(--muted) ${(settings.letterSpacing / 5) * 100}%, var(--muted) 100%)`
                }}
                aria-label="Adjust letter spacing"
              />
              <div className="flex justify-between text-xs text-muted-foreground" style={{ marginTop: '0.25rem' }}>
                <span>Normal</span>
                <span>Wide</span>
              </div>
            </div>

            {/* Theme */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="block text-sm font-medium text-foreground" style={{ marginBottom: '0.75rem' }}>
                Theme Mode
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => updateSetting('theme', 'light')}
                  className={`flex-1 rounded-lg border transition-all ${
                    settings.theme === 'light' 
                      ? 'border-accent shadow-lg' 
                      : 'border-border hover:border-accent'
                  }`}
                  style={{ 
                    padding: '0.875rem',
                    backgroundColor: settings.theme === 'light' ? 'var(--accent)' : 'var(--muted)',
                    color: settings.theme === 'light' ? 'white' : 'var(--foreground)'
                  }}
                >
                  <div className="text-sm font-medium">Light</div>
                </button>
                <button
                  onClick={() => updateSetting('theme', 'dark')}
                  className={`flex-1 rounded-lg border transition-all ${
                    settings.theme === 'dark' 
                      ? 'border-accent shadow-lg' 
                      : 'border-border hover:border-accent'
                  }`}
                  style={{ 
                    padding: '0.875rem',
                    backgroundColor: settings.theme === 'dark' ? 'var(--accent)' : 'var(--muted)',
                    color: settings.theme === 'dark' ? 'white' : 'var(--foreground)'
                  }}
                >
                  <div className="text-sm font-medium">Dark</div>
                </button>
                <button
                  onClick={() => updateSetting('theme', 'high-contrast')}
                  className={`flex-1 rounded-lg border transition-all ${
                    settings.theme === 'high-contrast' 
                      ? 'border-accent shadow-lg' 
                      : 'border-border hover:border-accent'
                  }`}
                  style={{ 
                    padding: '0.875rem',
                    backgroundColor: settings.theme === 'high-contrast' ? 'var(--accent)' : 'var(--muted)',
                    color: settings.theme === 'high-contrast' ? 'white' : 'var(--foreground)'
                  }}
                >
                  <div className="text-sm font-medium">High</div>
                </button>
              </div>
            </div>

            {/* Color Overlay */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="block text-sm font-medium text-foreground" style={{ marginBottom: '0.75rem' }}>
                Color Overlay
              </label>
              <select
                value={settings.colorOverlay}
                onChange={(e) => updateSetting('colorOverlay', e.target.value as any)}
                className="w-full rounded-lg border border-border bg-background text-foreground cursor-pointer hover:border-accent transition-colors"
                style={{ padding: '0.75rem 1rem' }}
              >
                <option value="none">None</option>
                <option value="yellow">🟡 Yellow (Reduce Glare)</option>
                <option value="blue">🔵 Blue (Calm Reading)</option>
                <option value="green">🟢 Green (Eye Comfort)</option>
              </select>
            </div>

            {/* Reader Mode */}
            <div style={{ marginBottom: '1rem' }}>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-border transition-all hover:border-accent" style={{ padding: '1rem' }}>
                <input
                  type="checkbox"
                  checked={settings.readerMode}
                  onChange={(e) => updateSetting('readerMode', e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Distraction-Free Mode</div>
                  <div className="text-xs text-muted-foreground">Hide navigation bar</div>
                </div>
              </label>
            </div>
          </div>

          {/* Text-to-Speech Settings */}
          <div className="border-t border-border" style={{ marginBottom: '2rem', paddingTop: '2rem' }}>
            <div className="flex items-center gap-2" style={{ marginBottom: '1.25rem' }}>
              <svg className="w-5 h-5" style={{ color: 'var(--accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
              <h3 className="text-lg font-semibold text-foreground">Text-to-Speech</h3>
            </div>
            
            {/* TTS Enable */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label className="flex items-center gap-3 cursor-pointer rounded-lg border border-border transition-all hover:border-accent" style={{ padding: '1rem' }}>
                <input
                  type="checkbox"
                  checked={settings.ttsEnabled}
                  onChange={(e) => updateSetting('ttsEnabled', e.target.checked)}
                  className="w-5 h-5 cursor-pointer"
                  style={{ accentColor: 'var(--accent)' }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-foreground">Enable Read Aloud</div>
                  <div className="text-xs text-muted-foreground">Listen to text being read</div>
                </div>
              </label>
            </div>

            {/* TTS Speed */}
            {settings.ttsEnabled && (
              <div style={{ marginBottom: '1rem' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: '0.75rem' }}>
                  <label className="text-sm font-medium text-foreground">Reading Speed</label>
                  <span className="text-sm font-bold" style={{ color: 'var(--accent)' }}>{settings.ttsSpeed.toFixed(1)}x</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={settings.ttsSpeed}
                  onChange={(e) => updateSetting('ttsSpeed', parseFloat(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, var(--accent) 0%, var(--accent) ${((settings.ttsSpeed - 0.5) / 1.5) * 100}%, var(--muted) ${((settings.ttsSpeed - 0.5) / 1.5) * 100}%, var(--muted) 100%)`
                  }}
                  aria-label="Adjust reading speed"
                />
                <div className="flex justify-between text-xs text-muted-foreground" style={{ marginTop: '0.25rem' }}>
                  <span>Slower</span>
                  <span>Faster</span>
                </div>
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="border-t border-border" style={{ paddingTop: '2rem' }}>
            <h3 className="text-lg font-semibold text-foreground" style={{ marginBottom: '1rem' }}>Quick Actions</h3>
            
            <button
              onClick={() => {
                updateSetting('fontSize', 16);
                updateSetting('fontFamily', 'default');
                updateSetting('lineHeight', 1.6);
                updateSetting('letterSpacing', 0);
                updateSetting('theme', 'light');
                updateSetting('colorOverlay', 'none');
                updateSetting('ttsEnabled', false);
                updateSetting('ttsSpeed', 1);
                updateSetting('readerMode', false);
              }}
              className="w-full rounded-lg font-medium transition-all hover:shadow-lg"
              style={{ 
                padding: '1rem',
                backgroundColor: 'var(--muted)',
                color: 'var(--foreground)',
                marginBottom: '0.75rem'
              }}
            >
              Reset to Defaults
            </button>
            
            <button
              className="w-full rounded-lg font-medium transition-all hover:shadow-xl"
              style={{ 
                padding: '1rem',
                backgroundColor: 'var(--accent)',
                color: 'white'
              }}
            >
              Save Preferences
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
