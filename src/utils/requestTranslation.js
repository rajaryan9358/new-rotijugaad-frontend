import { getApiBaseUrl } from '../api/baseUrl';

// NOTE: every other API call in this app resolves against getApiBaseUrl()
// (e.g. https://labormint.com/api), not a bare relative path — the admin panel
// is not served from the same origin as the backend, so a relative '/api/translate'
// resolves against the admin panel's own hosting origin instead of the API host.
const TRANSLATE_ENDPOINT = process.env.REACT_APP_TRANSLATE_ENDPOINT || `${getApiBaseUrl()}/translate`;

export const requestTranslation = async ({
  text,
  sourceLanguage = 'en',
  targetLanguage = 'hi',
} = {}) => {
  if (!text || !text.trim()) {
    throw new Error('Translation text is required.');
  }

  const response = await fetch(TRANSLATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, sourceLanguage, targetLanguage }),
  });

  if (!response.ok) {
    throw new Error('Translation request failed');
  }

  const data = await response.json();
  return data?.translated_text || '';
};
