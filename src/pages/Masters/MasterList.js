import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/Header';
import Sidebar from '../../components/Sidebar';
import { hasPermission, PERMISSIONS } from '../../utils/permissions';
import './MasterList.css';

export default function MasterList({ title, apiEndpoint, columns, onAddNew }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const canViewMasters = hasPermission(PERMISSIONS.MASTERS_VIEW);
  const canManageMasters = hasPermission(PERMISSIONS.MASTERS_MANAGE);
  const canDeleteMasters = hasPermission(PERMISSIONS.MASTERS_DELETE);
  const navigate = useNavigate();

  useEffect(() => {
    if (canViewMasters) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [apiEndpoint, canViewMasters]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock data for now - replace with actual API call
      setData(generateMockData(title));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = (title) => {
    const mockDataMap = {
      'States': [
        { id: 1, name_english: 'Maharashtra', name_hindi: 'महाराष्ट्र', sequence: 1, is_active: true },
        { id: 2, name_english: 'Gujarat', name_hindi: 'गुजरात', sequence: 2, is_active: true },
      ],
      'Skills': [
        { id: 1, skill_english: 'Communication', skill_hindi: 'संचार', sequence: 1, is_active: true },
        { id: 2, skill_english: 'Leadership', skill_hindi: 'नेतृत्व', sequence: 2, is_active: true },
      ],
    };
    return mockDataMap[title] || [];
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const handleDelete = (id) => {
    if (!canDeleteMasters) return;
    if (window.confirm('Are you sure you want to delete this item?')) {
      setData(data.filter(item => item.id !== id));
    }
  };

  const handleEdit = (id) => {
    if (!canManageMasters) return;
    navigate(`/masters/${apiEndpoint}/${id}/edit`);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="dashboard-container">
      <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} onLogout={handleLogout} />
      <div className="dashboard-content">
        <Sidebar isOpen={sidebarOpen} />
        <main className="main-content">
          <div className="content-wrapper">
            {!canViewMasters ? (
              <div className="inline-message error">You do not have permission to view masters.</div>
            ) : (
              <>
                <div className="list-header">
                  <h1>{title}</h1>
                  {canManageMasters && (
                    <button className="btn-primary" onClick={onAddNew}>
                      + Add New
                    </button>
                  )}
                </div>

                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        {columns.map((col, idx) => (
                          <th key={idx}>{col.label}</th>
                        ))}
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.length > 0 ? (
                        data.map((item) => (
                          <tr key={item.id}>
                            {columns.map((col, idx) => (
                              <td key={idx}>
                                {col.key === 'is_active' ? (
                                  <span className={`badge ${item[col.key] ? 'active' : 'inactive'}`}>
                                    {item[col.key] ? 'Active' : 'Inactive'}
                                  </span>
                                ) : (
                                  item[col.key]
                                )}
                              </td>
                            ))}
                            <td>
                              {canManageMasters && (
                                <button className="btn-small btn-edit" onClick={() => handleEdit(item.id)}>
                                  Edit
                                </button>
                              )}
                              {canDeleteMasters && (
                                <button className="btn-small btn-delete" onClick={() => handleDelete(item.id)}>
                                  Delete
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={columns.length + 1} className="no-data">
                            No data found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
