'use client';
// employees/[id]/page.tsx
// Edit an existing employee record
// Pre-fills the form with current data fetched from the backend
// Allows updating name, email, department and manually overriding status

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '../../../src/context/AuthContext';
import Sidebar from '../../../src/components/Sidebar';
import { employeeAPI } from '../../../src/services/api';

const DEPARTMENTS = [
  'Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance',
  'Operations', 'IT Support', 'Legal', 'Product', 'Design',
];

const STATUS_OPTIONS = ['pending', 'validated', 'flagged'];

// color map for status badge preview
const STATUS_COLORS: Record<string, string> = {
  validated: 'var(--success)',
  flagged:   'var(--danger)',
  pending:   'var(--warning)',
};

export default function EditEmployeePage() {
  const { user, loading } = useAuth();
  const router            = useRouter();
  const params            = useParams();
  const employeeId        = params?.id;

  // form fields - pre-filled from backend
  const [name, setName]           = useState('');
  const [email, setEmail]         = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [status, setStatus]       = useState('pending');
  const [reason, setReason]       = useState('');

  // page state
  const [fetching, setFetching]     = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg]     = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [original, setOriginal]     = useState<any>(null);  // original data for comparison

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
  }, [user, loading]);

  // fetch the employee data when the page loads
  useEffect(() => {
    if (!employeeId) return;
    employeeAPI.get(employeeId)
      .then((data: any) => {
        // data could be wrapped or direct
        const emp = data.employee || data;
        setOriginal(emp);
        setName(emp.name       || '');
        setEmail(emp.email     || '');
        setDepartment(emp.department || DEPARTMENTS[0]);
        setStatus(emp.validation_status || 'pending');
      })
      .catch(() => setErrorMsg('Could not load employee data.'))
      .finally(() => setFetching(false));
  }, [employeeId]);

  // save updated employee details
  const handleSave = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!name || name.length < 2) {
      setErrorMsg('Name must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      // update basic info first
      await employeeAPI.update(employeeId, { name, email, department });

      // update status separately if it changed - logs the change for audit trail
      if (status !== original?.validation_status) {
        await employeeAPI.updateStatus(
          employeeId,
          status,
          reason || `Status manually changed to ${status}`
        );
      }

      setSuccessMsg('Employee updated successfully!');
      setOriginal({ ...original, name, email, department, validation_status: status });
    } catch (err: any) {
      setErrorMsg(err.message || 'Update failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading || fetching) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* header */}
        <div className="page-header">
          <button className="btn btn-secondary btn-sm"
            onClick={() => router.push('/employees')} style={{ marginBottom: 12 }}>
            ← Back to Employees
          </button>
          <h1 className="page-title">Edit Employee</h1>
          <p className="page-subtitle">
            Editing record for <strong style={{ color: 'var(--accent)' }}>
              {original?.name || 'Employee'}
            </strong> — ID: {original?.employee_id}
          </p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: 16 }}>⚠ {errorMsg}</div>
        )}
        {successMsg && (
          <div className="alert alert-success" style={{ marginBottom: 16 }}>✓ {successMsg}</div>
        )}

        <div className="grid-2">

          {/* ── LEFT — edit form ── */}
          <div className="card">
            <div className="card-title">📋 Employee Details</div>

            {/* employee ID - read only, cannot be changed */}
            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-input" value={original?.employee_id || ''} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Employee ID cannot be changed after creation.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="John Smith"
                value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input className="form-input" type="email" value={email} disabled
                style={{ opacity: 0.5, cursor: 'not-allowed' }} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Email cannot be changed. Delete and re-add the employee if needed.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select" value={department}
                onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSave}
                disabled={isSubmitting} style={{ flex: 1, justifyContent: 'center' }}>
                {isSubmitting && <span className="spinner" style={{ width: 16, height: 16 }} />}
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
              <button className="btn btn-secondary"
                onClick={() => router.push('/employees')}>
                Cancel
              </button>
            </div>
          </div>

          {/* ── RIGHT — status override panel ── */}
          <div className="card">
            <div className="card-title">🔄 Validation Status</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Override the AI-assigned validation status. This is logged in the audit trail.
            </p>

            {/* current status display */}
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8,
              background: (STATUS_COLORS[status] || 'var(--accent)') + '18',
              border: `1px solid ${STATUS_COLORS[status] || 'var(--accent)'}` }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Current Status</span>
              <div style={{ fontWeight: 700, color: STATUS_COLORS[status], textTransform: 'uppercase',
                letterSpacing: '0.05em', marginTop: 2 }}>
                {status}
              </div>
            </div>

            {/* status selector */}
            <div className="form-group">
              <label className="form-label">Change Status To</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {STATUS_OPTIONS.map((s) => (
                  <button key={s} onClick={() => setStatus(s)}
                    style={{
                      flex: 1, padding: '8px 4px', borderRadius: 6, fontSize: '0.78rem',
                      fontWeight: status === s ? 700 : 400, cursor: 'pointer',
                      border: `1px solid ${STATUS_COLORS[s]}`,
                      background: status === s ? STATUS_COLORS[s] + '33' : 'transparent',
                      color: STATUS_COLORS[s], textTransform: 'capitalize'
                    }}>
                    {s === 'validated' ? '✓' : s === 'flagged' ? '⚑' : '🕐'} {s}
                  </button>
                ))}
              </div>
            </div>

            {/* reason input - shows only if status changed */}
            {status !== original?.validation_status && (
              <div className="form-group" style={{ marginTop: 12 }}>
                <label className="form-label">Reason for change</label>
                <input className="form-input"
                  placeholder="e.g. Verified via company directory"
                  value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            )}

            {/* audit info */}
            <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: 'var(--surface)', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              <div>📅 Created: {original?.created_at
                ? new Date(original.created_at).toLocaleString() : '—'}</div>
              <div style={{ marginTop: 4 }}>
                🏢 Department: {original?.department || '—'}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}