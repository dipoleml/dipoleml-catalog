/**
 * Annotation Lifecycle E2E Tests
 *
 * Tests the full annotation CRUD lifecycle via the overlay UI:
 * - Select element + create annotation
 * - Locate element from annotation
 * - Refresh annotation
 * - Update annotation description
 * - Archive annotation
 * - Delete annotation
 *
 * All validation happens through the overlay UI (Shadow DOM),
 * matching the approach in overlay-interaction.spec.ts.
 *
 * Requires: @playwright/test, dev server with relay running for fixture
 */

import { type Page } from '@playwright/test';
import { test, expect, getServer } from './fixtures.js';
import {
  expandOverlay,
  enterOverlayCaptureMode,
  clickElementInCaptureMode,
} from './helpers/capture-helpers.js';
import type { DevServerHandle } from './helpers/dev-server.js';

const FIXTURE_ID = 'vite-v5-react-18-ts';
const TARGET_SELECTOR = '.demo-box';
const ANNOTATION_MESSAGE = 'E2E test annotation';

// ---------------------------------------------------------------------------
// Shadow DOM helpers — all UI validation goes through the overlay
// ---------------------------------------------------------------------------

/** Wait for the annotation input textarea to be enabled (element selected + relay connected). */
async function waitForInputEnabled(page: Page): Promise<void> {
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('ds-overlay');
      if (!overlay?.shadowRoot) return false;
      const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
      if (!sidebar?.shadowRoot) return false;
      const input = sidebar.shadowRoot.querySelector('ds-annotation-input');
      if (!input?.shadowRoot) return false;
      const textarea = input.shadowRoot.querySelector('textarea');
      return textarea !== null && !textarea.disabled;
    },
    { timeout: 10_000 },
  );
}

/** Type a message into the annotation input textarea. */
async function typeAnnotationMessage(
  page: Page,
  message: string,
): Promise<boolean> {
  return page.evaluate((msg) => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;
    const input = sidebar.shadowRoot.querySelector('ds-annotation-input');
    if (!input?.shadowRoot) return false;
    const textarea = input.shadowRoot.querySelector('textarea');
    if (!textarea || textarea.disabled) return false;

    textarea.value = msg;
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, message);
}

/** Click the submit button in the annotation input. */
async function clickSubmitButton(page: Page): Promise<boolean> {
  return page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;
    const input = sidebar.shadowRoot.querySelector('ds-annotation-input');
    if (!input?.shadowRoot) return false;
    const btn = input.shadowRoot.querySelector(
      '.submit-btn',
    ) as HTMLButtonElement | null;
    if (!btn || btn.disabled) return false;
    btn.click();
    return true;
  });
}

/** Get the count of annotations shown in a status group. Returns -1 if group not found. */
async function getStatusGroupCount(
  page: Page,
  status: string,
): Promise<number> {
  return page.evaluate((s) => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return -1;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return -1;
    const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
    if (!list?.shadowRoot) return -1;

    const headers = list.shadowRoot.querySelectorAll('.status-header');
    for (const header of headers) {
      const label = header.textContent?.toLowerCase() ?? '';
      if (label.includes(s)) {
        const countEl = header.querySelector('.status-count');
        const countText = countEl?.textContent?.replace(/[()]/g, '').trim();
        return countText ? parseInt(countText, 10) : 0;
      }
    }
    return -1;
  }, status);
}

/** Open a status group in the annotation list (click its header). */
async function openStatusGroup(page: Page, status: string): Promise<boolean> {
  return page.evaluate((s) => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;
    const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
    if (!list?.shadowRoot) return false;

    const headers =
      list.shadowRoot.querySelectorAll<HTMLButtonElement>('.status-header');
    for (const header of headers) {
      const label = header.textContent?.toLowerCase() ?? '';
      if (label.includes(s)) {
        // Only click if not already open
        if (!header.classList.contains('open')) {
          header.click();
        }
        return true;
      }
    }
    return false;
  }, status);
}

