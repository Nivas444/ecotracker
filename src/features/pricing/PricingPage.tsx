import { DollarSign } from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { MarketPanel } from './MarketPanel';
import type { Activity } from '../../types';


function ActivityItem({ activity }: { activity: Activity }) {
  return (
    <div className="activity-item">
      <span className="activity-emoji">
        {activity.type === 'buy' ? '💰' : '📦'}
      </span>
      <div className="activity-body">
        <p className="activity-desc">{activity.description}</p>
        <span className="activity-time">
          {new Date(activity.timestamp).toLocaleString('en-IN')}
        </span>
      </div>
    </div>
  );
}

export function PricingPage() {
  const { activities } = useAppState();
  const tradeActivities = activities.filter((a) => a.type === 'buy' || a.type === 'sell');

  return (
    <div className="pricing-page">
      <MarketPanel />

      {/* Trade history */}
      <div className="card" style={{ marginTop: '1.5rem' }}>
        <div className="card-header">
          <DollarSign size={18} className="card-icon" />
          <h2 className="card-title">Trade History</h2>
          <span className="card-count">{tradeActivities.length} trades</span>
        </div>

        {tradeActivities.length === 0 ? (
          <p className="empty-state">No trades logged yet. Use Sell / Buy buttons above.</p>
        ) : (
          <div className="activity-list">
            {tradeActivities.map((a) => (
              <ActivityItem key={a.id} activity={a} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
