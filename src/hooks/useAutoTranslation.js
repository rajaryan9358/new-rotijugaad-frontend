import { useState, useRef, useCallback } from 'react';
import { requestTranslation } from '../utils/requestTranslation';

export const useAutoTranslation = () => {
  const [translating, setTranslating] = useState(false);
  const lastSourceRef = useRef('');

  const translate = useCallback(
    async (text, opts = {}) => {
      const trimmed = text?.trim();
      if (!trimmed) return '';

      if (!opts.force && trimmed === lastSourceRef.current) {
        return '';
      }

      setTranslating(true);
      try {
        const translated = await requestTranslation({
          text: trimmed,
          sourceLanguage: opts.sourceLanguage,
          targetLanguage: opts.targetLanguage,
        });
        if (translated) {
          lastSourceRef.current = trimmed;
        }
        return translated;
      } finally {
        setTranslating(false);
      }
    },
    [],
  );

  return { translating, translate };
};
