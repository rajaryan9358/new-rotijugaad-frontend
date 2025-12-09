const TRANSLATE_ENDPOINT = process.env.REACT_APP_TRANSLATE_ENDPOINT || '/api/translate';

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
