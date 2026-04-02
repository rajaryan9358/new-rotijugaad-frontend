const stripTrailingSlash = (s) => (s || '').toString().replace(/\/+$/, '');

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
		'';

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
