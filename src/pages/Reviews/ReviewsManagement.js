import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom'; // CHANGED
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import { reviewsApi } from '../../api/reviews';
import logsApi from '../../api/logsApi';
import '../Masters/MasterPage.css';

const FilterField = ({ label, children }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
    <span style={{ fontSize: '13px', fontWeight: 600 }}>{label}</span>
    {children}
  </div>
);

const headerCellStyle = { cursor: 'pointer' };
const INITIAL_FILTERS = Object.freeze({
  user_type: '',
  rating: '',
  read: 'all',
  search: '',
});
const INITIAL_PANEL_FILTERS = Object.freeze({
  user_type: '',
  rating: '',
  read: 'all',
});

export default function ReviewsManagement() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);
  const [filters, setFilters] = useState(() => ({ ...INITIAL_FILTERS }));
  const [draftFilters, setDraftFilters] = useState(() => ({ ...INITIAL_PANEL_FILTERS }));
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [sortField, setSortField] = useState('updated_at');
  const [sortDir, setSortDir] = useState('desc');
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const canViewReviews = hasPermission(PERMISSIONS.REVIEWS_VIEW);
  const canManageReviews = hasPermission(PERMISSIONS.REVIEWS_MANAGE);
  const canExportReviews = hasPermission(PERMISSIONS.REVIEWS_EXPORT);

  useEffect(() => {
    if (!canViewReviews) return;
    setSidebarOpen(getSidebarState());
  }, [canViewReviews]);

  const queryFilters = useMemo(() => {
    const params = {
      sort_by: sortField,
      sort_dir: sortDir,
    };
    if (filters.user_type) params.user_type = filters.user_type;
    if (filters.rating) params.rating = Number(filters.rating);
    if (filters.read === 'read') params.is_read = true;
    if (filters.read === 'unread') params.is_read = false;
    if (filters.search.trim()) params.search = filters.search.trim();
    return params;
  }, [filters, sortField, sortDir]);

  const resetPage = () => setPagination((prev) => ({ ...prev, page: 1 }));
  const updateFilters = (updater) => {
    setFilters((prev) => (typeof updater === 'function' ? updater(prev) : updater));
    resetPage();
  };
  const applyFilterChange = (key, value) => updateFilters((prev) => ({ ...prev, [key]: value }));
  const openFilters = () => {
    if (showFilterPanel) {
      setShowFilterPanel(false);
      return;
    }
    setDraftFilters({
      user_type: filters.user_type,
      rating: filters.rating,
      read: filters.read,
    });
    setShowFilterPanel(true);
  };
  const applyDraftFilters = () => {
    updateFilters((prev) => ({ ...prev, ...draftFilters }));
    setShowFilterPanel(false);
  };
  const clearFilters = () => {
    setDraftFilters({ ...INITIAL_PANEL_FILTERS });
    updateFilters({ ...INITIAL_FILTERS });
    setSortField('updated_at');
    setSortDir('desc');
    setShowFilterPanel(false);
  };
  const removeFilterChip = (key) => {
    const map = {
      search: () => applyFilterChange('search', ''),
      user_type: () => updateFilters((prev) => ({ ...prev, user_type: '' })),
      rating: () => updateFilters((prev) => ({ ...prev, rating: '' })),
      read: () => updateFilters((prev) => ({ ...prev, read: 'all' })),
    };
    map[key]?.();
  };
  const handleHeaderClick = (field) => {
    if (!['id', 'rating', 'updated_at'].includes(field)) return;
    const nextDir = sortField === field && sortDir === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortDir(nextDir);
    resetPage();
  };
  const ind = (field) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '');
  const chipBaseStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    background: '#e0edff',
    color: '#1d4ed8',
    padding: '6px 10px',
    fontSize: '12px',
    borderRadius: '20px',
    border: '1px solid #bfdbfe',
    boxShadow: '0 1px 2px rgba(37,99,235,0.15)',
    fontWeight: 600,
  };
  const chipCloseStyle = {
    background: 'transparent',
    border: 'none',
    color: '#1d4ed8',
    cursor: 'pointer',
    width: '18px',
    height: '18px',
    lineHeight: '16px',
    borderRadius: '50%',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
  const filterPanelGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '20px',
    width: '100%',
  };
  const fullWidthSelectStyle = { width: '100%', minWidth: 0 };
  const activeFilterCount = [
    filters.user_type,
    filters.rating,
    filters.search.trim(),
    filters.read !== 'all' ? filters.read : '',
  ].filter(Boolean).length;

  const fetchReviews = useCallback(async () => {
    if (!canViewReviews) return;
    setLoading(true);
    try {
      const params = { ...queryFilters, page: pagination.page, limit: pagination.limit };
      const response = await reviewsApi.list(params);
      const payload = response.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      const meta = payload.meta || {};
      const total = meta.total ?? rows.length;
      const incomingLimit = meta.limit ?? params.limit;
      const totalPages = meta.totalPages ?? Math.max(Math.ceil(total / incomingLimit) || 1, 1);
      if (totalPages > 0 && params.page > totalPages) {
        setPagination((prev) => ({ ...prev, page: totalPages }));
        return;
      }
      if (total === 0 && params.page !== 1) {
        setPagination((prev) => ({ ...prev, page: 1 }));
        return;
      }
      setReviews(rows);
      setPagination((prev) => ({
        ...prev,
        page: meta.page ?? params.page,
        limit: incomingLimit,
        total,
        totalPages,
      }));
      setMessage((prev) => (prev?.type === 'success' ? prev : null));
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to load reviews' });
    } finally {
      setLoading(false);
    }
  }, [queryFilters, pagination.page, pagination.limit, canViewReviews]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const handlePageChange = (direction) => {
    setPagination((prev) => {
      const next = prev.page + direction;
      if (next < 1 || next > Math.max(1, prev.totalPages)) return prev;
      return { ...prev, page: next };
    });
  };

  const handleLimitChange = (value) => {
    setPagination((prev) => ({ ...prev, limit: Number(value), page: 1 }));
  };

  const handleResetFilters = () => {
    setFilters({ user_type: '', rating: '', read: 'all', search: '' });
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  const handleExportCsv = async () => {
    if (!canExportReviews) {
      setMessage({ type: 'error', text: 'You do not have permission to export reviews.' });
      return;
    }
    try {
      const response = await reviewsApi.exportCsv(queryFilters);
      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reviews.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      // audit log: export
      const exportParts = [];
      if (filters.user_type) exportParts.push(`user_type=${filters.user_type}`);
      if (filters.rating) exportParts.push(`rating=${filters.rating}`);
      if (filters.read && filters.read !== 'all') exportParts.push(`read=${filters.read}`);
      if (filters.search.trim()) exportParts.push(`search=${filters.search.trim()}`);

      logsApi
        .create({
          category: 'reviews',
          type: 'export',
          redirect_to: '/reviews',
          log_text: `Exported reviews CSV${exportParts.length ? ` (${exportParts.join(', ')})` : ''}`,
        })
        .catch(() => {});
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to export reviews' });
    }
  };

  const handleMarkRead = async (id) => {
    if (!canManageReviews) {
      setMessage({ type: 'error', text: 'You do not have permission to update reviews.' });
      return;
    }
    const review = reviews.find((r) => r.id === id);
    if (!review || review.read_at) return;
    try {
      await reviewsApi.markRead(id);
      setMessage({ type: 'success', text: 'Review marked as read' });
      fetchReviews();
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to update review' });
    }
  };

  const hasReviews = reviews.length > 0;
  const perPage = pagination.limit || 20;
  const totalPages = Math.max(pagination.totalPages || 1, 1);
  const safePage = Math.min(pagination.page, totalPages);
  const pageSummary = pagination.total && hasReviews
    ? { from: ((safePage - 1) * perPage) + 1, to: ((safePage - 1) * perPage) + reviews.length, total: pagination.total }
    : { from: 0, to: 0, total: pagination.total || 0 };
  const showActions = canManageReviews;
  const columnsCount = showActions ? 8 : 7;

  const stats = useMemo(() => {
    const total = pagination.total;
    const unread = reviews.filter((r) => !r.read_at).length;
    const average = reviews.length
      ? (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
      : '0.0';
    return [
      { label: 'Total Reviews', value: total },
      { label: 'Unread (page)', value: unread },
      { label: 'Avg Rating (page)', value: average },
    ];
  }, [reviews, pagination.total]);

  if (!canViewReviews) {
    return (
      <div className="dashboard-container">
        <Header
          onMenuClick={() => setSidebarOpen((o) => !o)}
          onLogout={() => {
            localStorage.clear();
            navigate('/login');
          }}
        />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content reviews-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view reviews.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header
        onMenuClick={handleMenuClick}
        onLogout={() => {
          localStorage.clear();
          navigate('/login');
        }}
      />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content reviews-management-page ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type}`} style={{ marginBottom: '16px' }}>
                {message.text}
              </div>
            )}
            <div className="list-header">
              <h1>Reviews</h1>
            </div>
            <div className="search-filter-row" style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 auto' }}>
                <label htmlFor="reviews-search" style={{ fontSize: '12px', fontWeight: 600 }}>Search:</label>
                <input
                  id="reviews-search"
                  type="text"
                  className="state-filter-select"
                  value={filters.search}
                  onChange={(e) => applyFilterChange('search', e.target.value)}
                  placeholder="id, reviewer, review text..."
                  style={{ maxWidth: '260px' }}
                />
              </div>
              <div style={{ flex: '0 0 auto', display: 'flex', gap: '8px' }}>
                <button className="btn-secondary btn-small" onClick={openFilters}>
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                {canExportReviews && (
                  <button className="btn-secondary btn-small" style={{ marginRight: 0 }} onClick={handleExportCsv}>
                    Export CSV
                  </button>
                )}
                <LogsAction
                  category="reviews"
                  title="Reviews Logs"
                  baseButtonClassName="btn-secondary"
                  sizeClassName="btn-small"
                  buttonStyle={{ marginRight: 0 }}
                />
              </div>
            </div>
            <div className="applied-filters" style={{ marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', border: '1px solid #e2e8f0', background: '#ffffff', borderRadius: '10px', boxShadow: '0 2px 4px rgba(0,0,0,0.06)' }}>
              {filters.search.trim() && (
                <span className="badge chip" style={chipBaseStyle}>
                  Search: {filters.search.trim()}
                  <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('search')}>×</button>
                </span>
              )}
              {filters.user_type && (
                <span className="badge chip" style={chipBaseStyle}>
                  User: {filters.user_type}
                  <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('user_type')}>×</button>
                </span>
              )}
              {filters.rating && (
                <span className="badge chip" style={chipBaseStyle}>
                  Rating: {filters.rating}
                  <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('rating')}>×</button>
                </span>
              )}
              {filters.read !== 'all' && (
                <span className="badge chip" style={chipBaseStyle}>
                  Status: {filters.read === 'read' ? 'Read' : 'Unread'}
                  <button className="chip-close" style={chipCloseStyle} onClick={() => removeFilterChip('read')}>×</button>
                </span>
              )}
              {activeFilterCount === 0 && (
                <span style={{ fontSize: '12px', color: '#64748b' }}>No filters applied</span>
              )}
            </div>
            {showFilterPanel && (
              <div className="filter-panel" style={{ position: 'relative', marginBottom: '16px', padding: '16px', border: '1px solid #ddd', borderRadius: '10px', background: '#f8fafc' }}>
                <div style={filterPanelGridStyle}>
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>User Type</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.user_type}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, user_type: e.target.value }))}
                      style={fullWidthSelectStyle}
                    >
                      <option value="">All</option>
                      <option value="employee">Employee</option>
                      <option value="employer">Employer</option>
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Rating</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.rating}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, rating: e.target.value }))}
                      style={fullWidthSelectStyle}
                    >
                      <option value="">All</option>
                      {[1, 2, 3, 4, 5].map((rating) => (
                        <option key={rating} value={rating}>{rating}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="filter-label" style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600 }}>Read Status</label>
                    <select
                      className="state-filter-select"
                      value={draftFilters.read}
                      onChange={(e) => setDraftFilters((prev) => ({ ...prev, read: e.target.value }))}
                      style={fullWidthSelectStyle}
                    >
                      <option value="all">All</option>
                      <option value="read">Read</option>
                      <option value="unread">Unread</option>
                    </select>
                  </div>
                </div>
                <div className="filter-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn-primary btn-small" onClick={applyDraftFilters}>Apply</button>
                  <button type="button" className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                  <button type="button" className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                </div>
              </div>
            )}
            <div className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '16px' }}>
              {stats.map((stat) => (
                <div key={stat.label} className="data-card" style={{ padding: '12px 16px', textAlign: 'center' }}>
                  <div style={{ fontSize: '12px', color: '#6b7280', textTransform: 'uppercase' }}>{stat.label}</div>
                  <div style={{ fontSize: '24px', fontWeight: 700 }}>{stat.value}</div>
                </div>
              ))}
            </div>
            <div className="table-container">
              <table className="data-table" style={{ minWidth: '1200px' }}>
                <thead>
                  <tr>
                    <th onClick={() => handleHeaderClick('id')} style={{ cursor: 'pointer' }}>ID{ind('id')}</th>
                    <th>User Type</th>
                    <th>Reviewer</th>
                    <th onClick={() => handleHeaderClick('rating')} style={{ cursor: 'pointer' }}>Rating{ind('rating')}</th>
                    <th>Review</th>
                    <th>Status</th>
                    <th onClick={() => handleHeaderClick('updated_at')} style={{ cursor: 'pointer' }}>Updated{ind('updated_at')}</th>
                    {showActions && <th>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columnsCount} className="no-data">Loading...</td>
                    </tr>
                  ) : hasReviews ? (
                    reviews.map((review) => {
                      const reviewerRoute =
                        review.reviewer_route ||
                        (review.user_id
                          ? (review.user_type === 'employee'
                              ? `/employees/${review.user_id}`
                              : `/employers/${review.user_id}`)
                          : null);

                      return (
                        <tr key={review.id}>
                          <td>{review.id}</td>
                          <td style={{ textTransform: 'capitalize' }}>{review.user_type}</td>
                          <td>
                            {reviewerRoute ? (
                              <Link
                                to={reviewerRoute}
                                style={{ color: '#2563eb', textDecoration: 'underline' }}
                              >
                                {review.reviewer_name || '-'}
                              </Link>
                            ) : (
                              review.reviewer_name || '-'
                            )}
                          </td>
                          <td>{review.rating}</td>
                          <td style={{ maxWidth: '360px', whiteSpace: 'normal' }}>{review.review}</td>
                          <td>
                            <span className={`badge ${review.read_at ? 'active' : 'inactive'}`}>
                              {review.read_at ? 'Read' : 'Unread'}
                            </span>
                          </td>
                          <td>{review.updated_at ? new Date(review.updated_at).toLocaleString() : '-'}</td>
                          {showActions && (
                            <td>
                              <button
                                className="btn-small btn-secondary"
                                disabled={!canManageReviews || !!review.read_at}
                                onClick={() => handleMarkRead(review.id)}
                              >
                                {review.read_at ? 'Read' : 'Mark Read'}
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={columnsCount} className="no-data">No reviews found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-footer" style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '12px', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', color: '#475569' }}>
                Showing {pageSummary.from}-{pageSummary.to} of {pageSummary.total}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{ fontSize: '12px', color: '#475569' }}>Rows per page:</label>
                <select className="state-filter-select" value={pagination.limit} onChange={(e) => handleLimitChange(e.target.value)}>
                  {[10, 20, 50, 100].map((size) => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="btn-secondary btn-small" disabled={safePage === 1} onClick={() => handlePageChange(-1)}>
                  Prev
                </button>
                <span style={{ fontSize: '12px', color: '#475569' }}>
                  Page {safePage} of {totalPages}
                </span>
                <button className="btn-secondary btn-small" disabled={safePage === totalPages} onClick={() => handlePageChange(1)}>
                  Next
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
