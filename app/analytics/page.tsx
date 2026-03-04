'use client';
// analytics/page.tsx
// Analytics dashboard - shows charts and an AI-generated executive summary
// Data comes from /api/v1/analytics/dashboard and /api/v1/analytics/insights

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import { analyticsAPI } from '../../src/services/api';

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats]       = useState(null);
  const [insights, setInsights] = useState(null);
  const [fetching, setFetching] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && user) {
      analyticsAPI.dashboard()
        .then(setStats)
        .catch(() => {})
        .finally(() => setFetching(false));
    }
  }, [user, loading]);

  // generate AI executive report on demand
  const runInsights = async () => {
    setAiLoading(true);
    try {
      const data = await analyticsAPI.insights();
      setInsights(data);
    } catch (err) {
      setInsights({ error: err.message || 'Could not reach Ollama. Make sure it is running.' });
    } finally {
      setAiLoading(false);
    }
  };

  if (loading || fetching) {
    return <div className="loading-screen"><div className="spinner" /></div>;
  }

  // pull the numbers we need
  const total    = stats?.total_employees ?? 0;
  const active   = stats?.active_employees ?? 0;
  const flagged  = stats?.flagged_employees ?? 0;
  const valRate  = stats?.validation_success_rate ?? 0;
  const byDept   = stats?.by_department ?? [];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">

        <div className="page-header">
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Overview of employee data and validation metrics</p>
        </div>

        {/* summary cards */}
        <div className="stats-grid" style={{ marginBottom: 24 }}>
          {[
            { label: 'Total Employees',  value: total,                    color: 'var(--accent)'  },
            { label: 'Active',           value: active,                   color: 'var(--success)' },
            { label: 'Flagged',          value: flagged,                  color: 'var(--warning)' },
            { label: 'Validation Rate',  value: `${Math.round(valRate)}%`, color: 'var(--accent2)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          {/* department breakdown */}
          <div className="card">
            <div className="card-title">Department Breakdown</div>
            {byDept.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet.</p>
            ) : (
              <div>
                {byDept.map((dept, i) => {
                  const pct = total ? Math.round((dept.count / total) * 100) : 0;
                  return (
                    <div key={i} style={{ marginBottom: 14 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)' }}>
                          {dept.department || dept.name}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {dept.count} ({pct}%)
                        </span>
                      </div>
                      {/* progress bar */}
                      <div style={{ height: 6, background: 'var(--surface2)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--accent), var(--accent2))', borderRadius: 3, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI executive report */}
          <div className="card">
            <div className="card-title">AI Executive Report</div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>
              Ask Ollama to generate a plain-English summary of the current data quality.
            </p>

            <button className="btn btn-secondary" onClick={runInsights} disabled={aiLoading}>
              {aiLoading && <span className="spinner" style={{ width: 14, height: 14 }} />}
              {aiLoading ? 'Generating...' : 'Generate Report'}
            </button>

            {insights && (
              <div style={{ marginTop: 16 }}>
                {insights.error ? (
                  <div className="alert alert-warning" style={{ fontSize: '0.83rem' }}>{insights.error}</div>
                ) : (
                  <div style={{ fontSize: '0.88rem', color: 'var(--text-dim)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                    {insights.summary || insights.report || JSON.stringify(insights, null, 2)}
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