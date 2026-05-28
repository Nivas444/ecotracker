import { useAppState } from '../../app/providers/AppStateContext';
import { getCleanlinessScore } from '../../utils/insights';
import { calculateCO2 } from '../../utils/batchUtils';
import { FileBarChart2, Leaf } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReportingSummary() {
  const { bins, routes, batches } = useAppState();

  // 1. Calculations
  const cleanliness = getCleanlinessScore(bins);
  
  const totalRoutes = routes.length;
  const completedRoutes = routes.filter(r => r.status === 'completed').length;
  const routeEfficiency = totalRoutes > 0 ? Math.round((completedRoutes / totalRoutes) * 100) : 100;

  const co2Saved = calculateCO2(batches);

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FileBarChart2 size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="card-title">Reporting Analytics</h2>
        </div>
        <Link to="/reports" style={{ fontSize: '11px', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
          Full Reports
        </Link>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {/* Cleanliness Index */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Cleanliness Index</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: cleanliness.color, marginTop: '2px' }}>
              {cleanliness.label} ({cleanliness.score}% Fill)
            </div>
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Avg Bin capacity used</span>
        </div>

        {/* Fleet Efficiency */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px' }}>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Fleet Dispatch Efficiency</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', marginTop: '2px' }}>
              {routeEfficiency}% Completed
            </div>
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>{completedRoutes} of {totalRoutes} routes completed</span>
        </div>

        {/* Carbon savings */}
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Leaf size={14} style={{ color: 'var(--green-400)', marginTop: '3px', flexShrink: 0 }} />
          <div>
            <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Environmental Impact</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--green-400)', marginTop: '1px' }}>
              {co2Saved.toLocaleString('en-IN')} kg CO₂ Saved
            </div>
            <p style={{ fontSize: '9px', color: 'var(--text-dim)', marginTop: '2px', lineHeight: '1.2' }}>
              CO₂ Saved = Plastic Weight × 1.8. Estimated using average recyclable plastic factors.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
