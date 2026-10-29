/**
 * DOM Capture + Assertion Helpers for E2E tests.
 *
 * Provides utilities for capturing element context and asserting results
 * in Playwright E2E tests.
 */

import type { Page } from '@playwright/test';

/**
 * Count elements with data-ds attributes on the page.
 */
export async function countDataDsElements(page: Page): Promise<number> {
  return page.evaluate(() => {
    return document.querySelectorAll('[data-ds]').length;
  });
}

/**
 * Get all unique data-ds attribute values on the page.
 */
export async function getDataDsValues(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const elements = document.querySelectorAll('[data-ds]');
    return [
      ...new Set(
        Array.from(elements).map((el) => el.getAttribute('data-ds') ?? ''),
      ),
    ];
  });
}

/**
 * Full captured context as displayed by the overlay UI.
 * Read from the overlay's Shadow DOM after selecting an element.
 */
export interface FullCapturedContext {
  /** Tag name shown in element preview (e.g. "div") */
  tagName: string | null;
  /** Component name shown in element preview (e.g. "SmokeTest") */
  componentName: string | null;
  /** data-ds attribute from the selected element */
  dataDs: string | null;
  /** Source location shown in element preview (e.g. "BasicElements.tsx:15") */
  sourceLocation: string | null;
  /** Props displayed in the context panel: { key: formattedValue } */
  props: Record<string, string>;
  /** State displayed in the context panel: { key: formattedValue } */
  state: Record<string, string>;
}

/**
 * Read the captured context from the overlay UI after an element has been selected.
 *
 * This reads from ds-element-preview and ds-context-panel in the sidebar,
 * which display the component name, source location, props, and state
 * as shown to the user.
 */
export async function readOverlayContext(
  page: Page,
): Promise<FullCapturedContext | null> {
  return page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return null;

    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return null;

    const preview = sidebar.shadowRoot.querySelector('ds-element-preview');
    if (!preview?.shadowRoot) return null;

    // Read tag name
    const tagNameEl = preview.shadowRoot.querySelector('.tag-name');
    const tagName = tagNameEl?.textContent?.replace(/[<>]/g, '').trim() ?? null;

    // Read component name
    const componentNameEl = preview.shadowRoot.querySelector('.component-name');
    const componentName = componentNameEl?.textContent?.trim() ?? null;

    // Read source location
    const sourceEl = preview.shadowRoot.querySelector('.source-location');
    const sourceLocation = sourceEl?.textContent?.trim() ?? null;

    // Read props and state from context panel
    const contextPanel = preview.shadowRoot.querySelector('ds-context-panel');

    const props: Record<string, string> = {};
    const state: Record<string, string> = {};

    if (contextPanel?.shadowRoot) {
      const sections = contextPanel.shadowRoot.querySelectorAll('.section');

      for (const section of sections) {
        const titleEl = section.querySelector('.section-title');
        const titleText = titleEl?.textContent?.trim().toLowerCase() ?? '';

        // Determine if this is props or state section
        const isProps = titleText.startsWith('props');
        const isState = titleText.startsWith('state');
        const target = isProps ? props : isState ? state : null;

        if (!target) continue;

        // Expand the section if collapsed (click header to toggle)
        const header = section.querySelector(
          '.section-header',
        ) as HTMLElement | null;
        const chevron = section.querySelector('.chevron');
        const isExpanded = chevron?.classList.contains('expanded');

        if (!isExpanded && header) {
          header.click();
        }
      }
    }

    return {
      tagName,
      componentName,
      dataDs: null,
      sourceLocation,
      props,
      state,
    };
  });
}

/**
 * Read props/state after sections have been expanded.
 * Call this after readOverlayContext() which expands collapsed sections.
 */
export async function readOverlayPropsAndState(
  page: Page,
): Promise<{ props: Record<string, string>; state: Record<string, string> }> {
  // Small delay for sections to expand
  await page.waitForTimeout(200);

  return page.evaluate(() => {
    const props: Record<string, string> = {};
    const state: Record<string, string> = {};

    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return { props, state };

    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return { props, state };

    const preview = sidebar.shadowRoot.querySelector('ds-element-preview');
    if (!preview?.shadowRoot) return { props, state };

    const contextPanel = preview.shadowRoot.querySelector('ds-context-panel');
    if (!contextPanel?.shadowRoot) return { props, state };

    const sections = contextPanel.shadowRoot.querySelectorAll('.section');

    for (const section of sections) {
      const titleEl = section.querySelector('.section-title');
      const titleText = titleEl?.textContent?.trim().toLowerCase() ?? '';

      const isProps = titleText.startsWith('props');
      const isState = titleText.startsWith('state');
      const target = isProps ? props : isState ? state : null;

      if (!target) continue;

      const properties = section.querySelectorAll('.property');
      for (const prop of properties) {
        const nameEl = prop.querySelector('.property-name');
        const valueEl = prop.querySelector('.property-value');
        if (nameEl && valueEl) {
          const key = nameEl.textContent?.replace(/:$/, '').trim() ?? '';
          const value = valueEl.textContent?.trim() ?? '';
          if (key) {
            target[key] = value;
          }
        }
      }
    }

    return { props, state };
  });
}

