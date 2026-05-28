import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/providers/AuthContext';
import { useAppState } from '../../app/providers/AppStateContext';
import {
  LayoutDashboard,
  Trash2,
  Package,
  FileBarChart2,
  LogOut,
  Truck,
  Users,
} from 'lucide-react';

export function Sidebar() {
  const { user, logout } = useAuth();
  const { branding } = useAppState();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/bins', label: 'Bin Monitor', icon: Trash2 },
    { to: '/logistics', label: 'Logistics', icon: Users },
    { to: '/routes', label: 'Route Management', icon: Truck },
    { to: '/batches', label: 'Batch Ops', icon: Package },
    { to: '/reports', label: 'Reports', icon: FileBarChart2 },
  ];

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <img
          src={branding.logoUrl}
          alt={`${branding.companyName} Logo`}
          className="brand-logo"
          style={{ border: '2px solid var(--border)', padding: '2px', objectFit: 'contain' }}
        />
        <span className="brand-name">{branding.companyName}<br /><small>Waste Operations</small></span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User section */}
      <div className="sidebar-footer">
        <div className="user-pill">
          <span className="avatar" style={{ background: 'var(--surface-3)', color: 'var(--primary)' }}>
            {user?.avatarInitials}
          </span>
          <div className="user-info">
            <span className="user-name">{user?.displayName}</span>
            <span className="role-badge role-badge--admin" style={{
              background: 'rgba(51, 126, 105, 0.2)',
              color: 'var(--primary)'
            }}>
              Admin
            </span>
          </div>
        </div>
        <button className="logout-btn" onClick={handleLogout} title="Logout">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
