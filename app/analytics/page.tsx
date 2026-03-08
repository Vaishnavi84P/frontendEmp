'use client';
// analytics/page.tsx
// Analytics dashboard - shows charts and an AI-generated executive summary
// Data comes from /api/v1/analytics/dashboard and /api/v1/analytics/insights

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import { analyticsAPI } from '../../src/services/api';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function AnalyticsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [stats, setStats]         = useState(null);
  const [insights, setInsights]   = useState(null);
  const [fetching, setFetching]   = useState(true);
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
  const total   = stats?.total_employees ?? 0;
  const active  = stats?.active_employees ?? 0;
  const flagged = stats?.flagged_employees ?? 0;
  const valRate = stats?.validation_success_rate ?? 0;
  const byDept  = stats?.by_department ?? [];

  const doughnutData = {
    labels: byDept.map((d) => d.department || d.name),
    datasets: [{
      data: byDept.map((d) => d.count),
      backgroundColor: ['#00d4ff','#7c3aed','#10b981','#f59e0b','#ef4444','#3b82f6','#ec4899','#14b8a6','#f97316','#8b5cf6'],
      borderWidth: 0,
    }]
  };

  const barData = {
    labels: ['Validated', 'Pending', 'Flagged'],
    datasets: [{
      label: 'Employees',
      data: [
        stats?.validated_employees ?? 0,
        stats?.pending_employees ?? 0,
        stats?.flagged_employees ?? 0
      ],
      backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
      borderRadius: 6,
    }]
  };

  const barOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      y: { beginAtZero: true, ticks: { color: '#94a3b8' } },
      x: { ticks: { color: '#94a3b8' } }
    }
  };

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
            { label: 'Total Employees', value: total,                     color: 'var(--accent)'  },
            { label: 'Active',          value: active,                    color: 'var(--success)' },
            { label: 'Flagged',         value: flagged,                   color: 'var(--warning)' },
            { label: 'Validation Rate', value: `${Math.round(valRate)}%`, color: 'var(--accent2)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        <div className="grid-2">
          {/* department breakdown doughnut chart */}
          <div className="card">
            <div className="card-title">Department Breakdown</div>
            {byDept.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No data yet.</p>
            ) : (
              <div style={{ maxWidth: 300, margin: '0 auto' }}>
                <Doughnut data={doughnutData} />
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

        {/* validation status bar chart */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-title">Validation Status Overview</div>
          <div style={{ maxWidth: 500, margin: '0 auto' }}>
            <Bar data={barData} options={barOptions} />
          </div>
        </div>

      </main>
    </div>
  );
}