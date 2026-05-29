import { useAppState } from '../../app/providers/AppStateContext';
import { Factory } from 'lucide-react';

export function FacilityProcessingSummary() {
  const { batches } = useAppState();

  // 1. Calculations
  const totalIncoming = batches.reduce((sum, b) => sum + b.weightKg, 0);
  const plasticRecovered = batches.reduce((sum, b) => sum + b.plasticWeightKg, 0);
  const remainingProcessing = batches
    .filter(b => b.status === 'DELIVERED' || b.status === 'COLLECTED' || b.status === 'CREATED')
    .reduce((sum, b) => sum + b.weightKg, 0);

  // Disposal waste = non-recyclable portion of VERIFIED batches
  const disposalResidue = batches
    .filter(b => b.status === 'VERIFIED')
    .reduce((sum, b) => {
      const recyclable = b.plasticWeightKg + (b.metalWeightKg ?? 0) + (b.glassWeightKg ?? 0);
      return sum + Math.max(0, b.weightKg - recyclable);
    }, 0);

  // For visual progress ratios
  const totalAccounted = plasticRecovered + remainingProcessing + disposalResidue;
  const plasticPct = totalAccounted > 0 ? (plasticRecovered / totalAccounted) * 100 : 0;
  const remainingPct = totalAccounted > 0 ? (remainingProcessing / totalAccounted) * 100 : 0;
  const disposalPct = totalAccounted > 0 ? (disposalResidue / totalAccounted) * 100 : 0;

  return (
    <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
        <Factory size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
        <h2 className="card-title">Facility Processing Summary</h2>
      </div>

      {/* Grid of metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Total Incoming</div>
          <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px', color: 'var(--text)' }}>
            {totalIncoming.toLocaleString('en-IN')} kg
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Solid waste received</span>
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Plastic Recovered</div>
          <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px', color: 'var(--green-400)' }}>
            {plasticRecovered.toLocaleString('en-IN')} kg
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Recycled post-consumer PET</span>
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Remaining/In Process</div>
          <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px', color: 'var(--amber-400)' }}>
            {remainingProcessing.toLocaleString('en-IN')} kg
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Awaiting sorting & audit</span>
        </div>

        <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Disposal Residue</div>
          <div style={{ fontSize: '16px', fontWeight: 800, marginTop: '2px', color: 'var(--text-muted)' }}>
            {disposalResidue.toLocaleString('en-IN')} kg
          </div>
          <span style={{ fontSize: '9px', color: 'var(--text-dim)' }}>Non-recyclable residue</span>
        </div>
      </div>

      {/* Visual Composition Bar */}
      {totalAccounted > 0 && (
        <div style={{ marginTop: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
            <span>Processing Allocation Breakdown</span>
          </div>
          <div style={{ height: '8px', display: 'flex', borderRadius: '4px', overflow: 'hidden', background: 'var(--surface-3)' }}>
            {plasticPct > 0 && (
              <div style={{ width: `${plasticPct}%`, background: 'var(--green-500)', height: '100%' }} title="Recovered Plastic" />
            )}
            {remainingPct > 0 && (
              <div style={{ width: `${remainingPct}%`, background: 'var(--amber-500)', height: '100%' }} title="In Progress" />
            )}
            {disposalPct > 0 && (
              <div style={{ width: `${disposalPct}%`, background: 'var(--text-dim)', height: '100%' }} title="Disposal Residue" />
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '6px', fontSize: '9px', color: 'var(--text-dim)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green-500)' }} />
              <span>Recovered ({Math.round(plasticPct)}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--amber-500)' }} />
              <span>In Process ({Math.round(remainingPct)}%)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-dim)' }} />
              <span>Disposal ({Math.round(disposalPct)}%)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
