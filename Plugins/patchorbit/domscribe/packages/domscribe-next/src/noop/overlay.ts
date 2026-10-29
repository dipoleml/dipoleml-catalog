/**
 * No-op stub for @domscribe/overlay in production builds.
 *
 * DomscribeDevProvider dynamically imports @domscribe/overlay, which causes
 * the bundler to include the full overlay even in production builds.
 * withDomscribe() aliases @domscribe/overlay to this module in production
 * so the bundle contains only this empty stub.
 *
 * @module @domscribe/next/noop/overlay
 */
export function initOverlay(): void {
  // intentionally empty
}
