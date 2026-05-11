import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function PlacesAutocomplete({ value, onChange, onPlaceSelected, placeholder = 'Search for a location...', id }) {
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dropdownRect, setDropdownRect] = useState(null);
  const debounceRef = useRef(null);
  const suppressRef = useRef(false);
  const inputRef = useRef(null);
  const autocompleteServiceRef = useRef(null);
  const placesServiceRef = useRef(null);

  useEffect(() => {
    if (window.google?.maps?.places) {
      autocompleteServiceRef.current = new window.google.maps.places.AutocompleteService();
      const div = document.createElement('div');
      placesServiceRef.current = new window.google.maps.places.PlacesService(div);
    }
  }, []);

  const updateRect = useCallback(() => {
    if (!inputRef.current) return;
    const r = inputRef.current.getBoundingClientRect();
    setDropdownRect({ top: r.bottom, left: r.left, width: r.width });
  }, []);

  const fetchPredictions = useCallback((input) => {
    if (input.trim().length < 2) { setPredictions([]); setOpen(false); return; }
    if (!autocompleteServiceRef.current) return;
    setLoading(true);
    autocompleteServiceRef.current.getPlacePredictions(
      { input, componentRestrictions: { country: 'in' }, language: 'en' },
      (results, status) => {
        setLoading(false);
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          setPredictions(results);
          updateRect();
          setOpen(true);
        } else {
          setPredictions([]);
          setOpen(false);
        }
      }
    );
  }, [updateRect]);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    onChange(val);
    if (suppressRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 400);
  }, [onChange, fetchPredictions]);

  const handleSelect = useCallback((prediction) => {
    suppressRef.current = true;
    onChange(prediction.description);
    suppressRef.current = false;
    setOpen(false);
    setPredictions([]);

    if (!placesServiceRef.current) return;
    placesServiceRef.current.getDetails(
      { placeId: prediction.place_id, fields: ['formatted_address', 'geometry'] },
      (result, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && result) {
          const address = result.formatted_address || prediction.description;
          const lat = result.geometry.location.lat();
          const lng = result.geometry.location.lng();
          onChange(address);
          onPlaceSelected(address, lat, lng);
        }
      }
    );
  }, [onChange, onPlaceSelected]);

  useEffect(() => {
    const handler = (e) => {
      if (inputRef.current && !inputRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onScroll = () => updateRect();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [open, updateRect]);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if (predictions.length > 0) { updateRect(); setOpen(true); } }}
        placeholder={placeholder}
        autoComplete="off"
        style={{ paddingRight: loading ? 40 : undefined }}
      />
      {loading && (
        <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#999', pointerEvents: 'none' }}>
          …
        </span>
      )}
      {open && predictions.length > 0 && dropdownRect && (
        <ul style={{
          position: 'fixed',
          top: dropdownRect.top,
          left: dropdownRect.left,
          width: dropdownRect.width,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          background: '#fff',
          border: '1px solid #ddd',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 99999,
          maxHeight: 220,
          overflowY: 'auto',
        }}>
          {predictions.map((p, i) => (
            <li
              key={p.place_id || i}
              onMouseDown={(e) => { e.preventDefault(); handleSelect(p); }}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                fontSize: 13,
                borderBottom: i < predictions.length - 1 ? '1px solid #f0f0f0' : 'none',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span style={{ color: '#aaa', fontSize: 14, flexShrink: 0 }}>📍</span>
              <span>{p.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
