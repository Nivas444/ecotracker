import { useAppState } from '../../app/providers/AppStateContext';
import { Truck, AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

export function RouteMonitorWidget() {
  const { routes } = useAppState();

  const now = new Date().getTime();
  const activeAndDelayed = routes
    .map(route => {
      const isPastDeadline = now > new Date(route.expectedCompletionTime).getTime();
      const isDelayed = route.status !== 'completed' && isPastDeadline;
      return {
        ...route,
        delayStatus: isDelayed
      };
    })
    .filter(r => r.status !== 'completed');

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Truck size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="card-title">Live Dispatch Tracking</h2>
        </div>
        <Link to="/routes" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          Manage Routes
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
        {activeAndDelayed.length === 0 ? (
          <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '24px 10px', fontSize: '12px' }}>
            No dispatch routes currently active. All vehicles parked.
          </div>
        ) : (
          activeAndDelayed.map(route => {
            const total = route.assignedBins.length;
            const collected = route.assignedBins.filter(b => b.status === 'collected').length;
            const progress = total > 0 ? Math.round((collected / total) * 100) : 0;
            const isDelayed = route.delayStatus;

            return (
              <div 
                key={route.id}
                style={{
                  background: 'var(--surface-2)',
                  border: isDelayed ? '1px solid var(--red-500)' : '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text)' }}>
                      {route.routeName}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginLeft: '6px' }}>
                      ({route.vehicleNumber})
                    </span>
                  </div>
                  
                  {isDelayed ? (
                    <span style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '9px', fontWeight: 700, color: 'var(--red-400)', background: 'rgba(239,68,68,0.12)', padding: '2px 6px', borderRadius: '4px' }}>
                      <AlertTriangle size={10} /> DELAYED
                    </span>
                  ) : (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--primary)' }}>
                      {route.status.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                    <span>Pickups collected: {collected}/{total}</span>
                    <strong>{progress}%</strong>
                  </div>
                  <div style={{ height: '4px', background: 'var(--surface-3)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div 
                      style={{ 
                        height: '100%', 
                        background: isDelayed ? 'var(--red-500)' : 'var(--primary)', 
                        width: `${progress}%`,
                        borderRadius: '2px',
                        transition: 'width 0.3s ease'
                      }} 
                    />
                  </div>
                </div>

                {/* ETA deadline */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)' }}>
                  <span>Driver: {route.driverName}</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Clock size={10} /> ETA: {new Date(route.expectedCompletionTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
