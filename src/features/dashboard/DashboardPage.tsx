import { useAuth } from '../../app/providers/AuthContext';
import { MetricsRow } from './MetricsRow';
import { AlertsStrip } from './AlertsStrip';
import { BinOverview } from './BinOverview';
import { WasteTrendChart } from './WasteTrendChart';
import { DashboardVisuals } from './DashboardVisuals';
import { RouteMonitorWidget } from './RouteMonitorWidget';
import { FacilityProcessingSummary } from './FacilityProcessingSummary';
import { ReportingSummary } from './ReportingSummary';
import { DriverDashboard } from './DriverDashboard';

export function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'driver') {
    return <DriverDashboard />;
  }

  return (
    <div className="dashboard-layout" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Overview Summary Cards */}
      <MetricsRow />

      {/* 2. Live Alerts Notification Strip */}
      <AlertsStrip />

      {/* 3. Main Dashboard Layout (Horizontal pairs in 2-column grid to prevent empty spaces) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', alignItems: 'stretch' }}>
        <RouteMonitorWidget />
        <BinOverview />
        <WasteTrendChart />
        <DashboardVisuals />
        <FacilityProcessingSummary />
        <ReportingSummary />
      </div>

    </div>
  );
}
