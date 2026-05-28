import { Recycle, TrendingUp, TrendingDown, Minus, MapPin, User, Package, Truck, X } from 'lucide-react';
import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import type { Recycler, TrendDirection, RecyclerStatus, Batch, LogisticsProvider } from '../../types';

// ── Sub-components ────────────────────────────────────────────

function TrendArrow({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <TrendingUp size={14} style={{ color: '#22c55e' }} />;
  if (direction === 'down') return <TrendingDown size={14} style={{ color: '#ef4444' }} />;
  return <Minus size={14} style={{ color: '#f59e0b' }} />;
}

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

function RecyclerCard({ recycler, batches }: { recycler: Recycler; batches: Batch[] }) {
  const recyclerBatches = batches.filter(b => b.assignedRecyclerId === recycler.id);

  const getOperationalStatus = (status: string) => {
    if (status === 'VERIFIED') return { label: 'Verified', color: '#22c55e', bg: 'rgba(34,197,94,0.12)' };
    if (status === 'DELIVERED') return { label: 'Received', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' };
    return { label: 'Processing', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' };
  };

  return (
    <div style={{
      padding: '14px 16px',
      borderRadius: '10px',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Name + status */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '14px' }}>{recycler.name}</div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
            {recycler.acceptedWasteType}
          </div>
        </div>
        <StatusBadge status={recycler.status} />
      </div>

      {/* Price row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        background: 'var(--surface-hover)',
        border: '1px solid var(--border)',
      }}>
        <Recycle size={14} style={{ color: 'var(--primary)' }} />
        <span style={{ fontSize: '15px', fontWeight: 700 }}>
          {recycler.currency}{recycler.buyingPricePerKg}/{recycler.priceUnit}
        </span>
        <TrendArrow direction={recycler.trend} />
      </div>

      {/* Assigned Batches Tracking */}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', marginTop: '4px' }}>
        <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px', textTransform: 'uppercase' }}>
          <Package size={11} /> Operational Shipments ({recyclerBatches.length})
        </div>
        
        {recyclerBatches.length === 0 ? (
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', fontStyle: 'italic' }}>
            No cargo currently assigned
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '110px', overflowY: 'auto' }}>
            {recyclerBatches.slice(0, 3).map(b => {
              const opStatus = getOperationalStatus(b.status);
              return (
                <div key={b.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', padding: '4px 6px', background: 'var(--surface-2)', borderRadius: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{b.id} ({b.weightKg}kg)</span>
                  <span style={{
                    padding: '1px 6px',
                    borderRadius: '8px',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: opStatus.color,
                    background: opStatus.bg
                  }}>
                    {opStatus.label}
                  </span>
                </div>
              );
            })}
            {recyclerBatches.length > 3 && (
              <div style={{ fontSize: '10px', color: 'var(--text-dim)', textAlign: 'right', marginTop: '2px' }}>
                + {recyclerBatches.length - 3} more shipments
              </div>
            )}
          </div>
        )}
      </div>

      {/* Location + contact */}
      <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px', borderTop: '1px dashed var(--border)', paddingTop: '6px' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <MapPin size={11} />{recycler.location}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <User size={11} />{recycler.contactPerson}
        </span>
      </div>
    </div>
  );
}

// ── Panel ─────────────────────────────────────────────────────

export function RecyclerPanel() {
  const { recyclers, batches, logistics, addRecycler, addLogistics } = useAppState();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Modals state
  const [isAddRecyclerOpen, setIsAddRecyclerOpen] = useState(false);
  const [isAddLogisticsOpen, setIsAddLogisticsOpen] = useState(false);

  // Forms state
  const [recForm, setRecForm] = useState({
    name: '',
    acceptedWasteType: 'Plastic',
    contactPerson: '',
    location: '',
    buyingPricePerKg: 12.5,
  });

  const [logForm, setLogForm] = useState({
    driverName: '',
    vehicleNumber: '',
    contactNumber: '',
  });

  const [formError, setFormError] = useState('');

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
      currency: '₹',
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

  const handleAddLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!logForm.driverName.trim() || !logForm.vehicleNumber.trim() || !logForm.contactNumber.trim()) {
      setFormError('All fields marked with * are required.');
      return;
    }

    const newLog: LogisticsProvider = {
      id: `LOG-${Date.now()}`,
      driverName: logForm.driverName.trim(),
      vehicleNumber: logForm.vehicleNumber.trim().toUpperCase(),
      contactNumber: logForm.contactNumber.trim(),
    };

    addLogistics(newLog);
    setIsAddLogisticsOpen(false);
    setLogForm({ driverName: '', vehicleNumber: '', contactNumber: '' });
  };

  const receiving = recyclers.filter(r => r.status === 'Receiving');
  const paused    = recyclers.filter(r => r.status !== 'Receiving');

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
      {/* ── Recyclers Column ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Recycle size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
            <h2 className="card-title">Connected Recyclers</h2>
          </div>
          {isAdmin && (
            <button 
              className="btn btn-primary" 
              onClick={() => { setFormError(''); setIsAddRecyclerOpen(true); }}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Add Recycler
            </button>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Live status of connected waste facilities.
        </p>

        {/* Receiving recyclers */}
        {receiving.length > 0 && (
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--primary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Currently Receiving
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {receiving.map(r => <RecyclerCard key={r.id} recycler={r} batches={batches} />)}
            </div>
          </div>
        )}

        {/* Paused / Closed */}
        {paused.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Paused / Closed
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {paused.map(r => <RecyclerCard key={r.id} recycler={r} batches={batches} />)}
            </div>
          </div>
        )}

        {recyclers.length === 0 && (
          <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '24px', background: 'var(--surface-2)', borderRadius: '8px' }}>
            No registered recyclers.
          </div>
        )}
      </div>

      {/* ── Logistics Providers Column ── */}
      <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Truck size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
            <h2 className="card-title">Logistics Drivers</h2>
          </div>
          {isAdmin && (
            <button 
              className="btn btn-primary" 
              onClick={() => { setFormError(''); setIsAddLogisticsOpen(true); }}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              Add Driver
            </button>
          )}
        </div>

        <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Registered logistics operators and vehicles.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '4px' }}>
          {logistics.map(prov => (
            <div 
              key={prov.id} 
              style={{ 
                padding: '12px', 
                background: 'var(--surface-2)', 
                border: '1px solid var(--border)', 
                borderRadius: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div>
                <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text)' }}>{prov.driverName}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Vehicle: {prov.vehicleNumber}</div>
              </div>
              <div style={{ textTransform: 'uppercase', fontSize: '11px', color: 'var(--primary)', fontWeight: 600 }}>
                {prov.contactNumber}
              </div>
            </div>
          ))}
          {logistics.length === 0 && (
            <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '24px', background: 'var(--surface-2)', borderRadius: '8px' }}>
              No active drivers registered.
            </div>
          )}
        </div>
      </div>

      {/* ── ADD RECYCLER MODAL ── */}
      {isAddRecyclerOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Recycle size={20} style={{ color: 'var(--primary)' }} />
                <h2>Add Recycler Facility</h2>
              </div>
              <button className="btn-close" onClick={() => setIsAddRecyclerOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddRecycler}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formError && <div className="wizard-error">{formError}</div>}
                
                <div className="form-group">
                  <label>Facility Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. EcoRecycle Ltd"
                    value={recForm.name}
                    onChange={e => setRecForm({ ...recForm, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Accepted Waste Type <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Plastic, Paper"
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
                    step="0.1"
                    value={recForm.buyingPricePerKg}
                    onChange={e => setRecForm({ ...recForm, buyingPricePerKg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Person <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Alice Smith"
                    value={recForm.contactPerson}
                    onChange={e => setRecForm({ ...recForm, contactPerson: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Location / City <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Industrial Area Phase 1"
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

      {/* ── ADD LOGISTICS DRIVER MODAL ── */}
      {isAddLogisticsOpen && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Truck size={20} style={{ color: 'var(--primary)' }} />
                <h2>Register Logistics Driver</h2>
              </div>
              <button className="btn-close" onClick={() => setIsAddLogisticsOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddLogistics}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {formError && <div className="wizard-error">{formError}</div>}
                
                <div className="form-group">
                  <label>Driver Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. John Doe"
                    value={logForm.driverName}
                    onChange={e => setLogForm({ ...logForm, driverName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Vehicle Plate Number <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. TRK-9901"
                    value={logForm.vehicleNumber}
                    onChange={e => setLogForm({ ...logForm, vehicleNumber: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contact Number <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. +91 98765 43210"
                    value={logForm.contactNumber}
                    onChange={e => setLogForm({ ...logForm, contactNumber: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddLogisticsOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
