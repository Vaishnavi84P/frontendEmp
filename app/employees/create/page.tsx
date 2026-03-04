'use client';
// employees/create/page.tsx
// Form to add a new employee
// Also used for editing when accessed from /employees/[id]
// Runs live email validation as the user types
// Right panel lets you run Ollama AI analysis separately

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/context/AuthContext';
import Sidebar from '../../../src/components/Sidebar';
import { employeeAPI, validateAPI } from '../../../src/services/api';

const DEPARTMENTS = [
  'Engineering', 'Human Resources', 'Sales', 'Marketing', 'Finance',
  'Operations', 'IT Support', 'Legal', 'Product', 'Design',
];

// map fraud_risk value to a display color
const FRAUD_COLORS: Record<string, string> = {
  low:    'var(--success)',
  medium: 'var(--warning)',
  high:   'var(--danger)',
};

export default function CreateEmployeePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // form fields
  const [employeeId, setEmployeeId] = useState('');
  const [name, setName]             = useState('');
  const [email, setEmail]           = useState('');
  const [department, setDepartment] = useState(DEPARTMENTS[0]);

  // validation feedback for the email field
  const [emailStatus, setEmailStatus] = useState<string | null>(null); // null | 'checking' | 'ok' | 'warn' | 'fail'
  const [emailMsg, setEmailMsg]       = useState('');
  const [fraudRisk, setFraudRisk]     = useState('');   // low | medium | high

  // form-level messages
  const [errorMsg, setErrorMsg]         = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ollama panel state
  const [aiResult, setAiResult]   = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // debounce timer ref for email validation
  let emailTimer: ReturnType<typeof setTimeout> | null = null;

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading]);

  // basic email format check - must have exactly one @ with text on both sides
  const isValidEmailFormat = (val: string) => {
    const parts = val.split('@');
    return parts.length === 2 && parts[0].length > 0 && parts[1].includes('.');
  };

  // validate email 600ms after user stops typing
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setEmailStatus(null);
    setEmailMsg('');
    setFraudRisk('');

    if (emailTimer) clearTimeout(emailTimer);

    // show instant red error if format is clearly wrong
    if (val.length > 0 && !isValidEmailFormat(val)) {
      setEmailStatus('fail');
      setEmailMsg('Please enter a valid email address (e.g. john@company.com)');
      return;
    }

    // wait until @ is present before hitting the server
    if (!val.includes('@')) return;

    emailTimer = setTimeout(async () => {
      setEmailStatus('checking');
      try {
        const result = await validateAPI.email(val);
        // backend returns { valid, score, is_disposable, fraud_risk, mx_valid, suggestion }
        setFraudRisk(result.fraud_risk || 'low');

        if (result.valid) {
          setEmailStatus('ok');
          setEmailMsg(result.suggestion || 'Email looks good');
        } else {
          setEmailStatus('warn');
          setEmailMsg(result.suggestion || 'This email did not pass validation');
        }
      } catch {
        setEmailStatus('warn');
        setEmailMsg('Format OK but server validation failed');
      }
    }, 600);
  };

  const handleSubmit = async () => {
    setErrorMsg('');

    // basic required field check
    if (!employeeId || !name || !email || !department) {
      setErrorMsg('All fields are required.');
      return;
    }
    if (name.length < 2) {
      setErrorMsg('Name must be at least 2 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await employeeAPI.create({ employee_id: employeeId, name, email, department });
      router.push('/employees');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create employee.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // runs full Ollama analysis on the current form data
  const runAiAnalysis = async () => {
    if (!email) {
      setAiResult({ error: 'Enter an email first before running AI analysis.' });
      return;
    }
    setAiLoading(true);
    setAiResult(null);
    try {
      // validate/employee sends full record to Ollama for deeper check
      const result = await validateAPI.employee({ employee_id: employeeId, name, email, department });
      setAiResult(result);
    } catch (err: any) {
      setAiResult({ error: err.message || 'Ollama not reachable or model not loaded.' });
    } finally {
      setAiLoading(false);
    }
  };

  // border color for the email input based on validation state
  const emailBorderColor = {
    ok:       'var(--success)',
    warn:     'var(--warning)',
    fail:     'var(--danger)',
    checking: 'var(--accent)',
  }[emailStatus ?? ''] || 'var(--border)';

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        {/* header */}
        <div className="page-header">
          <button className="btn btn-secondary btn-sm"
            onClick={() => router.back()} style={{ marginBottom: 12 }}>
            ← Back
          </button>
          <h1 className="page-title">Add Employee</h1>
          <p className="page-subtitle">Create a new employee record with AI validation</p>
        </div>

        {errorMsg && (
          <div className="alert alert-danger" style={{ marginBottom: 20 }}>⚠ {errorMsg}</div>
        )}

        <div className="grid-2">

          {/* ── LEFT — employee details form ── */}
          <div className="card">
            <div className="card-title">📋 Employee Details</div>

            <div className="form-group">
              <label className="form-label">Employee ID</label>
              <input className="form-input" placeholder="e.g. EMP001"
                value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="John Smith"
                value={name} onChange={(e) => setName(e.target.value)} />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                Letters and spaces only, 2-100 characters.
              </span>
            </div>

            <div className="form-group">
              <label className="form-label">Work Email</label>
              <input className="form-input" type="email" placeholder="john@company.com"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                style={{ borderColor: emailBorderColor }} />

              {/* checking spinner */}
              {emailStatus === 'checking' && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  🔍 Checking email with AI...
                </span>
              )}

              {/* validation result — green=ok, orange=warn, red=fail */}
              {emailStatus && emailStatus !== 'checking' && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    lineHeight: 1.5,
                    borderRadius: 6,
                    border: `1px solid ${
                      emailStatus === 'ok'   ? 'var(--success)' :
                      emailStatus === 'warn' ? 'var(--warning)' :
                                               'var(--danger)'
                    }`,
                    background: `${
                      emailStatus === 'ok'   ? 'var(--success)' :
                      emailStatus === 'warn' ? 'var(--warning)' :
                                               'var(--danger)'
                    }18`,
                    color: emailStatus === 'ok' ? 'var(--success)' :
                           emailStatus === 'warn' ? 'var(--warning)' :
                                                    'var(--danger)'
                  }}
                >
                  {/* icon + message */}
                  <div style={{ marginBottom: fraudRisk && fraudRisk !== 'low' ? 6 : 0 }}>
                    {emailStatus === 'ok' ? '✓' : emailStatus === 'warn' ? '⚠' : '✕'} {emailMsg}
                  </div>

                  {/* fraud risk badge - only show if medium or high */}
                  {fraudRisk && fraudRisk !== 'low' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Fraud Risk:</span>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px',
                        borderRadius: 4, background: FRAUD_COLORS[fraudRisk] + '33',
                        color: FRAUD_COLORS[fraudRisk], textTransform: 'uppercase', letterSpacing: '0.05em'
                      }}>
                        {fraudRisk}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <select className="form-select"
                value={department} onChange={(e) => setDepartment(e.target.value)}>
                {DEPARTMENTS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button className="btn btn-primary" onClick={handleSubmit}
                disabled={isSubmitting} style={{ flex: 1, justifyContent: 'center' }}>
                {isSubmitting && <span className="spinner" style={{ width: 16, height: 16 }} />}
                {isSubmitting ? 'Saving...' : 'Create Employee'}
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/employees')}>
                Cancel
              </button>
            </div>
          </div>

          {/* ── RIGHT — Ollama AI analysis panel ── */}
          <div className="card">
            <div className="card-title">🤖 Ollama AI Analysis</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Run AI-powered analysis on this employee record using your local Ollama model
              to detect fraud signals, data quality issues, and get a department recommendation.
            </p>

            <button className="btn btn-secondary" onClick={runAiAnalysis} disabled={aiLoading}>
              {aiLoading && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {aiLoading ? 'Analysing...' : '⚡ Run AI Analysis'}
            </button>

            {/* AI result panel */}
            {aiResult && (
              <div style={{ marginTop: 16 }}>
                {aiResult.error ? (
                  <div className="alert alert-warning">{aiResult.error}</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                    {/* score row */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI Score</span>
                      <strong style={{
                        color: aiResult.score >= 70 ? 'var(--success)'
                             : aiResult.score >= 40 ? 'var(--warning)'
                             : 'var(--danger)'
                      }}>
                        {aiResult.score}/100
                      </strong>
                    </div>

                    {/* fraud risk row */}
                    {aiResult.fraud_risk && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Fraud Risk</span>
                        <span style={{
                          fontSize: '0.78rem', fontWeight: 600, padding: '2px 10px',
                          borderRadius: 4,
                          background: (FRAUD_COLORS[aiResult.fraud_risk] || 'var(--success)') + '22',
                          color: FRAUD_COLORS[aiResult.fraud_risk] || 'var(--success)',
                          textTransform: 'uppercase'
                        }}>
                          {aiResult.fraud_risk}
                        </span>
                      </div>
                    )}

                    {/* department recommendation row */}
                    {aiResult.department && aiResult.department !== 'Unknown' && (
                      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          Suggested Department
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <strong style={{ color: 'var(--accent)', fontSize: '0.9rem' }}>
                            {aiResult.department}
                          </strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {aiResult.confidence}% confidence
                          </span>
                        </div>
                        {/* department reasoning from Ollama */}
                        {aiResult.reason && (
                          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 6, marginBottom: 0 }}>
                            {aiResult.reason}
                          </p>
                        )}
                      </div>
                    )}

                    {/* email suggestion row */}
                    {aiResult.suggestion && (
                      <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                          💡 AI Suggestion
                        </div>
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: 0 }}>
                          {aiResult.suggestion}
                        </p>
                      </div>
                    )}

                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}