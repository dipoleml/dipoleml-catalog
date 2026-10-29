'use client';

// The left half of the stage: a faux browser chrome wrapping the live frame.
// `frame.data` is a base64 JPEG straight off the CDP screencast, so it paints
// with a plain data: URL — no canvas, no decode dance.

export default function BrowserStage({ url, frame, status, cached, stageLabel }) {
  const streaming = status === 'streaming';
  const host = safeHost(url);

  return (
    <div className={`thtr-stage ${streaming ? 'is-live' : ''}`}>
      <div className="thtr-chrome">
        <span className="thtr-dot" />
        <span className="thtr-dot" />
        <span className="thtr-dot" />
        <div className="thtr-omnibox">
          <span className="thtr-omnibox-lock" aria-hidden>▲</span>
          <span className="thtr-omnibox-host">{host || 'paste a url to begin'}</span>
          {cached && <span className="thtr-omnibox-tag">replay</span>}
        </div>
      </div>

      <div className="thtr-viewport">
        {frame ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="thtr-frame" alt="" src={`data:image/jpeg;base64,${frame.data}`} />
        ) : (
          <div className="thtr-skeleton" aria-hidden>
            <div className="thtr-skeleton-bar" style={{ width: '60%' }} />
            <div className="thtr-skeleton-bar" style={{ width: '85%' }} />
            <div className="thtr-skeleton-bar" style={{ width: '40%' }} />
            <div className="thtr-skeleton-block" />
          </div>
        )}

        {streaming && <div className="thtr-scan" aria-hidden />}

        {streaming && stageLabel && (
          <div className="thtr-readout">
            <span className="thtr-readout-pulse" aria-hidden />
            reading · {stageLabel}
          </div>
        )}
      </div>
    </div>
  );
}

function safeHost(url) {
  if (!url) return '';
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}
