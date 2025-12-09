import React, { useEffect, useState, useCallback } from 'react';

/*
Minimal generic data page template:
Props:
  fetchData(): Promise<Array>
  columns: [{ key, label }]
  filters: [{ key, label, type: 'select'|'text', options?:[{value,label}] }]
  searchableKeys: string[]
*/
export default function DataPageTemplate({
  title,
  fetchData,
  columns,
  filters = [],
  searchableKeys = [],
  onAdd,
  renderActions
}) {
  const [raw, setRaw] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValues, setFilterValues] = useState({});
  const [sortField, setSortField] = useState(columns[0]?.key);
  const [sortDir, setSortDir] = useState('asc');

  const apply = useCallback(() => {
    let data = [...raw];
    // filters
    Object.entries(filterValues).forEach(([k, v]) => {
      if (v) data = data.filter(r => {
        const val = (r[k] ?? '').toString().toLowerCase();
        return val === v.toString().toLowerCase();
      });
    });
    // search
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      data = data.filter(r =>
        searchableKeys.some(k => (r[k] ?? '').toString().toLowerCase().includes(s))
      );
    }
    // sort
    data.sort((a, b) => {
      const A = a[sortField];
      const B = b[sortField];
      const norm = v => v === null || v === undefined ? '' : v;
      const nA = norm(A);
      const nB = norm(B);
      if (nA < nB) return sortDir === 'asc' ? -1 : 1;
      if (nA > nB) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    setRows(data);
  }, [raw, filterValues, searchTerm, sortField, sortDir, searchableKeys]);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchData();
      setRaw(data || []);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to load data' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { apply(); }, [apply]);

  const toggleSort = (key) => {
    if (sortField === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(key); setSortDir('asc'); }
  };

  return (
    <div className="data-page-template">
      <div className="list-header">
        <h1>{title}</h1>
        {onAdd && <button className="btn-primary small" onClick={onAdd}>+ Add</button>}
      </div>
      <div className="filter-section" style={{ display:'flex', flexWrap:'wrap', gap:12 }}>
        <div>
          <label>Search:</label>
          <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search..." />
        </div>
        {filters.map(f => (
          <div key={f.key}>
            <label>{f.label}:</label>
            {f.type === 'select' ? (
              <select
                value={filterValues[f.key] || ''}
                onChange={e => setFilterValues(v => ({ ...v, [f.key]: e.target.value }))}
              >
                <option value="">All</option>
                {f.options?.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : (
              <input
                value={filterValues[f.key] || ''}
                onChange={e => setFilterValues(v => ({ ...v, [f.key]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <button
          type="button"
          className="btn-secondary small"
          onClick={() => {
            setFilterValues({});
            setSearchTerm('');
            setSortField(columns[0]?.key);
            setSortDir('asc');
          }}
        >Reset</button>
      </div>
      {message && (
        <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`}>
          {message.text}
        </div>
      )}
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map(col => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col.key)}
                  style={{ cursor:'pointer' }}
                >
                  {col.label}{sortField === col.key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''}
                </th>
              ))}
              {renderActions && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={columns.length + (renderActions ? 1 : 0)}>Loading...</td></tr>
            ) : rows.length ? (
              rows.map(r => (
                <tr key={r.id}>
                  {columns.map(c => <td key={c.key}>{r[c.key] ?? '-'}</td>)}
                  {renderActions && <td>{renderActions(r)}</td>}
                </tr>
              ))
            ) : (
              <tr><td colSpan={columns.length + (renderActions ? 1 : 0)}>No records found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
