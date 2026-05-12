import { useState, useRef, useEffect } from 'react';
import React from 'react';

export function useResizableColumns(storageKey, defaultWidths) {
  const [colWidths, setColWidths] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return { ...defaultWidths, ...JSON.parse(saved) };
    } catch {}
    return { ...defaultWidths };
  });

  const resizeRef = useRef(null);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(colWidths));
  }, [colWidths, storageKey]);

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!resizeRef.current) return;
      const { colKey, startX, startWidth } = resizeRef.current;
      const newWidth = Math.max(40, startWidth + (e.clientX - startX));
      setColWidths(prev => ({ ...prev, [colKey]: newWidth }));
    };
    const onMouseUp = () => {
      if (!resizeRef.current) return;
      resizeRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    return () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const startResize = (colKey, e) => {
    e.preventDefault();
    e.stopPropagation();
    resizeRef.current = { colKey, startX: e.clientX, startWidth: colWidths[colKey] };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  const rHandle = (colKey) => (
    <div
      className="resize-handle"
      onMouseDown={(e) => startResize(colKey, e)}
    />
  );

  return { colWidths, rHandle };
}
