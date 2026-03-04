'use client';
// validate/page.tsx
// Standalone email validator page
// Left side runs backend checks (format, MX, disposable domain etc)
// Right side runs deeper Ollama AI analysis

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import { validateAPI } from '../../src/services/api';

// some emails to quickly test with
const QUICK_TESTS = [
  'alice@google.com',
  'test@10minutemail.com',
  'bob@nonexistentdomain9999.com',
  'invalid-email',
];

export default function ValidatePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [emailInput, setEmailInput]   = useState('');
  const [isChecking, setIsChecking]   = useState(false);
  const [result, setResult]           = useState(null); // backend validation result
  const [aiResult, setAiResult]       = useState(null); // ollama result
  const [aiLoading, setAiLoading]     = useState(false);

  if (!loading && !user) { router.push('/login'); return null; }

  const runValidation = async (emailToCheck) => {
    const email = (emailToCheck || emailInput).trim();
    if (!email) return;

    setIsChecking(true);
    setResult(null);
    setAiResult(null);

    try {
      const data = await validateAPI.email(email);
      setResult(data);
    } catch (err) {
      // still show a result card with the error
      setResult({ valid: false, error: err.message, checks: {} });
    } finally {
      setIsChecking(false);
    }
  };

  const runOllamaAnalysis = async () => {
    const email = emailInput.trim();
    if (!email) return;
    setAiLoading(true);
    setAiResult(null);
    try {
      const data = await validateAPI.employee({ email });
      setAiResult(data);
    } catch (err) {
      setAiResult({ error: err.message || 'Ollama not reachable. Make sure ollama run llama3 is running.' });
    } finally {
      setAiLoading(false);
    }
  };

  // maps check name to a friendlier label
  const checkLabel = {
    format:           'Email Format',
    mx:               'MX Record Exists',
    mx_record:        'MX Record Exists',
    disposable:       'Disposable Domain',
    domain_reputation: 'Domain Reputation',
    domain_age:       'Domain Age (>6 months)',
    overall:          'Overall',
  };

  const checks = result?.checks || {};

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="page-header">
          <h1 className="page-title">Email Validator</h1>
          <p className="page-subtitle">Check email validity using backend checks and Ollama AI</p>
        </div>

        <div className="grid-2">
          {/* left panel - main validator */}
          <div>
            <div className="card" style={{ marginBottom: 20 }}>
              <div className="card-title">Enter Email Address</div>

              <div style={{ display: 'flex', gap: 10 }}>
                <input className="form-input" type="email"
                  placeholder="someone@company.com"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && runValidation()}
                  style={{ flex: 1 }} />
                <button className="btn btn-primary" onClick={() => runValidation()} disabled={isChecking}>
                  {isChecking && <span className="spinner" style={{ width: 14, height: 14 }} />}
                  {isChecking ? 'Checking...' : 'Validate'}
                </button>
              </div>

              {/* quick test buttons */}
              <div style={{ marginTop: 12 }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6, display: 'block' }}>
                  QUICK TEST EXAMPLES:
                </span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {QUICK_TESTS.map((ex) => (
                    <button key={ex} className="badge badge-info"
                      style={{ cursor: 'pointer', background: 'var(--surface2)', border: '1px solid var(--border)', padding: '4px 10px' }}
                      onClick={() => { setEmailInput(ex); runValidation(ex); }}>
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* validation result */}
            {result && (
              <div className="card">
                {/* overall pass/fail header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: '1.2rem' }}>{result.valid ? 'check' : 'x'}</span>
                  <span style={{ fontWeight: 700, color: result.valid ? 'var(--success)' : 'var(--danger)', fontSize: '1rem' }}>
                    {result.valid ? 'Valid Email' : 'Invalid Email'}
                  </span>
                </div>

                {/* individual check results */}
                {result.error && !result.checks && (
                  <div className="alert alert-danger">{result.error}</div>
                )}

                {Object.entries(checks).map(([key, passed]) => (
                  <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text-dim)' }}>
                      {checkLabel[key] || key}
                    </span>
                    <span className={`badge badge-${passed ? 'success' : 'danger'}`}>
                      {passed ? 'Pass' : 'Fail'}
                    </span>
                  </div>
                ))}

                {/* suggestion from backend */}
                {result.suggestion && (
                  <p style={{ marginTop: 12, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {result.suggestion}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* right panel - ollama deeper analysis */}
          <div className="card" style={{ alignSelf: 'flex-start' }}>
            <div className="card-title">Ollama AI Deep Analysis</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Uses your local Ollama (llama3) to provide additional fraud and domain type analysis.
            </p>

            <button className="btn btn-secondary" onClick={runOllamaAnalysis} disabled={aiLoading || !emailInput}>
              {aiLoading && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {aiLoading ? 'Running...' : 'Run Ollama Analysis'}
            </button>

            {aiResult && (
              <div style={{ marginTop: 16 }}>
                {aiResult.error ? (
                  <div className="alert alert-warning" style={{ fontSize: '0.83rem' }}>{aiResult.error}</div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>AI Confidence Score</span>
                      <strong style={{ color: aiResult.score >= 70 ? 'var(--success)' : aiResult.score >= 40 ? 'var(--warning)' : 'var(--danger)' }}>
                        {aiResult.score}/100
                      </strong>
                    </div>
                    {aiResult.domain_type && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Domain Type</span>
                        <span className="badge badge-info">{aiResult.domain_type}</span>
                      </div>
                    )}
                    {aiResult.suggestion && (
                      <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', marginTop: 8 }}>
                        {aiResult.suggestion}
                      </p>
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