import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { Recycle, TrendingUp, TrendingDown, Minus, MapPin, User, Package, Plus, X } from 'lucide-react';
import type { Recycler, TrendDirection, RecyclerStatus, Batch } from '../../types';

// ── Trend Indicator component ───────────────────────────────

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <TrendingUp size={14} style={{ color: '#22c55e' }} />;
  if (direction === 'down') return <TrendingDown size={14} style={{ color: '#ef4444' }} />;
  return <Minus size={14} style={{ color: '#f59e0b' }} />;
}

// ── Status Badge component ──────────────────────────────────

function StatusBadge({ status }: { status: RecyclerStatus }) {
  const colors: Record<RecyclerStatus, { bg: string; text: string }> = {
    Receiving: { bg: 'rgba(51, 126, 105, 0.15)', text: 'var(--primary)' },
    Paused:    { bg: 'rgba(245,158,11,0.15)', text: '#d97706' },
    Closed:    { bg: 'rgba(239,68,68,0.15)', text: '#dc2626' },
  };
  const { bg, text } = colors[status];
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 700,
      padding: '3px 10px',
      borderRadius: '12px',
      background: bg,
      color: text,
      letterSpacing: '0.02em',
    }}>
      {status === 'Receiving' && '● '}
      {status}
    </span>
  );
}

// ── Recycler Card component with Delivery History ───────────

function RecyclerCard({ recycler, batches }: { recycler: Recycler; batches: Batch[] }) {
  const recyclerBatches = batches.filter(b => b.assignedRecyclerId === recycler.id);

  const getOperationalStatus = (status: string) => {
    if (status === 'VERIFIED') return { label: 'Verified', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    if (status === 'DELIVERED') return { label: 'Received', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };
    return { label: 'Processing', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  };

  return (
    <div className="card" style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
    }}>
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{recycler.name}</h3>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            Accepts: <strong>{recycler.acceptedWasteType}</strong>
          </div>
        </div>
        <StatusBadge status={recycler.status} />
      </div>

      {/* Buying Price */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        width: 'fit-content'
      }}>
        <Recycle size={14} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '14px', fontWeight: 700 }}>
          {recycler.currency}{recycler.buyingPricePerKg}/{recycler.priceUnit}
        </span>
        <TrendArrow direction={recycler.trend} />
      </div>

      {/* Assigned Batches Tracking / Delivery History */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '10px', marginTop: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          <Package size={11} /> Shipment Delivery History ({recyclerBatches.length})
        </div>
        
        {recyclerBatches.length === 0 ? (
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic', padding: '4px 0' }}>
            No cargo delivery history recorded.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
            {recyclerBatches.map(b => {
              const opStatus = getOperationalStatus(b.status);
              return (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', padding: '6px 8px', background: 'var(--surface-2)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div>
                    <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.id}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>({b.weightKg} kg)</span>
                  </div>
                  <span style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: opStatus.color,
                    background: opStatus.bg
                  }}>
                    {opStatus.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Location + Contact details */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', borderTop: '1px dashed var(--border)', paddingTop: '10px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <MapPin size={12} style={{ color: 'var(--primary)' }} /> {recycler.location}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <User size={12} style={{ color: 'var(--primary)' }} /> {recycler.contactPerson}
        </span>
      </div>
    </div>
  );
}

// ── Main Page Component ─────────────────────────────────────

export function RecyclersPage() {
  const { recyclers, batches, addRecycler } = useAppState();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [isAddRecyclerOpen, setIsAddRecyclerOpen] = useState(false);
  const [formError, setFormError] = useState('');
  
  const [recForm, setRecForm] = useState({
    name: '',
    acceptedWasteType: 'Plastic',
    contactPerson: '',
    location: '',
    buyingPricePerKg: 12.5,
  });

  const handleAddRecycler = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!recForm.name.trim() || !recForm.contactPerson.trim() || !recForm.location.trim()) {
      setFormError('All fields marked with * are required.');
      return;
    }

    const newRec: Recycler = {
      id: `REC-${Date.now()}`,
      name: recForm.name.trim(),
      acceptedWasteType: recForm.acceptedWasteType.trim(),
      buyingPricePerKg: recForm.buyingPricePerKg,
      currency: '$',
      priceUnit: 'kg',
      trend: 'stable',
      status: 'Receiving',
      location: recForm.location.trim(),
      contactPerson: recForm.contactPerson.trim(),
    };

    addRecycler(newRec);
    setIsAddRecyclerOpen(false);
    setRecForm({ name: '', acceptedWasteType: 'Plastic', contactPerson: '', location: '', buyingPricePerKg: 12.5 });
  };

  const receiving = recyclers.filter(r => r.status === 'Receiving');
  const paused = recyclers.filter(r => r.status !== 'Receiving');

  return (
    <div className="recyclers-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Header banner */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Recycle size={20} className="card-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 700 }}>Recycler Coordination</h2>
        </div>
        {isAdmin && recyclers.length > 0 && (
          <button 
            className="btn btn-primary" 
            onClick={() => { setFormError(''); setIsAddRecyclerOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Recycler
          </button>
        )}
      </div>

      <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '-8px' }}>
        Establish connections with external waste processors, track accepted categories, and review historical shipment log entries.
      </p>

      {/* Recyclers Grid list or Empty State */}
      {recyclers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
          <Recycle size={48} style={{ color: 'var(--text-dim)', marginBottom: '16px', opacity: 0.5, display: 'inline' }} />
          <h3 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>No Connected Recyclers</h3>
          <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto 16px', color: 'var(--text-muted)' }}>
            No connected recycling facility has been registered yet. Add a recycler facility to start dispatching waste shipments.
          </p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => { setFormError(''); setIsAddRecyclerOpen(true); }} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <Plus size={16} /> Register Recycler
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {receiving.length > 0 && (
            <div>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Active / Receiving Facilities
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {receiving.map(r => <RecyclerCard key={r.id} recycler={r} batches={batches} />)}
              </div>
            </div>
          )}

          {paused.length > 0 && (
            <div style={{ marginTop: '10px' }}>
              <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Paused / Closed Facilities
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
                {paused.map(r => <RecyclerCard key={r.id} recycler={r} batches={batches} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── ADD RECYCLER MODAL ── */}
      {isAddRecyclerOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Recycle size={20} style={{ color: 'var(--primary)' }} />
                <h2>Register Recycler Facility</h2>
              </div>
              <button className="btn-close" onClick={() => setIsAddRecyclerOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddRecycler}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && <div className="wizard-error">{formError}</div>}
                
                <div className="form-group">
                  <label>Facility / Partner Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CleanEarth Processing"
                    value={recForm.name}
                    onChange={e => setRecForm({ ...recForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Accepted Waste Category / Type <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Plastic (PET & HDPE)"
                    value={recForm.acceptedWasteType}
                    onChange={e => setRecForm({ ...recForm, acceptedWasteType: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Buying Price (Per Kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.01"
                    min="0.01"
                    value={recForm.buyingPricePerKg}
                    onChange={e => setRecForm({ ...recForm, buyingPricePerKg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Person Info <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. David Miller (Plant Manager)"
                    value={recForm.contactPerson}
                    onChange={e => setRecForm({ ...recForm, contactPerson: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Facility Location Address <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sector 5 Industrial Zone, NY"
                    value={recForm.location}
                    onChange={e => setRecForm({ ...recForm, location: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddRecyclerOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Add Recycler</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
