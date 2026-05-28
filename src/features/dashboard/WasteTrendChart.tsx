import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';
import { generateTrendInsight } from '../../utils/insights';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { filterByRole, generateTrendFromBatches } from '../../utils/batchUtils';

export function WasteTrendChart() {
  const { batches } = useAppState();
  const { user } = useAuth();
  
  const filteredBatches = filterByRole(batches, user, 'batch');
  const trendData = generateTrendFromBatches(filteredBatches);
  
  const insight = generateTrendInsight(trendData);

  return (
    <div className="card">
      <div className="card-header">
        <TrendingUp size={18} className="card-icon" />
        <h2 className="card-title">Waste Trend – Last 7 Days</h2>
      </div>

      <p className="trend-insight">{insight}</p>

      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trendData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} unit=" kg" />
            <Tooltip
              contentStyle={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 13,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 13 }} />
            <Line
              type="monotone"
              dataKey="plastic"
              stroke="#3b82f6"
              strokeWidth={2.5}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
              name="Plastic"
            />
            <Line
              type="monotone"
              dataKey="organic"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Organic"
            />
            <Line
              type="monotone"
              dataKey="glass"
              stroke="#14b8a6"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Glass"
            />
            <Line
              type="monotone"
              dataKey="paper"
              stroke="#f59e0b"
              strokeWidth={2}
              dot={{ r: 3 }}
              name="Paper"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
