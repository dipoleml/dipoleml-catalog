/**
 * Theme - CSS variables and design tokens for the overlay
 *
 * Domscribe Design System
 * Primary: Cyan (#06b6d4) - Technical precision, clarity, trust
 * Foundation: Cool-tinted dark grays - Developer-first aesthetic
 */

import { css } from 'lit';

/**
 * CSS custom properties for theming
 */
export const themeStyles = css`
  :host {
    /* ========================================
     * DOMSCRIBE DESIGN SYSTEM
     * ======================================== */

    /* Cyan Scale - Primary Brand */
    --ds-cyan-50: #ecfeff;
    --ds-cyan-100: #cffafe;
    --ds-cyan-200: #a5f3fc;
    --ds-cyan-300: #67e8f9;
    --ds-cyan-400: #22d3ee;
    --ds-cyan-500: #06b6d4;
    --ds-cyan-600: #0891b2;
    --ds-cyan-700: #0e7490;
    --ds-cyan-800: #155e75;
    --ds-cyan-900: #164e63;

    /* Neutral Scale - Cool-tinted grays */
    --ds-neutral-50: #fafafa;
    --ds-neutral-100: #f4f4f5;
    --ds-neutral-200: #e4e4e7;
    --ds-neutral-300: #d4d4d8;
    --ds-neutral-400: #a1a1aa;
    --ds-neutral-500: #71717a;
    --ds-neutral-600: #52525b;
    --ds-neutral-700: #3f3f46;
    --ds-neutral-800: #27272a;
    --ds-neutral-900: #18181b;
    --ds-neutral-950: #0a0a0b;

    /* ========================================
     * SEMANTIC TOKENS
     * ======================================== */

    /* Backgrounds - Layered depth (dark to light) */
    --ds-bg-app: var(--ds-neutral-950);
    --ds-bg-primary: var(--ds-neutral-900);
    --ds-bg-secondary: var(--ds-neutral-800);
    --ds-bg-tertiary: var(--ds-neutral-700);
    --ds-bg-hover: var(--ds-neutral-700);
    --ds-bg-active: var(--ds-neutral-600);

    /* Text colors */
    --ds-text-primary: var(--ds-neutral-50);
    --ds-text-secondary: var(--ds-neutral-400);
    --ds-text-tertiary: var(--ds-neutral-500);
    --ds-text-accent: var(--ds-cyan-500);

    /* Brand colors */
    --ds-brand-primary: var(--ds-cyan-500);
    --ds-brand-secondary: var(--ds-cyan-600);
    --ds-brand-light: var(--ds-cyan-400);

    /* Status colors */
    --ds-success: #10b981;
    --ds-warning: #f59e0b;
    --ds-error: #ef4444;
    --ds-info: var(--ds-cyan-500);

    /* Highlight color (for element picker) */
    --ds-highlight: rgba(6, 182, 212, 0.15);
    --ds-highlight-border: var(--ds-cyan-500);
    --ds-highlight-glow: 0 0 20px rgba(6, 182, 212, 0.3);

    /* Border colors */
    --ds-border-primary: var(--ds-neutral-700);
    --ds-border-secondary: var(--ds-neutral-800);
    --ds-border-focus: var(--ds-cyan-500);

    /* Shadows */
    --ds-shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.4);
    --ds-shadow-md: 0 4px 6px rgba(0, 0, 0, 0.5);
    --ds-shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.6);
    --ds-shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.7);

    /* Spacing */
    --ds-space-xs: 4px;
    --ds-space-sm: 8px;
    --ds-space-md: 12px;
    --ds-space-lg: 16px;
    --ds-space-xl: 24px;
    --ds-space-2xl: 32px;

    /* Border radius */
    --ds-radius-sm: 4px;
    --ds-radius-md: 8px;
    --ds-radius-lg: 12px;
    --ds-radius-full: 9999px;

    /* Typography */
    --ds-font-family:
      'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    --ds-font-mono:
      'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Fira Code', monospace;

    --ds-font-size-xs: 10px;
    --ds-font-size-sm: 12px;
    --ds-font-size-md: 14px;
    --ds-font-size-lg: 16px;
    --ds-font-size-xl: 18px;

    --ds-line-height: 1.5;
    --ds-font-weight-normal: 400;
    --ds-font-weight-medium: 500;
    --ds-font-weight-semibold: 600;

    /* Layout */
    --ds-sidebar-width: 360px;
    --ds-tab-width: 32px;
    --ds-header-height: 48px;

    /* Z-index layers */
    --ds-z-overlay: 2147483646;
    --ds-z-picker: 2147483647;

    /* Transitions */
    --ds-transition-fast: 150ms ease;
    --ds-transition-normal: 250ms ease;
    --ds-transition-slow: 350ms ease;
  }
`;

/**
 * Common utility styles
 */
export const utilityStyles = css`
  /* Reset */
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  /* Typography */
  .text-xs {
    font-size: var(--ds-font-size-xs);
  }
  .text-sm {
    font-size: var(--ds-font-size-sm);
  }
  .text-md {
    font-size: var(--ds-font-size-md);
  }
  .text-lg {
    font-size: var(--ds-font-size-lg);
  }

  .text-primary {
    color: var(--ds-text-primary);
  }
  .text-secondary {
    color: var(--ds-text-secondary);
  }
  .text-accent {
    color: var(--ds-text-accent);
  }

  .font-mono {
    font-family: var(--ds-font-mono);
  }
  .font-medium {
    font-weight: var(--ds-font-weight-medium);
  }
  .font-semibold {
    font-weight: var(--ds-font-weight-semibold);
  }

  /* Spacing */
  .p-xs {
    padding: var(--ds-space-xs);
  }
  .p-sm {
    padding: var(--ds-space-sm);
  }
  .p-md {
    padding: var(--ds-space-md);
  }
  .p-lg {
    padding: var(--ds-space-lg);
  }

  /* Flex utilities */
  .flex {
    display: flex;
  }
  .flex-col {
    flex-direction: column;
  }
  .items-center {
    align-items: center;
  }
  .justify-between {
    justify-content: space-between;
  }
  .gap-sm {
    gap: var(--ds-space-sm);
  }
  .gap-md {
    gap: var(--ds-space-md);
  }

  /* Visibility */
  .hidden {
    display: none !important;
  }
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
