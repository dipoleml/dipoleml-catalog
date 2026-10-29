// Theatre helpers for the extract route — pure, so they unit-test without Next.
//
// The Theatre is opt-in: a request only gets live `frame` events when it asks
// for them, so every existing token-only consumer of /api/extract is untouched.

// Screencast caps for the hosted demo: short, throttled, downscaled. Keeps the
// per-run egress bounded regardless of how slow a target site is.
export const THEATRE_SCREENCAST_OPTS = {
  fps: 6,
  quality: 50,
  maxWidth: 1100,
  maxHeight: 700,
  maxFrames: 180,
  maxDurationMs: 30_000,
};

/**
 * Did this request opt into the Theatre? Accepts either a JSON body flag
 * (`{ theatre: true }`) or a query param (`?theatre=1`).
 * @param {object|null} body  parsed request body
 * @param {URL|string|null} [reqUrl]  the request URL (for the query param)
 */
export function wantsTheatre(body, reqUrl) {
  if (body && (body.theatre === true || body.theatre === 1 || body.theatre === '1')) {
    return true;
  }
  if (reqUrl) {
    try {
      const u = typeof reqUrl === 'string' ? new URL(reqUrl) : reqUrl;
      const v = u.searchParams.get('theatre');
      if (v === '1' || v === 'true') return true;
    } catch {
      /* not a parseable URL — ignore */
    }
  }
  return false;
}

/**
 * Shape a captured screencast frame into the NDJSON event the client renders.
 * Kept tiny and pure so the wire format has one source of truth.
 */
export function frameEvent(frame) {
  return {
    type: 'frame',
    seq: frame.seq,
    t: frame.t,
    data: frame.data,
    ...(frame.width ? { w: frame.width } : {}),
    ...(frame.height ? { h: frame.height } : {}),
  };
}
