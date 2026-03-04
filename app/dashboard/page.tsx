'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/context/AuthContext';
import Sidebar from '../../src/components/Sidebar';
import { analyticsAPI } from '../../src/services/api';

function MiniBarChart({ data }: { data: { department: string; count: number }[] }) {
  if (!data || !data.length) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:80, padding:'8px 0' }}>
      {data.slice(0, 8).map((d, i) => (
        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
          <div style={{
            width:'100%',
            height:`${(d.count / max) * 60}px`,
            background:'linear-gradient(180deg, var(--accent), var(--accent2))',
            borderRadius:'3px 3px 0 0',
            opacity:0.85,
            minHeight:4,
            transition:'height 0.4s ease',
          }} />
          <span style={{ fontSize:'0.6rem', color:'var(--text-muted)', textAlign:'center', lineHeight:1.2 }}>
            {d.department ? d.department.split(' ')[0] : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ value = 0, total = 100, color = 'var(--accent)' }: { value: number; total: number; color?: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const pct = total ? value / total : 0;
  const dash = pct * circ;
  return (
    <svg width={100} height={100} viewBox="0 0 100 100">
      <circle cx={50} cy={50} r={r} fill="none" stroke="var(--border)" strokeWidth={10} />
      <circle cx={50} cy={50} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ / 4}
        strokeLinecap="round"
        style={{ transition:'stroke-dasharray 0.5s ease' }}
      />
      <text x={50} y={54} textAnchor="middle" fill="var(--text)" fontSize={14} fontWeight={700} fontFamily="var(--font-display)">
        {total ? Math.round(pct * 100) : 0}%
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [stats, setStats]   = useState<any>(null);
  const [fetching, setFetching] = useState(true);
  const [logs, setLogs]     = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) { router.push('/login'); return; }
    if (!loading && user) {
      analyticsAPI.dashboard()
        .then((data: any) => setStats(data))
        .catch(() => {})
        .finally(() => setFetching(false));
      analyticsAPI.logs()
        .then((data: any) => setLogs(data.logs || data || []))
        .catch(() => {});
    }
  }, [user, loading]);

  if (loading || fetching) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <p style={{ color:'var(--text-muted)', fontSize:'0.9rem' }}>Loading dashboard…</p>
      </div>
    );
  }

  const total   = stats?.total_employees   ?? stats?.total   ?? 0;
  const active  = stats?.active_employees  ?? stats?.active  ?? 0;
  const valRate = stats?.validation_success_rate ?? stats?.success_rate ?? 0;
  const flagged = stats?.flagged_employees ?? stats?.flagged ?? 0;
  const byDept  = (stats?.by_department    ?? stats?.departments ?? []) as { department: string; count: number }[];

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        {/* Header */}
        <div className="page-header flex-between">
          <div>
            <h1 className="page-title">Dashboard</h1>
            <p className="page-subtitle">
              Welcome back,{' '}
              <strong style={{ color:'var(--accent)' }}>
                {user?.username || user?.email}
              </strong>
            </p>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <button className="btn btn-primary" onClick={() => router.push('/employees/create')}>
              + Add Employee
            </button>
            <button className="btn btn-secondary" onClick={() => router.push('/employees')}>
              View All
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="stats-grid">
          {[
            { label:'Total Employees', value:total,                   sub:`${active} active`,       color:'var(--accent)'  },
            { label:'Validation Rate', value:`${Math.round(valRate)}%`, sub:'avg AI confidence',    color:'var(--success)' },
            { label:'Flagged Records', value:flagged,                 sub:'needs review',            color:'var(--warning)' },
            { label:'Departments',     value:byDept.length || '—',   sub:'active units',            color:'var(--accent2)' },
          ].map((s, i) => (
            <div className="stat-card" key={i}>
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
              <div className="stat-sub"   style={{ color:s.color }}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Charts row */}
        <div className="grid-2" style={{ marginBottom:24 }}>
          <div className="card">
            <div className="card-title">👥 Employees by Department</div>
            {byDept.length > 0
              ? <MiniBarChart data={byDept.map((d) => ({ department: d.department, count: d.count }))} />
              : <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No department data yet.</p>
            }
          </div>

          <div className="card">
            <div className="card-title">✅ Validation Health</div>
            <div style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
              <DonutChart value={Math.round(valRate)} total={100} color="var(--success)" />
              <div style={{ flex:1, minWidth:120 }}>
                {[
                  { label:'Valid emails', value:active,  color:'var(--success)' },
                  { label:'Flagged',      value:flagged, color:'var(--warning)' },
                  { label:'Total',        value:total,   color:'var(--accent)'  },
                ].map((r, i) => (
                  <div key={i} style={{ display:'flex', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ display:'flex', alignItems:'center', gap:7, fontSize:'0.82rem', color:'var(--text-dim)' }}>
                      <span style={{ width:10, height:10, borderRadius:2, background:r.color, display:'inline-block' }} />
                      {r.label}
                    </span>
                    <strong style={{ fontSize:'0.85rem', color:r.color }}>{r.value}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="card">
          <div className="card-title">🕐 Recent Activity</div>
          {logs.length === 0 ? (
            <p style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>No recent activity.</p>
          ) : (
            <div className="table-wrapper" style={{ border:'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Time</th><th>Action</th><th>Entity</th><th>By</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.slice(0, 10).map((log: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontSize:'0.78rem', color:'var(--text-muted)' }}>
                        {new Date(log.timestamp || log.created_at).toLocaleString()}
                      </td>
                      <td>
                        <span className={`badge badge-${log.action === 'create' ? 'success' : log.action === 'delete' ? 'danger' : 'info'}`}>
                          {log.action || log.validation_type}
                        </span>
                      </td>
                      <td>{log.entity_type || log.employee_id || '—'}</td>
                      <td style={{ color:'var(--text-dim)' }}>{log.username || log.performed_by || '—'}</td>
                      <td>
                        <span className={`badge badge-${log.status === 'pass' || log.status === 'success' ? 'success' : log.status === 'fail' ? 'danger' : 'warning'}`}>
                          {log.status || 'ok'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}