/** Read the expanded annotation item details after it has been expanded. */
async function readExpandedAnnotationItem(
  page: Page,
  status: string,
): Promise<{
  contentText: string | null;
  hasLocateBtn: boolean;
  hasRefreshBtn: boolean;
  hasArchiveBtn: boolean;
  hasDeleteBtn: boolean;
} | null> {
  return page.evaluate((s) => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return null;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return null;
    const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
    if (!list?.shadowRoot) return null;

    const groups = list.shadowRoot.querySelectorAll('.status-group');
    for (const group of groups) {
      const header = group.querySelector('.status-header');
      const label = header?.textContent?.toLowerCase() ?? '';
      if (!label.includes(s)) continue;

      const item = group.querySelector('ds-annotation-item');
      if (!item?.shadowRoot) return null;

      const content = item.shadowRoot.querySelector('.content');
      const actionBar = item.shadowRoot.querySelector('.action-bar');

      return {
        contentText: content?.textContent?.trim() ?? null,
        hasLocateBtn: !!actionBar?.querySelector('.action-btn.locate'),
        hasRefreshBtn: !!actionBar?.querySelector('.action-btn.refresh'),
        hasArchiveBtn: !!actionBar?.querySelector('.action-btn.archive'),
        hasDeleteBtn: !!actionBar?.querySelector('.action-btn.danger'),
      };
    }
    return null;
  }, status);
}

/** Expand the first annotation item in a status group (click collapsed row). */
async function expandFirstAnnotationItem(
  page: Page,
  status: string,
): Promise<boolean> {
  return page.evaluate((s) => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;
    const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
    if (!list?.shadowRoot) return false;

    const groups = list.shadowRoot.querySelectorAll('.status-group');
    for (const group of groups) {
      const header = group.querySelector('.status-header');
      const label = header?.textContent?.toLowerCase() ?? '';
      if (!label.includes(s)) continue;

      const item = group.querySelector('ds-annotation-item');
      if (!item?.shadowRoot) return false;

      const collapsedRow = item.shadowRoot.querySelector(
        '.collapsed-row',
      ) as HTMLElement | null;
      if (collapsedRow) {
        collapsedRow.click();
        return true;
      }
      // Already expanded
      return true;
    }
    return false;
  }, status);
}

/** Click an action button on the first expanded annotation item in a status group. */
async function clickAnnotationAction(
  page: Page,
  status: string,
  actionClass: string,
): Promise<boolean> {
  return page.evaluate(
    ({ s, cls }) => {
      const overlay = document.querySelector('ds-overlay');
      if (!overlay?.shadowRoot) return false;
      const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
      if (!sidebar?.shadowRoot) return false;
      const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
      if (!list?.shadowRoot) return false;

      const groups = list.shadowRoot.querySelectorAll('.status-group');
      for (const group of groups) {
        const header = group.querySelector('.status-header');
        const label = header?.textContent?.toLowerCase() ?? '';
        if (!label.includes(s)) continue;

        const item = group.querySelector('ds-annotation-item');
        if (!item?.shadowRoot) return false;

        const btn = item.shadowRoot.querySelector(
          `.action-btn.${cls}`,
        ) as HTMLElement | null;
        if (!btn) return false;
        btn.click();
        return true;
      }
      return false;
    },
    { s: status, cls: actionClass },
  );
}

