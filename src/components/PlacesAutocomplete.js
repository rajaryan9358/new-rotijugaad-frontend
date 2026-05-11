import React, { useCallback, useEffect, useRef, useState } from 'react';

const API_KEY = 'AIzaSyDkTDMXqZFjCYkpa1QPWCsZocpTlPcXvBk';

/**
 * Google Places autocomplete using the REST API directly.
 * Matches the Flutter PlacesAutocompleteField widget approach.
 */
export default function PlacesAutocomplete({ value, onChange, onPlaceSelected, placeholder = 'Search for a location...', id }) {
  const [predictions, setPredictions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const suppressRef = useRef(false);
  const containerRef = useRef(null);

  const fetchPredictions = useCallback(async (input) => {
    if (input.trim().length < 2) { setPredictions([]); setOpen(false); return; }
    setLoading(true);
    try {
      const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${API_KEY}&language=en&components=country:in`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        setPredictions(data.predictions || []);
        setOpen(true);
      } else {
        setPredictions([]);
        setOpen(false);
      }
    } catch (_) {
      setPredictions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const val = e.target.value;
    onChange(val);
    if (suppressRef.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchPredictions(val), 400);
  }, [onChange, fetchPredictions]);

  const handleSelect = useCallback(async (prediction) => {
    suppressRef.current = true;
    onChange(prediction.description);
    setOpen(false);
    setPredictions([]);
    suppressRef.current = false;

    try {
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${prediction.place_id}&fields=formatted_address,geometry&key=${API_KEY}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.status === 'OK') {
        const result = data.result;
        const address = result.formatted_address || prediction.description;
        const lat = result.geometry.location.lat;
        const lng = result.geometry.location.lng;
        onChange(address);
        onPlaceSelected(address, lat, lng);
      }
    } catch (_) {}
  }, [onChange, onPlaceSelected]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => () => clearTimeout(debounceRef.current), []);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input
        id={id}
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={() => { if (predictions.length > 0) setOpen(true); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {loading && (
        <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#999' }}>
          loading…
        </div>
      )}
      {open && predictions.length > 0 && (
        <ul style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          background: '#fff',
          border: '1px solid #ddd',
          borderTop: 'none',
          borderRadius: '0 0 4px 4px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
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
              <span style={{ color: '#999', fontSize: 14, marginTop: 1 }}>📍</span>
              <span>{p.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
