import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, ShieldAlert, AlertTriangle, WifiOff, Sun, Moon } from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { filterByRole } from '../../utils/batchUtils';
import type { Bin, Batch } from '../../types';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard Overview',
  '/bins': 'Smart Bin Monitor',
  '/batches': 'Batch Operations',
  '/routes': 'Route Management & Tracking',
  '/reports': 'Reports & Export',
};

interface NotificationItem {
  id: string;
  message: string;
  severity: 'critical' | 'warning' | 'info' | 'success';
  timestamp: string;
  icon: any;
}

export function Header() {
  const { pathname } = useLocation();
  const { bins, batches, routes, branding, theme, toggleTheme } = useAppState();
  const { user } = useAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter bins and batches by user role
  const visibleBins = filterByRole(bins, user, 'bin') as Bin[];
  const visibleBatches = filterByRole(batches, user, 'batch') as Batch[];

  // Compile dynamic notifications list
  const notifications: NotificationItem[] = [];

  // 1. Bin notifications
  visibleBins.forEach(bin => {
    if (bin.archived) return;

    if (bin.fillLevel > 85) {
      notifications.push({
        id: `bin-crit-${bin.id}-${bin.fillLevel}`,
        message: `Bin ${bin.id} (${bin.customerName || bin.location}) critical overflow risk: ${bin.fillLevel}% capacity.`,
        severity: 'critical',
        timestamp: bin.lastUpdated,
        icon: ShieldAlert,
      });
    } else if (bin.fillLevel > 60) {
      notifications.push({
        id: `bin-warn-${bin.id}-${bin.fillLevel}`,
        message: `Bin ${bin.id} (${bin.customerName || bin.location}) approaching full capacity: ${bin.fillLevel}%.`,
        severity: 'warning',
        timestamp: bin.lastUpdated,
        icon: AlertTriangle,
      });
    }

    if (bin.connectivity === 'offline') {
      notifications.push({
        id: `bin-off-${bin.id}`,
        message: `Smart Bin ${bin.id} at ${bin.location} is offline.`,
        severity: 'warning',
        timestamp: bin.lastUpdated,
        icon: WifiOff,
      });
    }
  });

  // 2. Route delay alerts
  routes.forEach(route => {
    if (route.status !== 'completed') {
      const expectedTime = new Date(route.expectedCompletionTime).getTime();
      const nowTime = new Date().getTime();
      if (nowTime > expectedTime) {
        const delayMins = Math.floor((nowTime - expectedTime) / (1000 * 60));
        notifications.push({
          id: `route-delay-${route.id}-${delayMins}`,
          message: `Route alert: "${route.routeName}" is delayed by ${delayMins} mins. Driver: ${route.driverName}.`,
          severity: 'critical',
          timestamp: route.expectedCompletionTime,
          icon: AlertTriangle,
        });
      }
    }
  });

  // 3. Delivery delay alerts
  visibleBatches.forEach(batch => {
    if (batch.status === 'COLLECTED' && batch.timestamps.inTransit) {
      const inTransitTime = new Date(batch.timestamps.inTransit).getTime();
      const nowTime = new Date().getTime(); // standard now
      const hoursDiff = (nowTime - inTransitTime) / (1000 * 60 * 60);
      // If transit exceeds 2 hours, flag as delayed
      if (hoursDiff > 2) {
        notifications.push({
          id: `batch-delay-${batch.id}`,
          message: `Delivery Delay: Batch ${batch.id} has been in transit for over 2 hours.`,
          severity: 'critical',
          timestamp: batch.timestamps.inTransit,
          icon: AlertTriangle,
        });
      }
    }
  });

  // Filter out dismissed notifications
  const activeNotifications = notifications
    .filter(n => !dismissedIds.includes(n.id))
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const formatTime = (iso: string) => {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Recently';
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) + ' ' + date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
  };

  const handleDismiss = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDismissedIds(prev => [...prev, id]);
  };

  const handleClearAll = () => {
    setDismissedIds(notifications.map(n => n.id));
  };

  return (
    <header className="topbar">
      <div className="page-title">
        <h1>{PAGE_TITLES[pathname] ? `${branding.companyName} — ${PAGE_TITLES[pathname]}` : branding.companyName}</h1>
      </div>
      <div className="topbar-right">
        {/* Notification Bell with Dropdown */}
        <div className="alert-bell-container" style={{ position: 'relative' }} ref={dropdownRef}>
          <div className="alert-bell" onClick={() => setIsOpen(!isOpen)}>
            <Bell size={20} />
            {activeNotifications.length > 0 && (
              <span className="alert-badge" style={{ background: 'var(--primary)' }}>
                {activeNotifications.length}
              </span>
            )}
          </div>

          {isOpen && (
            <div className="notifications-dropdown">
              <div className="notifications-header">
                <span>System Notifications</span>
                {activeNotifications.length > 0 && (
                  <button 
                    onClick={handleClearAll}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary)',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    Clear All
                  </button>
                )}
              </div>
              <div className="notifications-list">
                {activeNotifications.length === 0 ? (
                  <div className="notifications-empty">No active notifications.</div>
                ) : (
                  activeNotifications.map(notif => {
                    const IconComponent = notif.icon;
                    let iconColor = 'var(--text-muted)';
                    if (notif.severity === 'critical') iconColor = 'var(--red-500)';
                    if (notif.severity === 'warning') iconColor = 'var(--amber-500)';
                    if (notif.severity === 'success') iconColor = 'var(--green-500)';
                    if (notif.severity === 'info') iconColor = 'var(--primary)';

                    return (
                      <div key={notif.id} className="notification-item unread">
                        <IconComponent size={16} style={{ color: iconColor, marginTop: '2px', flexShrink: 0 }} />
                        <div className="notification-content">
                          <span className="notification-msg">{notif.message}</span>
                          <span className="notification-time">{formatTime(notif.timestamp)}</span>
                        </div>
                        <button
                          onClick={(e) => handleDismiss(notif.id, e)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            fontSize: '14px',
                            padding: '0 4px',
                          }}
                          title="Dismiss"
                        >
                          &times;
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <button 
          onClick={toggleTheme}
          className="btn btn-secondary"
          style={{
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            padding: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--surface-2)',
            borderColor: 'var(--border)'
          }}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        <span className="topbar-date">
          {new Date().toLocaleDateString('en-IN', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </span>
      </div>
    </header>
  );
}