/** Double-click the content area to enter edit mode, type new text, and press Enter to save. */
async function editAnnotationDescription(
  page: Page,
  status: string,
  newText: string,
): Promise<boolean> {
  // Double-click the content to enter edit mode
  const entered = await page.evaluate((s) => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;
    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;
    const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
    if (!list?.shadowRoot) return false;

    const groups = list.shadowRoot.querySelectorAll('.status-group');
    for (const group of groups) {
      const header = group.querySelector('.status-header');
      const label = header?.textContent?.toLowerCase() ?? '';
      if (!label.includes(s)) continue;

      const item = group.querySelector('ds-annotation-item');
      if (!item?.shadowRoot) return false;

      const content = item.shadowRoot.querySelector(
        '.content',
      ) as HTMLElement | null;
      if (!content) return false;

      content.dispatchEvent(
        new MouseEvent('dblclick', { bubbles: true, composed: true }),
      );
      return true;
    }
    return false;
  }, status);

  if (!entered) return false;
  await page.waitForTimeout(200);

  // Type the new text into the edit textarea
  const typed = await page.evaluate(
    ({ s, text }) => {
      const overlay = document.querySelector('ds-overlay');
      if (!overlay?.shadowRoot) return false;
      const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
      if (!sidebar?.shadowRoot) return false;
      const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
      if (!list?.shadowRoot) return false;

      const groups = list.shadowRoot.querySelectorAll('.status-group');
      for (const group of groups) {
        const header = group.querySelector('.status-header');
        const label = header?.textContent?.toLowerCase() ?? '';
        if (!label.includes(s)) continue;

        const item = group.querySelector('ds-annotation-item');
        if (!item?.shadowRoot) return false;

        const textarea = item.shadowRoot.querySelector(
          '.edit-textarea',
        ) as HTMLTextAreaElement | null;
        if (!textarea) return false;

        textarea.value = text;
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        textarea.focus();
        return true;
      }
      return false;
    },
    { s: status, text: newText },
  );

  if (!typed) return false;

  // Click elsewhere to blur the textarea and trigger save.
  // Programmatic blur()/dispatchEvent don't reliably trigger Lit event handlers
  // in shadow DOM — a real mouse click forces an actual focus change.
  await page.mouse.click(10, 10);
  return true;
}

/**
 * Full flow: capture element + type message + submit annotation.
 * Reusable across tests that need an annotation to exist.
 */
