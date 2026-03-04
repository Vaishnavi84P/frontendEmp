'use client';
// Sidebar.js
// Left sidebar navigation - stays fixed on all pages after login
// Shows the current user's name/role at the bottom
// Active link gets highlighted based on current URL

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';

// nav items grouped into sections - Main for core pages, Tools for utilities
const NAV_GROUPS = [
  {
    section: 'Main',
    links: [
      { href: '/dashboard',        label: 'Dashboard',     icon: '▦' },
      { href: '/employees',        label: 'Employees',     icon: '👥' },
      { href: '/employees/create', label: 'Add Employee',  icon: '＋' },
    ],
  },
  {
    section: 'Tools',
    links: [
      { href: '/validate',  label: 'Email Validator', icon: '✉'  },
      { href: '/analytics', label: 'Analytics',       icon: '📊' },
    ],
  },
];

export default function Sidebar() {
  const currentPath      = usePathname();
  const router           = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // show first 2 letters of username as avatar
  const avatarText = user?.username
    ? user.username.slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || '??';

  return (
    <aside className="sidebar">

      {/* top logo */}
      <div className="sidebar-logo">
        <h1>⚡ xLM Onboard</h1>
        <span>AI-Powered Platform</span>
      </div>

      {/* nav links */}
      <nav className="sidebar-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.section}>
            <div className="nav-section">{group.section}</div>
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-item ${currentPath === link.href ? 'active' : ''}`}
              >
                <span style={{ fontSize: '1rem', width: 18, textAlign: 'center' }}>
                  {link.icon}
                </span>
                <span>{link.label}</span>
              </Link>
            ))}
          </div>
        ))}
      </nav>

      {/* user card + logout at the bottom */}
      <div className="sidebar-footer">
        <div className="user-card">
          <div className="user-avatar">{avatarText}</div>
          <div className="user-info">
            <div className="user-name">{user?.username || user?.email || 'User'}</div>
            <div className="user-role">{user?.role || 'viewer'}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ marginTop: 8, color: '#f87171' }}
        >
          <span style={{ fontSize: '1rem', width: 18, textAlign: 'center' }}>⏻</span>
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}