const stripTrailingSlash = (s) => (s || '').toString().replace(/\/+$/, '');

/**
 * Returns the base URL of the public-facing app (not the admin panel).
 * Used for building candidate/job share links.
 * Override with REACT_APP_APP_BASE_URL env var if admin and app are on different domains.
 */
export const getAppBaseUrl = () => {
  const override = (process.env.REACT_APP_APP_BASE_URL || '').trim();
  if (override) return stripTrailingSlash(override);

  // Derive from REACT_APP_API_BASE_URL by stripping the /api suffix
  const apiRaw = (process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_API_URL || '').trim();
  if (apiRaw) {
    try {
      const url = new URL(apiRaw);
      return url.origin;
    } catch (_) { /* fall through */ }
  }

  // Same origin as admin panel
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
};

/**
 * Returns the API base URL for the admin panel.
 *
 * Priority:
 * - REACT_APP_API_BASE_URL
 * - REACT_APP_API_URL
 * - (dev) http://localhost:5001/api
 * - (prod) /api
 *
 * To prevent Mixed Content in production, if the site is loaded over HTTPS and the
 * env points to http://..., we opportunistically upgrade to https://.... If your
 * backend is not available over HTTPS, it must be exposed via HTTPS (e.g. reverse
 * proxy on the same domain) for browsers to allow requests from an HTTPS page.
 */
export const getApiBaseUrl = () => {
	const raw =
		process.env.REACT_APP_API_BASE_URL ||
		process.env.REACT_APP_API_URL ||
		'https://labormint.com/api';

	let baseUrl = stripTrailingSlash(raw);
	if (!baseUrl) {
		baseUrl =
			process.env.NODE_ENV === 'development'
				? 'http://localhost:5001/api'
				: '/api';
	}

	// Avoid mixed-content requests when the app is served over HTTPS.
	if (
		typeof window !== 'undefined' &&
		window.location?.protocol === 'https:' &&
		baseUrl.startsWith('http://')
	) {
		baseUrl = `https://${baseUrl.slice('http://'.length)}`;
	}

	return baseUrl;
};
