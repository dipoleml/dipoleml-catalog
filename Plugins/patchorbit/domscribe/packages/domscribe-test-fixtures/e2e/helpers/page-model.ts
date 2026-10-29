/**
 * Page Object Model for fixture apps.
 *
 * Provides typed helpers for interacting with fixture UI in E2E tests.
 */

import type { Page, Locator } from '@playwright/test';

export class FixturePage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  /** The sidebar navigation */
  get sidebar(): Locator {
    return this.page.locator('.sidebar');
  }

  /** The main content area */
  get mainContent(): Locator {
    return this.page.locator('.main-content');
  }

  /** All sidebar navigation links */
  get navLinks(): Locator {
    return this.page.locator('.sidebar-link');
  }

  /** The currently active nav link */
  get activeNavLink(): Locator {
    return this.page.locator('.sidebar-link.active');
  }

  /** The page title heading */
  get pageTitle(): Locator {
    return this.page.locator('.page-title');
  }

  /** All demo boxes (component containers with capture widgets) */
  get demoBoxes(): Locator {
    return this.page.locator('.demo-box');
  }

  /** All capture icon buttons */
  get captureIcons(): Locator {
    return this.page.locator('.capture-icon');
  }

  /** Navigate to a component by clicking its sidebar link (by label text) */
  async navigateTo(label: string): Promise<void> {
    await this.page.click(`.sidebar-link:has-text("${label}")`);
    await this.page.waitForTimeout(300); // Allow render
  }

  /**
   * Navigate to a component by clicking the sidebar link with matching data-page-id.
   * Tries exact match first, then fuzzy match (handles TS vs JS fixture ID differences,
   * e.g. "conditional" vs "conditional-rendering", "nested" vs "deeply-nested").
   */
  async navigateToPageId(pageId: string): Promise<void> {
    const clicked = await this.page.evaluate((id) => {
      const links = document.querySelectorAll<HTMLElement>(
        '.sidebar-link[data-page-id]',
      );

      // Exact match first
      for (const link of links) {
        if (link.dataset.pageId === id) {
          link.scrollIntoView({ block: 'center', behavior: 'instant' });
          link.click();
          return true;
        }
      }

      // Fuzzy matching for TS vs JS fixture ID differences:
      // "conditional" → "conditional-rendering" (segment match)
      // "nested" → "deeply-nested" (segment match)
      // "svg-elements" → "s-v-g-elements" (dehyphenated match)
      for (const link of links) {
        const linkId = link.dataset.pageId ?? '';
        // Dehyphenated comparison (svg-elements ↔ s-v-g-elements → svgelements)
        if (linkId.replace(/-/g, '') === id.replace(/-/g, '')) {
          link.scrollIntoView({ block: 'center', behavior: 'instant' });
          link.click();
          return true;
        }
        // Segment match (all search segments found in link segments)
        const segments = linkId.split('-');
        const searchSegments = id.split('-');
        const allFound = searchSegments.every((seg) => segments.includes(seg));
        if (allFound) {
          link.scrollIntoView({ block: 'center', behavior: 'instant' });
          link.click();
          return true;
        }
      }

      return false;
    }, pageId);

    if (!clicked) {
      throw new Error(`No sidebar link found for pageId: "${pageId}"`);
    }
    await this.page.waitForTimeout(300); // Allow render
  }

  /** Get all elements with data-ds attributes on the page */
  async getDataDsElements(): Promise<string[]> {
    return this.page.evaluate(() => {
      const elements = document.querySelectorAll('[data-ds]');
      return Array.from(elements).map((el) => el.getAttribute('data-ds') ?? '');
    });
  }
}
