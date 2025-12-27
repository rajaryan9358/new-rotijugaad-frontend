import React, { useEffect, useState } from 'react';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import LogsAction from '../../components/LogsAction';
import { getSidebarState, saveSidebarState } from '../../utils/stateManager';
import { getStories, deleteStory, updateStoriesSequence } from '../../api/storiesApi';
import logsApi from '../../api/logsApi';
import StoryForm from '../../components/Forms/StoryForm';
import '../Masters/MasterPage.css';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';

export default function StoriesManagement() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [stories, setStories] = useState([]);
  const [message, setMessage] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [userTypeFilter, setUserTypeFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState('id');
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilterPanel, setShowFilterPanel] = useState(false);
  const [draftFilters, setDraftFilters] = useState({ userTypeFilter: '' });
  const [draggedItem, setDraggedItem] = useState(null); // NEW: track dragged row index

  const canViewStories = hasPermission(PERMISSIONS.STORIES_VIEW);
  const canManageStories = hasPermission(PERMISSIONS.STORIES_MANAGE);
  const canDeleteStories = hasPermission(PERMISSIONS.STORIES_DELETE);
  const canExportStories = hasPermission(PERMISSIONS.STORIES_EXPORT);

  const chipBaseStyle = {
    display:'inline-flex', alignItems:'center', gap:'6px',
    background:'#e0edff', color:'#1d4ed8', padding:'6px 10px',
    fontSize:'12px', borderRadius:'20px', border:'1px solid #bfdbfe',
    boxShadow:'0 1px 2px rgba(37,99,235,0.15)', fontWeight:600
  };
  const chipCloseStyle = {
    background:'transparent', border:'none', color:'#1d4ed8',
    cursor:'pointer', width:'18px', height:'18px', lineHeight:'16px',
    borderRadius:'50%', fontSize:'12px', display:'flex',
    alignItems:'center', justifyContent:'center'
  };

  const buildQueryParams = React.useCallback(() => ({
    page: currentPage,
    limit: pageSize,
    search: searchTerm.trim() || undefined,
    sortField,
    sortDir,
    user_type: userTypeFilter || undefined
  }), [currentPage, pageSize, searchTerm, sortField, sortDir, userTypeFilter]);

  const load = React.useCallback(async () => {
    if (!canViewStories) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await getStories(buildQueryParams());
      const payload = res.data || {};
      const rows = Array.isArray(payload.data) ? payload.data : [];
      setStories(rows);
      setTotalCount(payload.meta?.total ?? rows.length);
      setTotalPages(payload.meta?.totalPages ?? 1);
    } catch (e) {
      setStories([]);
      setTotalCount(0);
      setTotalPages(1);
      setMessage({ type: 'error', text: e.response?.data?.message || 'Failed to load stories' });
    } finally {
      setLoading(false);
    }
  }, [canViewStories, buildQueryParams]);

  useEffect(() => { setSidebarOpen(getSidebarState()); }, []);
  useEffect(() => { load(); }, [load]);

  const handleMenuClick = () => {
    const next = !sidebarOpen;
    setSidebarOpen(next);
    saveSidebarState(next);
  };

  const toggleFilterPanel = () => {
    if (showFilterPanel) return setShowFilterPanel(false);
    setDraftFilters({ userTypeFilter });
    setShowFilterPanel(true);
  };
  const applyFilters = () => {
    setUserTypeFilter(draftFilters.userTypeFilter);
    setCurrentPage(1);
    setShowFilterPanel(false);
  };
  const clearFilters = () => {
    setUserTypeFilter('');
    setDraftFilters({ userTypeFilter: '' });
    setSortField('id');
    setSortDir('asc');
    setCurrentPage(1);
    setShowFilterPanel(false);
  };
  const removeChip = (key) => {
    if (key === 'search') setSearchTerm('');
    if (key === 'user_type') setUserTypeFilter('');
    setCurrentPage(1);
  };

  const buildExportFilename = () => {
    const pad = (val) => String(val).padStart(2, '0');
    const now = new Date();
    const dd = pad(now.getDate());
    const MM = pad(now.getMonth() + 1);
    const yyyy = now.getFullYear();
    let hours = now.getHours();
    const suffix = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const hh = pad(hours);
    const mm = pad(now.getMinutes());
    const ss = pad(now.getSeconds());
    return `stories_${dd}-${MM}-${yyyy}_${hh}_${mm}_${ss}_${suffix}_.csv`;
  };

  const formatExportDateTime = (value) => {
    if (!value) return '';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`.trim();
    } catch {
      return '';
    }
  };

  const exportToCSV = async () => {
    if (!canExportStories) {
      setMessage({ type: 'error', text: 'You do not have permission to export stories.' });
      return;
    }
    const baseParams = { ...buildQueryParams(), page: 1 };
    const exportRows = [];
    let page = 1;
    let totalRecords = null;
    let totalPagesFromServer = null;
    const requestedLimit = baseParams.limit || pageSize || 25;

    try {
      while (true) {
        const res = await getStories({ ...baseParams, page });
        const payload = res.data || {};
        const batch = Array.isArray(payload.data) ? payload.data : [];
        exportRows.push(...batch);

        const meta = payload.meta || {};
        if (typeof meta.total === 'number') totalRecords = meta.total;
        if (typeof meta.totalPages === 'number') totalPagesFromServer = meta.totalPages;
        const serverLimit = meta.limit || requestedLimit || batch.length || 1;

        const shouldContinue = (() => {
          if (totalRecords !== null) return exportRows.length < totalRecords;
          if (totalPagesFromServer !== null) return page < totalPagesFromServer;
          return batch.length === serverLimit;
        })();

        if (!shouldContinue) break;
        page += 1;
      }
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to export stories' });
      return;
    }

    if (!exportRows.length) {
      setMessage({ type: 'error', text: 'No stories found for current filters.' });
      return;
    }

    const headers = ['ID','User Type','Title (EN)','Title (HI)','Sequence','Active','Expiry','Created At','Image URL'];
    const escape = (value) => {
      if (value === null || value === undefined) return '';
      const str = String(value);
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };
    const rows = exportRows.map((story) => [
      story.id,
      story.user_type || '',
      story.title_english || '',
      story.title_hindi || '',
      story.sequence ?? '',
      story.is_active ? 'Active' : 'Inactive',
      formatExportDateTime(story.expiry_at),
      formatExportDateTime(story.created_at),
      story.image || ''
    ]);
    const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = buildExportFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    try {
      await logsApi.create({
        category: 'stories',
        type: 'export',
        log_text: `Exported stories (${exportRows.length})`,
        redirect_to: '/stories'
      });
    } catch (e) {
      // ignore logging failures
    }
  };

  const headerClick = (f) => {
    if (sortField === f) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(f); setSortDir('asc'); }
    setCurrentPage(1);
  };
  const ind = (f) => sortField === f ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  const activeFilterCount = [searchTerm.trim(), userTypeFilter].filter(Boolean).length;
  const pageSummary = totalCount > 0
    ? { start: Math.min((currentPage - 1) * pageSize + 1, totalCount), end: Math.min((currentPage - 1) * pageSize + stories.length, totalCount) }
    : { start: 0, end: 0 };

  const handleEdit = (id) => { setEditingId(id); setShowForm(true); };
  const handleDelete = async (id) => {
    if (!canDeleteStories) {
      setMessage({ type: 'error', text: 'You do not have permission to delete stories.' });
      return;
    }
    if (!window.confirm('Delete this story?')) return;
    try {
      await deleteStory(id);
      setMessage({ type: 'success', text: 'Story deleted' });
      await load();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.message || (e.response?.status === 404 ? 'Story not found' : 'Delete failed') });
    }
  };
  const handleFormClose = () => {
    setShowForm(false);
    setEditingId(null);
    load();
  };

  // NEW: drag & drop handlers (same pattern as States / VacancyNumbers)
  const handleDragStart = (e, index) => {
    if (!canManageStories) return;
    setDraggedItem(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, dropIndex) => {
    e.preventDefault();
    if (!canManageStories) return;
    if (draggedItem === null || draggedItem === dropIndex) {
      setDraggedItem(null);
      return;
    }

    try {
      const newStories = [...stories];
      const draggedStory = newStories[draggedItem];
      newStories.splice(draggedItem, 1);
      newStories.splice(dropIndex, 0, draggedStory);

      const updated = newStories.map((story, idx) => ({
        ...story,
        sequence: idx + 1,
      }));

      setStories(updated);
      setDraggedItem(null);

      await updateStoriesSequence(
        updated.map((s) => ({ id: s.id, sequence: s.sequence }))
      );
      setMessage({ type: 'success', text: 'Sequence updated successfully' });
    } catch (error) {
      console.error('Error updating stories sequence:', error);
      setMessage({ type: 'error', text: 'Failed to update sequence' });
      load(); // revert to server state
    }
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  if (!canViewStories) {
    return (
      <div className="dashboard-container">
        <Header onMenuClick={handleMenuClick} />
        <div className="dashboard-content">
          <Sidebar isOpen={sidebarOpen} />
          <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
            <div className="content-wrapper">
              <div className="inline-message error">You do not have permission to view stories.</div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={handleMenuClick} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className={`main-content ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
          <div className="content-wrapper">
            {message && (
              <div className={`inline-message ${message.type === 'error' ? 'error' : 'success'}`} style={{ marginBottom: '12px' }}>
                {message.text}
                <button className="msg-close" onClick={() => setMessage(null)} style={{ marginLeft: '8px' }}>✕</button>
              </div>
            )}

            {!showForm ? (
              <>
                <div className="list-header">
                  <h1>Stories</h1>
                  {canManageStories && (
                    <button className="btn-primary small" onClick={() => { setEditingId(null); setShowForm(true); }}>
                      + Add Story
                    </button>
                  )}
                </div>

                <div className="search-filter-row" style={{ marginBottom:'10px', display:'flex', alignItems:'center', gap:'16px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:'8px', flex:'1 1 auto' }}>
                    <label htmlFor="stories-search" style={{ fontSize:'12px', fontWeight:600 }}>Search:</label>
                    <input
                      id="stories-search"
                      type="text"
                      className="state-filter-select"
                      value={searchTerm}
                      onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                      placeholder="id, title..."
                      style={{ maxWidth:'260px' }}
                    />
                  </div>
                  <div style={{ marginLeft:'auto', display:'flex', gap:'8px' }}>
                    <button className="btn-secondary btn-small" onClick={toggleFilterPanel}>
                      Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                    </button>
                    <LogsAction
                      category="stories"
                      title="Story Logs"
                      buttonLabel="Logs"
                      buttonClassName="btn-small"
                    />
                    {canExportStories && (
                      <button className="btn-secondary btn-small" onClick={exportToCSV}>
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>

                <div className="applied-filters" style={{ marginBottom:'12px', display:'flex', flexWrap:'wrap', gap:'8px', padding:'10px 12px', border:'1px solid #e2e8f0', background:'#fff', borderRadius:'10px', boxShadow:'0 2px 4px rgba(0,0,0,0.06)' }}>
                  {searchTerm && (
                    <span className="badge chip" style={chipBaseStyle}>
                      Search: {searchTerm}
                      <button style={chipCloseStyle} onClick={() => removeChip('search')}>×</button>
                    </span>
                  )}
                  {userTypeFilter && (
                    <span className="badge chip" style={chipBaseStyle}>
                      User Type: {userTypeFilter}
                      <button style={chipCloseStyle} onClick={() => removeChip('user_type')}>×</button>
                    </span>
                  )}
                  {!activeFilterCount && <span style={{ fontSize:'12px', color:'#64748b' }}>No filters applied</span>}
                </div>

                {showFilterPanel && (
                  <div className="filter-panel" style={{ marginBottom:'16px', padding:'16px', border:'1px solid #ddd', borderRadius:'8px', background:'#f8fafc' }}>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'16px' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                        <label className="filter-label">User Type</label>
                        <select
                          className="state-filter-select"
                          value={draftFilters.userTypeFilter}
                          onChange={e => setDraftFilters(f => ({ ...f, userTypeFilter: e.target.value }))}
                        >
                          <option value="">All</option>
                          <option value="employee">Employee</option>
                          <option value="employer">Employer</option>
                        </select>
                      </div>
                    </div>
                    <div className="filter-actions" style={{ marginTop:'18px', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                      <button className="btn-primary btn-small" onClick={applyFilters}>Apply</button>
                      <button className="btn-secondary btn-small" onClick={clearFilters}>Clear</button>
                      <button className="btn-secondary btn-small" onClick={() => setShowFilterPanel(false)}>Close</button>
                    </div>
                  </div>
                )}

                <div className="table-container" style={{ overflowX:'auto' }}>
                  <table className="data-table draggable">
                    <thead>
                      <tr>
                        <th className="drag-handle"></th> {/* NEW drag handle column */}
                        <th onClick={() => headerClick('id')} style={{ cursor:'pointer' }}>ID{ind('id')}</th>
                        <th onClick={() => headerClick('user_type')} style={{ cursor:'pointer' }}>User Type{ind('user_type')}</th>
                        <th onClick={() => headerClick('title_english')} style={{ cursor:'pointer' }}>Title (EN){ind('title_english')}</th>
                        <th onClick={() => headerClick('title_hindi')} style={{ cursor:'pointer' }}>Title (HI){ind('title_hindi')}</th>
                        <th>Image</th>
                        <th onClick={() => headerClick('sequence')} style={{ cursor:'pointer' }}>Seq{ind('sequence')}</th>
                        <th onClick={() => headerClick('is_active')} style={{ cursor:'pointer' }}>Active{ind('is_active')}</th>
                        <th onClick={() => headerClick('expiry_at')} style={{ cursor:'pointer' }}>Expiry{ind('expiry_at')}</th>
                        <th onClick={() => headerClick('created_at')} style={{ cursor:'pointer' }}>Created At{ind('created_at')}</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr><td colSpan="11">Loading...</td></tr>
                      ) : stories.length ? (
                        stories.map((s, index) => (
                          <tr
                            key={s.id}
                            draggable={canManageStories}
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, index)}
                            onDragEnd={handleDragEnd}
                            className={`draggable-row ${draggedItem === index ? 'dragging' : ''}`}
                          >
                            <td className="drag-handle">
                              <span className="drag-icon">⋮⋮</span>
                            </td>
                            <td>{s.id}</td>
                            <td>{s.user_type || '-'}</td>
                            <td>{s.title_english || '-'}</td>
                            <td>{s.title_hindi || '-'}</td>
                            <td>{s.image ? <img src={s.image} alt="" style={{ width:48, height:48, objectFit:'cover', borderRadius:6, border:'1px solid #eee' }} /> : '-'}</td>
                            <td>{s.sequence ?? 0}</td>
                            <td><span className={`badge ${s.is_active ? 'active' : 'inactive'}`}>{s.is_active ? 'Active' : 'Inactive'}</span></td>
                            <td>{s.expiry_at ? new Date(s.expiry_at).toLocaleDateString() : '-'}</td>
                            <td>{s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'}</td>
                            <td>
                              {canManageStories && (
                                <button className="btn-small btn-edit" onClick={() => handleEdit(s.id)} style={{ marginRight:'4px' }}>Edit</button>
                              )}
                              {canDeleteStories && (
                                <button className="btn-small btn-delete" onClick={() => handleDelete(s.id)}>Delete</button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr><td colSpan="11">No stories found</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalCount > 0 && (
                  <div className="pagination-bar" style={{ marginTop:'16px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'12px' }}>
                    <span style={{ fontSize:'12px', color:'#475569' }}>
                      Showing {pageSummary.start}-{pageSummary.end} of {totalCount}
                    </span>
                    <div style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                      <label style={{ fontSize:'12px', color:'#475569' }}>Rows per page:</label>
                      <select
                        className="state-filter-select"
                        value={pageSize}
                        onChange={(e) => {
                          const next = parseInt(e.target.value, 10) || 25;
                          setPageSize(next);
                          setCurrentPage(1);
                        }}
                      >
                        {[10,25,50,100].map(size => <option key={size} value={size}>{size}</option>)}
                      </select>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                      <button className="btn-secondary btn-small" disabled={currentPage === 1} onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>
                        Previous
                      </button>
                      <span style={{ fontSize:'12px', fontWeight:600 }}>Page {currentPage} of {totalPages}</span>
                      <button className="btn-secondary btn-small" disabled={currentPage === totalPages} onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <StoryForm
                storyId={editingId}
                onClose={() => handleFormClose()}
                onSuccess={(msg) => setMessage({ type:'success', text: msg || 'Saved' })}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
