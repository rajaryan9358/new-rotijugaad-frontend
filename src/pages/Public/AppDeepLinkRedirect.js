import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';

const DEFAULT_SCHEME = 'rotijugaad';

function buildDeepLinkUrl({ pathname, scheme }) {
  const clean = String(pathname || '').replace(/\/+$/, '');
  const parts = clean.split('/').filter(Boolean);

  // Expected paths:
  // /app/jobs/:slug
  // /app/candidates/:slug
  // /app/referral/:code
  if (parts.length < 3 || parts[0] !== 'app') return null;

  const type = parts[1];
  const value = parts.slice(2).join('/');
  if (!value) return null;

  if (type === 'jobs') return `${scheme}://app/jobs/${encodeURIComponent(value)}`;
  if (type === 'candidates') return `${scheme}://app/candidates/${encodeURIComponent(value)}`;
  if (type === 'referral') return `${scheme}://app/referral/${encodeURIComponent(value)}`;

  return null;
}

export default function AppDeepLinkRedirect() {
  const location = useLocation();
  useParams(); // keeps component reactive to param changes
  const scheme = process.env.REACT_APP_DEEPLINK_SCHEME || DEFAULT_SCHEME;

  const appUrl = useMemo(
    () => buildDeepLinkUrl({ pathname: location.pathname, scheme }),
    [location.pathname, scheme]
  );

  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    if (!appUrl) return;

    const t = setTimeout(() => setShowFallback(true), 1200);
    try {
      window.location.replace(appUrl);
    } catch {
      window.location.href = appUrl;
    }

    return () => clearTimeout(t);
  }, [appUrl]);

  if (!appUrl) {
    return (
      <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', padding: 24 }}>
        <h3 style={{ margin: '0 0 12px 0' }}>Invalid link</h3>
        <p style={{ margin: 0 }}>This link is not supported.</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial', padding: 24 }}>
      <h3 style={{ margin: '0 0 12px 0' }}>Opening the app…</h3>
      {showFallback && (
        <a
          href={appUrl}
          style={{ display: 'inline-block', padding: '10px 14px', background: '#111', color: '#fff', textDecoration: 'none', borderRadius: 8 }}
        >
          Open app
        </a>
      )}
    </div>
  );
}
