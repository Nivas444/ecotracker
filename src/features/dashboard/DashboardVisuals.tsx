import { useAppState } from '../../app/providers/AppStateContext';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { ShieldCheck, BarChart3 } from 'lucide-react';
import type { BatchStatus } from '../../types';
import { getStatusLabel, STATUS_ORDER } from '../../utils/batchUtils';

export function DashboardVisuals() {
  const { batches } = useAppState();

  const total = batches.length;
  const verifiedCount = batches.filter(b => b.status === 'VERIFIED').length;
  const pendingCount = total - verifiedCount;

  // Donut chart data
  const chartData = total > 0 
    ? [
        { name: 'Verified Cargo', value: verifiedCount, color: 'var(--green-500)' },
        { name: 'In Progress / Pending', value: pendingCount, color: 'var(--green-400)' }
      ]
    : [
        { name: 'No Batches Registered', value: 1, color: 'var(--border)' }
      ];

  const statusColors: Record<BatchStatus, string> = {
    COLLECTED: 'var(--amber-500)',
    DELIVERED: 'var(--green-400)',
    VERIFIED: 'var(--green-500)',
  };

  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
      
      {/* ── Donut Chart (Verification Summary) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={16} style={{ color: 'var(--green-500)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Verification Summary
          </span>
        </div>
        
        <div style={{ height: '140px', position: 'relative', marginTop: '10px' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={36}
                outerRadius={52}
                paddingAngle={4}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '11px', borderRadius: '6px' }}
                itemStyle={{ color: 'var(--text)' }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Centered stat */}
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            pointerEvents: 'none'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {total}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600, marginTop: '2px' }}>
              Batches
            </div>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', fontSize: '11px', marginTop: '4px' }}>
          {total > 0 ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-500)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Verified ({verifiedCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-400)' }} />
                <span style={{ color: 'var(--text-muted)' }}>Pending ({pendingCount})</span>
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--text-dim)', fontStyle: 'italic' }}>
              Pending operational inputs
            </div>
          )}
        </div>
      </div>

      {/* ── Progress Indicators (Delivery Stats) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <BarChart3 size={16} style={{ color: 'var(--primary)' }} />
          <span style={{ fontSize: '13px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Delivery statistics
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
          {STATUS_ORDER.map((status) => {
            const count = batches.filter(b => b.status === status).length;
            const percentage = total > 0 ? (count / total) * 100 : 0;
            const barColor = statusColors[status];

            return (
              <div key={status} style={{ fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontWeight: 600 }}>
                  <span style={{ color: 'var(--text)' }}>{getStatusLabel(status)}</span>
                  <span style={{ color: 'var(--text-muted)' }}>
                    {count} {total > 0 && `(${Math.round(percentage)}%)`}
                  </span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div 
                    style={{ 
                      width: `${percentage}%`, 
                      background: barColor, 
                      height: '100%', 
                      borderRadius: '3px',
                      transition: 'width 0.5s ease'
                    }} 
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