async function createAnnotation(
  page: Page,
  selector: string,
  message: string,
): Promise<void> {
  await expandOverlay(page);
  await page.waitForTimeout(300);

  // Wait for sidebar shadow DOM to be ready
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('ds-overlay');
      if (!overlay?.shadowRoot) return false;
      const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
      if (!sidebar?.shadowRoot) return false;
      const input = sidebar.shadowRoot.querySelector('ds-annotation-input');
      return input?.shadowRoot !== null && input?.shadowRoot !== undefined;
    },
    { timeout: 5_000 },
  );

  // Capture element first — the textarea stays disabled until an element is selected
  const entered = await enterOverlayCaptureMode(page);
  expect(entered, 'Failed to enter capture mode').toBe(true);

  const clicked = await clickElementInCaptureMode(page, selector);
  expect(clicked, 'Failed to click element in capture mode').toBe(true);

  // Wait for runtime context capture + textarea to become enabled
  await waitForInputEnabled(page);

  // Type message and submit
  const typed = await typeAnnotationMessage(page, message);
  expect(typed, 'Failed to type annotation message').toBe(true);

  const submitted = await clickSubmitButton(page);
  expect(submitted, 'Failed to click submit button').toBe(true);

  // Wait for annotation to be persisted and list to refresh
  await page.waitForTimeout(1500);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test.describe('Annotation Lifecycle', () => {
  // Run serially — all tests share one relay, so parallel execution
  // causes annotation count interference between tests
  test.describe.configure({ mode: 'serial' });

  let server: DevServerHandle;

  test.beforeAll(async () => {
    server = await getServer(FIXTURE_ID);
  });

  test.describe('Create', () => {
    test('should create an annotation via capture + submit and see it in the list', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      // Annotation should appear in the queued (or processing/processed) group
      // Check that at least one status group has a count > 0
      const queued = await getStatusGroupCount(page, 'queued');
      const processing = await getStatusGroupCount(page, 'processing');
      const processed = await getStatusGroupCount(page, 'processed');

      const totalAnnotations =
        Math.max(queued, 0) + Math.max(processing, 0) + Math.max(processed, 0);
      expect(
        totalAnnotations,
        'Expected at least one annotation in the list after creation',
      ).toBeGreaterThan(0);
    });
  });

  test.describe('View & Actions', () => {
    test('should expand an annotation item and see action buttons', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      // Find which status group has our annotation
      const statuses = ['queued', 'processing', 'processed'];
      let activeStatus: string | null = null;
      for (const s of statuses) {
        const count = await getStatusGroupCount(page, s);
        if (count > 0) {
          activeStatus = s;
          break;
        }
      }
      expect(activeStatus, 'No status group has annotations').toBeTruthy();

      // Open the status group and expand the first item
      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);

      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      const details = await readExpandedAnnotationItem(page, activeStatus!);
      expect(details, 'Failed to read expanded annotation item').toBeTruthy();

      expect(details!.contentText).toContain(ANNOTATION_MESSAGE);
      expect(details!.hasLocateBtn).toBe(true);
      expect(details!.hasRefreshBtn).toBe(true);
      expect(details!.hasArchiveBtn).toBe(true);
      expect(details!.hasDeleteBtn).toBe(true);
    });
  });

  test.describe('Locate', () => {
    test('should scroll to the annotated element when Locate is clicked', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      // Scroll the page so the target element is out of view
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      // Find and expand the annotation
      const statuses = ['queued', 'processing', 'processed'];
      let activeStatus: string | null = null;
      for (const s of statuses) {
        const count = await getStatusGroupCount(page, s);
        if (count > 0) {
          activeStatus = s;
          break;
        }
      }
      expect(activeStatus).toBeTruthy();

      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);
      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      // Click Locate
      const located = await clickAnnotationAction(
        page,
        activeStatus!,
        'locate',
      );
      expect(located, 'Failed to click Locate button').toBe(true);
      await page.waitForTimeout(1000);

      // Verify the target element is now in the viewport
      const isVisible = await page.evaluate((sel) => {
        const el = document.querySelector(sel);
        if (!el) return false;
        const rect = el.getBoundingClientRect();
        return (
          rect.top >= 0 &&
          rect.left >= 0 &&
          rect.bottom <= window.innerHeight &&
          rect.right <= window.innerWidth
        );
      }, TARGET_SELECTOR);

      expect(isVisible, 'Target element should be visible after Locate').toBe(
        true,
      );
    });
  });

  test.describe('Refresh', () => {
    test('should refresh annotation metadata without errors', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      const statuses = ['queued', 'processing', 'processed'];
      let activeStatus: string | null = null;
      for (const s of statuses) {
        const count = await getStatusGroupCount(page, s);
        if (count > 0) {
          activeStatus = s;
          break;
        }
      }
      expect(activeStatus).toBeTruthy();

      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);
      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      const countBefore = await getStatusGroupCount(page, activeStatus!);

      const refreshed = await clickAnnotationAction(
        page,
        activeStatus!,
        'refresh',
      );
      expect(refreshed, 'Failed to click Refresh button').toBe(true);
      await page.waitForTimeout(1000);

      // The annotation should still be present after refresh
      const countAfter = await getStatusGroupCount(page, activeStatus!);
      expect(countAfter).toBeGreaterThanOrEqual(countBefore);
    });
  });

  test.describe('Update Description', () => {
    test('should update annotation description via double-click edit', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      const statuses = ['queued', 'processing', 'processed'];
      let activeStatus: string | null = null;
      for (const s of statuses) {
        const count = await getStatusGroupCount(page, s);
        if (count > 0) {
          activeStatus = s;
          break;
        }
      }
      expect(activeStatus).toBeTruthy();

      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);
      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      const updatedText = 'Updated annotation description';
      const edited = await editAnnotationDescription(
        page,
        activeStatus!,
        updatedText,
      );
      expect(edited, 'Failed to edit annotation description').toBe(true);
      await page.waitForTimeout(1500);

      // Re-expand after save — the list re-renders when relay persists the update
      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);
      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      // Re-read the annotation content to verify the update
      const details = await readExpandedAnnotationItem(page, activeStatus!);
      expect(details).toBeTruthy();
      expect(details!.contentText).toContain(updatedText);
    });
  });

  test.describe('Archive', () => {
    test('should move annotation to archived status when Archive is clicked', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      const statuses = ['queued', 'processing', 'processed'];
      let activeStatus: string | null = null;
      for (const s of statuses) {
        const count = await getStatusGroupCount(page, s);
        if (count > 0) {
          activeStatus = s;
          break;
        }
      }
      expect(activeStatus).toBeTruthy();

      const countBefore = await getStatusGroupCount(page, activeStatus!);

      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);
      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      const archived = await clickAnnotationAction(
        page,
        activeStatus!,
        'archive',
      );
      expect(archived, 'Failed to click Archive button').toBe(true);
      await page.waitForTimeout(1500);

      // Count in the original status group should decrease
      const countAfter = await getStatusGroupCount(page, activeStatus!);
      expect(countAfter).toBeLessThan(countBefore);

      // Archived group should now have at least one entry
      const archivedCount = await getStatusGroupCount(page, 'archived');
      expect(archivedCount).toBeGreaterThan(0);
    });
  });

  test.describe('Delete', () => {
    test('should delete annotation after two-click confirmation', async ({
      page,
    }) => {
      await page.goto(server.url);
      await page.waitForSelector('.app', { timeout: 10_000 });
      await page.waitForSelector('ds-overlay', { timeout: 10_000 });

      await createAnnotation(page, TARGET_SELECTOR, ANNOTATION_MESSAGE);

      const statuses = ['queued', 'processing', 'processed'];
      let activeStatus: string | null = null;
      for (const s of statuses) {
        const count = await getStatusGroupCount(page, s);
        if (count > 0) {
          activeStatus = s;
          break;
        }
      }
      expect(activeStatus).toBeTruthy();

      const countBefore = await getStatusGroupCount(page, activeStatus!);

      await openStatusGroup(page, activeStatus!);
      await page.waitForTimeout(300);
      await expandFirstAnnotationItem(page, activeStatus!);
      await page.waitForTimeout(300);

      // First click — enters confirmation state
      const firstClick = await clickAnnotationAction(
        page,
        activeStatus!,
        'danger',
      );
      expect(firstClick, 'Failed first delete click').toBe(true);

      // Verify the button now says "Confirm?"
      const confirmText = await page.evaluate((s) => {
        const overlay = document.querySelector('ds-overlay');
        if (!overlay?.shadowRoot) return null;
        const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
        if (!sidebar?.shadowRoot) return null;
        const list = sidebar.shadowRoot.querySelector('ds-annotation-list');
        if (!list?.shadowRoot) return null;

        const groups = list.shadowRoot.querySelectorAll('.status-group');
        for (const group of groups) {
          const header = group.querySelector('.status-header');
          const label = header?.textContent?.toLowerCase() ?? '';
          if (!label.includes(s)) continue;
          const item = group.querySelector('ds-annotation-item');
          if (!item?.shadowRoot) return null;
          const btn = item.shadowRoot.querySelector('.action-btn.danger');
          return btn?.textContent?.trim() ?? null;
        }
        return null;
      }, activeStatus!);
      expect(confirmText).toContain('Confirm');

      // Second click — confirms deletion
      const secondClick = await clickAnnotationAction(
        page,
        activeStatus!,
        'danger',
      );
      expect(secondClick, 'Failed second delete click (confirm)').toBe(true);
      await page.waitForTimeout(1500);

      // Count should decrease
      const countAfter = await getStatusGroupCount(page, activeStatus!);
      expect(countAfter).toBeLessThan(countBefore);
    });
  });
});
