import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { Activity, FilePlus, Truck, Building, CheckCircle, FileEdit, HelpCircle } from 'lucide-react';
import type { ActivityType } from '../../types';

// ── User-visible activity types ───────────────────────────────
const AUDIT_ACTIVITY_TYPES: ActivityType[] = [
  'collection',
  'pickup',
  'delivery',
  'verification',
];

function getActivityIcon(type: ActivityType, desc: string) {
  const d = desc.toLowerCase();
  if (d.includes('correct') || d.includes('modif') || d.includes('reopen') || d.includes('edit')) {
    return <FileEdit size={16} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />;
  }
  if (type === 'collection') {
    return <FilePlus size={16} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />;
  }
  if (type === 'pickup') {
    return <Truck size={16} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />;
  }
  if (type === 'delivery') {
    return <Building size={16} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />;
  }
  if (type === 'verification') {
    return <CheckCircle size={16} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />;
  }
  return <HelpCircle size={16} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ─────────────────────────────────────────────────

export function ActivityFeed() {
  const { activities } = useAppState();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const filteredActivities = activities
    .filter(a => AUDIT_ACTIVITY_TYPES.includes(a.type))
    .filter(a => {
      if (isAdmin) return true;
      // Normal user only sees activities belonging to them or system actions
      return a.userId === user?.id || a.userId === 'system';
    });

  return (
    <div className="card activity-card">
      <div className="card-header">
        <Activity size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
        <h2 className="card-title">Operational Audit Feed</h2>
        {!isAdmin && (
          <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginLeft: 'auto' }}>
            Your activity
          </span>
        )}
      </div>

      <div className="activity-list">
        {filteredActivities.slice(0, 15).map(a => {
          return (
            <div key={a.id} className="activity-item" style={{ display: 'flex', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              {getActivityIcon(a.type, a.description)}
              <div className="activity-body" style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                  <p className="activity-desc" style={{ fontSize: '13px', color: 'var(--text)', margin: 0, lineHeight: '1.4' }}>
                    {a.description}
                  </p>
                </div>
                <span className="activity-time" style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '2px', display: 'inline-block' }}>
                  {timeAgo(a.timestamp)}
                </span>
              </div>
            </div>
          );
        })}

        {filteredActivities.length === 0 && (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px 0' }}>
            No operational activities logged yet.
          </p>
        )}
      </div>
    </div>
  );
}