/**
 * Select an element via the overlay capture mode and read the displayed context.
 *
 * Full flow: wait for overlay -> expand -> enter capture mode -> click element ->
 * wait for context -> read from overlay UI.
 */
export async function selectAndReadContext(
  page: Page,
  selector: string,
): Promise<FullCapturedContext | null> {
  // Get the data-ds attribute before capture
  const dataDs = await page.evaluate(
    (sel) => document.querySelector(sel)?.getAttribute('data-ds') ?? null,
    selector,
  );

  // Wait for overlay to be in the DOM with shadow root ready
  await page.waitForFunction(
    () => {
      const overlay = document.querySelector('ds-overlay');
      return overlay?.shadowRoot !== null && overlay?.shadowRoot !== undefined;
    },
    { timeout: 10_000 },
  );

  // Expand overlay (no-op if already expanded)
  const expanded = await expandOverlay(page);
  if (!expanded) return null;
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

  // Enter capture mode
  const entered = await enterOverlayCaptureMode(page);
  if (!entered) return null;

  // Click the target element
  const clicked = await clickElementInCaptureMode(page, selector);
  if (!clicked) return null;

  // Wait for runtime context and manifest resolution
  await page.waitForTimeout(1000);

  // Read context from overlay UI
  const context = await readOverlayContext(page);
  if (!context) return null;

  // Expand sections and read props/state values
  const { props, state } = await readOverlayPropsAndState(page);

  return {
    ...context,
    dataDs,
    props,
    state,
  };
}

/**
 * Enter overlay capture mode by clicking the capture button in the sidebar.
 * Pierces Shadow DOM manually since Playwright locators can't traverse shadow roots.
 * Returns true if capture mode was successfully entered.
 */
export async function enterOverlayCaptureMode(page: Page): Promise<boolean> {
  const clicked = await page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return false;

    const sidebar = overlay.shadowRoot.querySelector('ds-sidebar');
    if (!sidebar?.shadowRoot) return false;

    const input = sidebar.shadowRoot.querySelector('ds-annotation-input');
    if (!input?.shadowRoot) return false;

    const btn = input.shadowRoot.querySelector(
      'button[aria-label="Capture element"]',
    );
    if (!btn) return false;

    (btn as HTMLElement).click();
    return true;
  });

  if (clicked) {
    // Wait for picker overlay to appear
    await page.waitForTimeout(300);
  }

  return clicked;
}

/**
 * Check if the overlay is present and in a given mode.
 */
export async function getOverlayMode(page: Page): Promise<string | null> {
  return page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    return overlay?.getAttribute('mode') ?? null;
  });
}

/**
 * Click on an element during capture mode by dispatching a click
 * directly on the picker overlay inside the shadow DOM.
 *
 * page.mouse.click() hits the ds-overlay host element but doesn't
 * propagate into the shadow DOM to reach ds-picker-overlay.
 * Instead, we dispatch the click event directly on the picker.
 */
export async function clickElementInCaptureMode(
  page: Page,
  selector: string,
): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;

    // Scroll element into view — elementFromPoint only works for visible elements
    el.scrollIntoView({ block: 'center', behavior: 'instant' });

    const r = el.getBoundingClientRect();
    const x = r.x + r.width / 2;
    const y = r.y + r.height / 2;

    const overlay = document.querySelector('ds-overlay');
    const picker = overlay?.shadowRoot?.querySelector('ds-picker-overlay');
    if (!picker) return false;

    picker.dispatchEvent(
      new MouseEvent('click', {
        clientX: x,
        clientY: y,
        bubbles: true,
        composed: true,
      }),
    );
    return true;
  }, selector);
}

/**
 * Exit capture mode by pressing Escape.
 */
export async function exitCaptureMode(page: Page): Promise<void> {
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
}

/**
 * Expand the overlay sidebar. If already expanded, this is a no-op.
 * If collapsed, clicks the tab to expand.
 */
export async function expandOverlay(page: Page): Promise<boolean> {
  // Check if already expanded
  const currentMode = await page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    return overlay?.getAttribute('mode') ?? null;
  });
  if (currentMode === 'expanded') return true;

  // Get the tab button's coordinates — we need a real pointer event
  // because ds-tab uses setPointerCapture which rejects synthetic events
  const rect = await page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    if (!overlay?.shadowRoot) return null;
    const tab = overlay.shadowRoot.querySelector('ds-tab');
    if (!tab?.shadowRoot) return null;
    const tabBtn = tab.shadowRoot.querySelector('.tab');
    if (!tabBtn) return null;
    const r = tabBtn.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  if (!rect) return false;

  await page.mouse.click(rect.x, rect.y);
  await page.waitForTimeout(300);

  const newMode = await page.evaluate(() => {
    const overlay = document.querySelector('ds-overlay');
    return overlay?.getAttribute('mode') ?? null;
  });
  return newMode === 'expanded';
}
