
'use client';
// employees/page.tsx
// Shows the full list of employees
// Has search, department filter, pagination and delete confirmation
// Managers can manually override validation status from this page
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import { employeeAPI } from '../../src/services/api';

const DEPARTMENTS = [
  'All', 'Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance',
  'Operations', 'IT Support', 'Legal', 'Product', 'Design',
];

export default function EmployeesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // list data
  const [employees, setEmployees] = useState([]);
  const [fetching, setFetching]   = useState(true);
  const [total, setTotal]         = useState(0);

  // filters
  const [search, setSearch] = useState('');
  const [dept, setDept]     = useState('All');
  const [page, setPage]     = useState(1);
  const PER_PAGE = 10;

  // delete modal
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting]         = useState(false);

  // status override modal
  const [statusTarget, setStatusTarget]   = useState(null);
  const [newStatus, setNewStatus]         = useState('');
  const [statusReason, setStatusReason]   = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);

  // top-level message (success/error)
  const [msg, setMsg] = useState(null);

  // fetch employees whenever filters or page change
  const fetchEmployees = useCallback(async () => {
    setFetching(true);
    try {
      const params = { page, per_page: PER_PAGE };
      if (search) params.search = search;
      if (dept !== 'All') params.department = dept;

      const data = await employeeAPI.list(params);

      // backend might return { employees: [], total: N } or just []
      const list = data.employees || data.items || data || [];
      setEmployees(Array.isArray(list) ? list : []);
      setTotal(data.total || (Array.isArray(list) ? list.length : 0));
    } catch {
      setEmployees([]);
    } finally {
      setFetching(false);
    }
  }, [page, search, dept]);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && user) fetchEmployees();
  }, [user, loading, fetchEmployees]);

  // soft delete - just marks is_active = false on the backend
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await employeeAPI.delete(deleteTarget.id);
      setMsg({ type: 'success', text: `"${deleteTarget.name}" removed successfully.` });
      setDeleteTarget(null);
      fetchEmployees();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message || 'Delete failed.' });
    } finally {
      setDeleting(false);
    }
  };

  // manual status override - manager validates or flags an employee
  const handleStatusUpdate = async () => {
    if (!statusTarget || !newStatus) return;
    setStatusUpdating(true);
    try {
      await employeeAPI.updateStatus(statusTarget.id, newStatus, statusReason);
      setMsg({ type: 'success', text: `${statusTarget.name} marked as "${newStatus}" successfully.` });
      setStatusTarget(null);
      setNewStatus('');
      setStatusReason('');
      fetchEmployees();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message || 'Status update failed.' });
    } finally {
      setStatusUpdating(false);
    }
  };

  // quick validate - instantly marks employee as validated without opening modal
  const quickValidate = async (emp) => {
    try {
      await employeeAPI.updateStatus(emp.id, 'validated', 'Manually validated by manager');
      setMsg({ type: 'success', text: `${emp.name} marked as validated.` });
      fetchEmployees();
    } catch (err) {
      setMsg({ type: 'danger', text: err.message || 'Update failed.' });
    }
  };

  // opens the status override modal for a given employee
  const openStatusModal = (emp) => {
    setStatusTarget(emp);
    setNewStatus(emp.validation_status || 'pending');
    setStatusReason('');
  };

  const totalPages = Math.ceil(total / PER_PAGE);

  // pick a badge color based on validation status
  const statusBadge = (s) => {
    const map = { validated: 'success', flagged: 'danger', pending: 'warning' };
    return <span className={`badge badge-${map[s] || 'info'}`}>{s || 'pending'}</span>;
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* page header */}
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">Employees</h1>
            <p className="page-subtitle">{total} total records</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-secondary" onClick={() => router.push('/validate')}>
              ✉ Validate Email
            </button>
            <button className="btn btn-primary" onClick={() => router.push('/employees/create')}>
              + Add Employee
            </button>
          </div>
        </div>

        {/* success/error message bar */}
        {msg && (
          <div className={`alert alert-${msg.type}`} style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between' }}>
            <span>{msg.text}</span>
            <button onClick={() => setMsg(null)}
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {/* search + filter bar */}
        <div className="card" style={{ marginBottom: 20, padding: '16px 20px' }}>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <div className="search-bar">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
              </svg>
              <input placeholder="Search name or email…" value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <select className="form-select" style={{ width: 'auto', minWidth: 160 }}
              value={dept} onChange={(e) => { setDept(e.target.value); setPage(1); }}>
              {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
            </select>
            <button className="btn btn-secondary btn-sm"
              onClick={() => { setSearch(''); setDept('All'); setPage(1); }}>
              Reset
            </button>
          </div>
        </div>

        {/* employees table */}
        <div className="table-wrapper">
          {fetching ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner" style={{ margin: '0 auto' }} />
            </div>
          ) : employees.length === 0 ? (
            <div className="empty-state">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              <h3>No employees found</h3>
              <p>Try adjusting your search or add a new employee.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp) => (
                  <tr key={emp.id}>
                    <td><span className="badge badge-info">{emp.employee_id}</span></td>
                    <td style={{ fontWeight: 500, color: 'var(--text)' }}>{emp.name}</td>
                    <td style={{ fontSize: '0.82rem' }}>{emp.email}</td>
                    <td><span className="badge badge-purple">{emp.department}</span></td>
                    <td>
                      {/* clicking the status badge opens the override modal */}
                      <span
                        onClick={() => openStatusModal(emp)}
                        style={{ cursor: 'pointer' }}
                        title="Click to change status"
                      >
                        {statusBadge(emp.validation_status)}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      {emp.created_at ? new Date(emp.created_at).toLocaleDateString() : '—'}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <button className="btn btn-secondary btn-sm"
                          onClick={() => router.push(`/employees/${emp.id}`)}>
                          Edit
                        </button>
                        {/* quick status buttons right in the table */}
                        {emp.validation_status !== 'validated' && (
                          <button className="btn btn-sm"
                            title="Mark as validated"
                            style={{ background: 'var(--success)22', color: 'var(--success)', border: '1px solid var(--success)' }}
                            onClick={() => quickValidate(emp)}>
                            ✓
                          </button>
                        )}
                        {emp.validation_status !== 'flagged' && (
                          <button className="btn btn-sm"
                            title="Flag for review"
                            style={{ background: 'var(--danger)22', color: 'var(--danger)', border: '1px solid var(--danger)' }}
                            onClick={() => openStatusModal(emp)}>
                            ⚑
                          </button>
                        )}
                        <button className="btn btn-danger btn-sm"
                          onClick={() => setDeleteTarget(emp)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(1)}>«</button>
            <button className="page-btn" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹</button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              const p = page <= 4 ? i + 1 : page - 3 + i;
              if (p < 1 || p > totalPages) return null;
              return (
                <button key={p} className={`page-btn ${p === page ? 'active' : ''}`}
                  onClick={() => setPage(p)}>{p}</button>
              );
            })}
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>›</button>
            <button className="page-btn" disabled={page === totalPages} onClick={() => setPage(totalPages)}>»</button>
          </div>
        )}

      </main>

      {/* ── STATUS OVERRIDE MODAL ── */}
      {statusTarget && (
        <div className="modal-overlay" onClick={() => setStatusTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">🔄 Update Status</span>
              <button onClick={() => setStatusTarget(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-dim)', marginBottom: 16 }}>
                Updating status for <strong style={{ color: 'var(--text)' }}>{statusTarget.name}</strong>
              </p>

              {/* status selector */}
              <div className="form-group">
                <label className="form-label">New Status</label>
                <select className="form-select" value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="validated">✅ Validated — email and record confirmed</option>
                  <option value="pending">🕐 Pending — awaiting review</option>
                  <option value="flagged">⚑ Flagged — suspicious, needs investigation</option>
                </select>
              </div>

              {/* optional reason */}
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Reason (optional)</label>
                <input className="form-input" placeholder="e.g. Verified via company directory"
                  value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setStatusTarget(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={statusUpdating}>
                {statusUpdating && <span className="spinner" style={{ width: 14, height: 14 }} />}
                {statusUpdating ? 'Updating…' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRMATION MODAL ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">⚠ Confirm Delete</span>
              <button onClick={() => setDeleteTarget(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: 20 }}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--text-dim)' }}>
                Are you sure you want to delete{' '}
                <strong style={{ color: 'var(--text)' }}>{deleteTarget.name}</strong>?
                This cannot be undone.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={handleDelete} disabled={deleting}>
                {deleting && <span className="spinner" style={{ width: 14, height: 14 }} />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}