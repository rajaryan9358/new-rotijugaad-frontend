import React, { useEffect, useMemo } from 'react';
import { useLocation, useParams } from 'react-router-dom';

const APP_SCHEME      = process.env.REACT_APP_DEEPLINK_SCHEME || 'rotijugaad';
const ANDROID_PACKAGE = 'com.rotijugaad.app';
const PLAY_STORE_URL  = process.env.REACT_APP_PLAY_STORE_URL  || `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
const IOS_STORE_URL   = process.env.REACT_APP_IOS_STORE_URL   || 'https://apps.apple.com/app/id6787725573';

function buildAppUrl(pathname) {
  const parts = String(pathname || '').replace(/\/+$/, '').split('/').filter(Boolean);
  // parts: ['app', 'jobs'|'candidates'|'referral', slug|code]
  if (parts.length < 3 || parts[0] !== 'app') return null;
  const type  = parts[1];
  const value = parts.slice(2).join('/');
  if (!value) return null;
  if (type === 'jobs')       return `${APP_SCHEME}://app/jobs/${encodeURIComponent(value)}`;
  if (type === 'candidates') return `${APP_SCHEME}://app/candidates/${encodeURIComponent(value)}`;
  if (type === 'referral')   return `${APP_SCHEME}://app/referral/${encodeURIComponent(value)}`;
  return null;
}

// Android Intent URI — Chrome resolves this natively:
//   app installed  → opens app directly
//   not installed  → follows browser_fallback_url (Play Store)
// No ERR_UNKNOWN_URL_SCHEME page, no JS timeout needed.
function buildIntentUrl(appUrl) {
  const withoutScheme = appUrl.replace(/^[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//, '');
  const fallback = encodeURIComponent(PLAY_STORE_URL);
  return `intent://${withoutScheme}#Intent;scheme=${APP_SCHEME};package=${ANDROID_PACKAGE};S.browser_fallback_url=${fallback};end`;
}

export default function AppDeepLinkRedirect() {
  const location = useLocation();
  useParams();

  const appUrl = useMemo(() => buildAppUrl(location.pathname), [location.pathname]);

  useEffect(() => {
    if (!appUrl) return;

    const ua        = navigator.userAgent || '';
    const isIOS     = /iPhone|iPad|iPod/i.test(ua);
    const isAndroid = /Android/i.test(ua);

    if (isAndroid) {
      // Intent URI handles both cases natively — no timeout needed.
      window.location.replace(buildIntentUrl(appUrl));
      return;
    }

    if (isIOS) {
      const start = Date.now();
      window.location.href = appUrl;
      const t = setTimeout(() => {
        // If still visible after 1.5s the app is not installed → go to App Store.
        // Guard: skip if the timer ran late (page was hidden = app opened).
        if (!document.hidden && Date.now() - start < 3000) {
          window.location.replace(IOS_STORE_URL);
        }
      }, 1500);
      return () => clearTimeout(t);
    }

    // Desktop: nothing to open — fall through to store links UI.
  }, [appUrl]);

  const ua        = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const isIOS     = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);
  const isMobile  = isIOS || isAndroid;

  if (!appUrl) {
    return (
      <div style={styles.wrap}>
        <h3 style={styles.h3}>Invalid link</h3>
        <p style={styles.p}>This link is not supported.</p>
      </div>
    );
  }

  return (
    <div style={styles.wrap}>
      <h3 style={styles.h3}>Roti Jugaad</h3>
      <p style={styles.p}>
        {isMobile ? 'Opening the app…' : 'Open this link on your phone to view it in the app.'}
      </p>
      {!isMobile && (
        <div>
          <a href={PLAY_STORE_URL} style={{ ...styles.btn, background: '#1a73e8' }}>
            Get it on Google Play
          </a>
          <a href={IOS_STORE_URL} style={{ ...styles.btn, background: '#000', marginLeft: 8 }}>
            Download on App Store
          </a>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrap: {
    fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    textAlign: 'center',
    background: '#f9fafb',
  },
  h3: { margin: '0 0 8px 0', fontSize: 20, color: '#111' },
  p:  { margin: '0 0 24px 0', color: '#6b7280', fontSize: 15 },
  btn: {
    display: 'inline-block',
    padding: '12px 20px',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: 10,
    fontWeight: 600,
    fontSize: 15,
  },
};
