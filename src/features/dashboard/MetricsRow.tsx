import { Trash2, AlertTriangle, Truck, Clock, Package, Leaf } from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';

export function MetricsRow() {
  const { bins, batches, routes } = useAppState();

  // 1. Total Active Bins
  const activeBins = bins.filter(b => !b.archived).length;

  // 2. Critical Bins (> 85% fill level)
  const criticalBins = bins.filter(b => !b.archived && b.fillLevel > 85).length;

  // 3. Active Routes
  const activeRoutes = routes.filter(r => r.status === 'active').length;

  // 4. Delayed Routes (not completed and past expected completion time)
  const now = new Date().getTime();
  const delayedRoutes = routes.filter(r => 
    r.status !== 'completed' && now > new Date(r.expectedCompletionTime).getTime()
  ).length;

  // 5. Total Waste Collected (sum of all batches weightKg)
  const totalWaste = batches.reduce((sum, b) => sum + b.weightKg, 0);

  // 6. CO₂ Savings (plastic weight * 1.8)
  const totalPlastic = batches.reduce((sum, b) => sum + b.plasticWeightKg, 0);
  const co2Saved = parseFloat((totalPlastic * 1.8).toFixed(1));

  const metrics = [
    {
      id: 'active-bins',
      label: 'Active Bins',
      value: activeBins,
      sub: 'Sensors monitored',
      icon: Trash2,
      color: 'var(--primary)',
    },
    {
      id: 'critical-bins',
      label: 'Critical Bins',
      value: criticalBins,
      sub: 'Exceeding 85%',
      icon: AlertTriangle,
      color: criticalBins > 0 ? 'var(--red-400)' : 'var(--text-muted)',
    },
    {
      id: 'active-routes',
      label: 'Active Routes',
      value: activeRoutes,
      sub: 'Fleet dispatching',
      icon: Truck,
      color: 'var(--sky-500)',
    },
    {
      id: 'delayed-routes',
      label: 'Delayed Routes',
      value: delayedRoutes,
      sub: 'Exceeded deadline',
      icon: Clock,
      color: delayedRoutes > 0 ? 'var(--red-400)' : 'var(--text-muted)',
    },
    {
      id: 'total-waste',
      label: 'Waste Collected',
      value: `${totalWaste.toLocaleString('en-IN')} kg`,
      sub: 'Processed weights',
      icon: Package,
      color: 'var(--amber-400)',
    },
    {
      id: 'co2-savings',
      label: 'CO₂ Savings',
      value: `${co2Saved.toLocaleString('en-IN')} kg`,
      sub: 'Plastic offsets',
      icon: Leaf,
      color: 'var(--green-400)',
      tooltip: 'CO₂ values are estimated using average recyclable plastic emission factors (1.8x).',
    },
  ];

  return (
    <div className="metrics-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem' }}>
      {metrics.map(({ id, label, value, sub, icon: Icon, color, tooltip }) => (
        <div key={id} className="metric-card" title={tooltip} style={{ display: 'flex', padding: '12px 14px', gap: '10px', alignItems: 'center' }}>
          <div className="metric-icon" style={{ color, width: '36px', height: '36px', minWidth: '36px', borderRadius: '6px', background: 'var(--surface-2)' }}>
            <Icon size={18} />
          </div>
          <div className="metric-body" style={{ gap: '1px' }}>
            <span className="metric-label" style={{ fontSize: '11px' }}>{label}</span>
            <span className="metric-value" style={{ color: color, fontSize: '15px', fontWeight: 700 }}>{value}</span>
            <span className="metric-sub" style={{ fontSize: '10px' }}>{sub}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
