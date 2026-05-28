import { AlertTriangle, Info } from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { getBinAlerts } from '../../utils/insights';

export function AlertsStrip() {
  const { bins, routes } = useAppState();
  const { user } = useAuth();
  
  // 1. Bin alerts (> 85% and offline states)
  const binAlerts = getBinAlerts(bins, user);

  // 2. Route delay alerts (not completed, past deadline)
  const now = new Date().getTime();
  const routeAlerts = routes
    .filter(r => r.status !== 'completed' && now > new Date(r.expectedCompletionTime).getTime())
    .map(r => {
      const delayMins = Math.floor((now - new Date(r.expectedCompletionTime).getTime()) / (1000 * 60));
      return {
        id: `route-delay-${r.id}`,
        message: `Route Alert: "${r.routeName}" is delayed by ${delayMins} mins. Driver ${r.driverName} (${r.vehicleNumber}) has not completed the collections.`,
        severity: 'critical' as const,
      };
    });

  const allAlerts = [
    ...binAlerts.map(a => ({
      id: a.binId,
      message: `Smart Bin Alert: ${a.binId} (${a.location}) - ${a.message}`,
      severity: a.severity,
    })),
    ...routeAlerts
  ];

  if (allAlerts.length === 0) {
    return (
      <div className="alerts-strip alerts-strip--ok" style={{ display: 'flex', gap: '8px', padding: '10px 14px', borderRadius: '6px', alignItems: 'center' }}>
        <Info size={16} />
        <span>All systems nominal. All bins and collection vehicles are operating on schedule.</span>
      </div>
    );
  }

  return (
    <div className="alerts-strip-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '0px' }}>
      {allAlerts.map((alert) => (
        <div
          key={alert.id}
          className={`alert-chip alert-chip--${alert.severity}`}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '6px', margin: 0 }}
        >
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 500 }}>
            {alert.message}
          </span>
        </div>
      ))}
    </div>
  );
}
