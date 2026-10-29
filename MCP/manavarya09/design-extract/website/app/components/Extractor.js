'use client';

import { useState } from 'react';

export default function Extractor() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const handleExtract = async (e) => {
    e.preventDefault();
    if (!url.trim()) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Extraction failed');
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!result) return;

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();

    for (const [filename, content] of Object.entries(result.files)) {
      zip.file(filename, content);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `designlang-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="extractor">
      <form onSubmit={handleExtract} className="extractor-form">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://vercel.com"
          className="extractor-input"
          disabled={loading}
        />
        <button type="submit" className="extractor-btn" disabled={loading || !url.trim()}>
          {loading ? 'Extracting...' : 'Extract'}
        </button>
      </form>

      {loading && (
        <div className="extractor-loading">
          <div className="extractor-spinner" />
          <p>Launching headless browser, crawling DOM, extracting styles...</p>
          <p className="extractor-loading-sub">This takes 15–30 seconds</p>
        </div>
      )}

      {error && (
        <div className="extractor-error">
          <p>{error}</p>
          <p className="extractor-error-hint">
            Server too slow? Run it locally — it hits different:<br />
            <code>npx designlang {url || 'https://example.com'}</code>
          </p>
        </div>
      )}

      {result && (
        <div className="extractor-results">
          <div className="extractor-results-header">
            <h3>{result.summary.title || result.summary.url}</h3>
            <button onClick={handleDownload} className="extractor-download">
              Download ZIP ({Object.keys(result.files).length} files)
            </button>
          </div>

          <div className="extractor-stats-grid">
            <div className="extractor-stat">
              <div className="extractor-stat-value">{result.summary.colors}</div>
              <div className="extractor-stat-label">Colors</div>
            </div>
            <div className="extractor-stat">
              <div className="extractor-stat-value">{result.summary.spacingCount}</div>
              <div className="extractor-stat-label">Spacing Values</div>
            </div>
            <div className="extractor-stat">
              <div className="extractor-stat-value">{result.summary.shadowCount}</div>
              <div className="extractor-stat-label">Shadows</div>
            </div>
            <div className="extractor-stat">
              <div className="extractor-stat-value">{result.summary.componentCount}</div>
              <div className="extractor-stat-label">Components</div>
            </div>
            <div className="extractor-stat">
              <div className="extractor-stat-value">{result.summary.cssVarCount}</div>
              <div className="extractor-stat-label">CSS Variables</div>
            </div>
            <div className="extractor-stat">
              <div className="extractor-stat-value">
                {result.summary.score ? `${result.summary.score.overall}` : '—'}
              </div>
              <div className="extractor-stat-label">
                Design Score {result.summary.score ? `(${result.summary.score.grade})` : ''}
              </div>
            </div>
          </div>

          {/* Color swatches */}
          {result.summary.colorList && result.summary.colorList.length > 0 && (
            <div className="extractor-section">
              <div className="extractor-section-title">Colors</div>
              <div className="extractor-colors">
                {result.summary.colorList.map((hex, i) => (
                  <div key={i} className="extractor-swatch" title={hex}>
                    <div className="extractor-swatch-color" style={{ backgroundColor: hex }} />
                    <div className="extractor-swatch-hex">{hex}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fonts */}
          {result.summary.fonts && result.summary.fonts !== 'none detected' && (
            <div className="extractor-section">
              <div className="extractor-section-title">Typography</div>
              <div className="extractor-fonts">{result.summary.fonts}</div>
            </div>
          )}

          {/* Accessibility */}
          {result.summary.a11yScore !== null && (
            <div className="extractor-section">
              <div className="extractor-section-title">Accessibility</div>
              <div className="extractor-a11y">
                <span className={`extractor-a11y-score ${result.summary.a11yScore >= 80 ? 'good' : result.summary.a11yScore >= 50 ? 'ok' : 'bad'}`}>
                  {result.summary.a11yScore}% WCAG
                </span>
                {result.summary.a11yFailCount > 0 && (
                  <span className="extractor-a11y-fails">{result.summary.a11yFailCount} failing contrast pairs</span>
                )}
              </div>
            </div>
          )}

          {/* Files list */}
          <div className="extractor-section">
            <div className="extractor-section-title">Output Files</div>
            <div className="extractor-files">
              {Object.entries(result.files).map(([name, content]) => (
                <div key={name} className="extractor-file">
                  <span className="extractor-file-name">{name}</span>
                  <span className="extractor-file-size">
                    {content.length > 1024 ? `${(content.length / 1024).toFixed(1)}KB` : `${content.length}B`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
