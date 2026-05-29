import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { 
  MapPin, Truck, User as UserIcon, 
  Search, QrCode, Camera, RotateCcw, Edit3, X, History 
} from 'lucide-react';
import { filterByRole } from '../../utils/batchUtils';
import type { Batch } from '../../types';

export function VerifiedPage() {
  const { batches, recyclers, updateBatch, addActivity } = useAppState();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [search, setSearch] = useState('');
  
  // Filter for verified batches only
  const allVerified = batches.filter(b => b.status === 'VERIFIED');
  const visibleVerified = filterByRole(allVerified, user, 'batch') as Batch[];

  // Modal correction state
  const [correctingBatch, setCorrectingBatch] = useState<Batch | null>(null);
  const [correctForm, setCorrectForm] = useState({
    weightKg: 0,
    plasticWeightKg: 0,
    metalWeightKg: 0,
    glassWeightKg: 0,
    quality: 'Medium' as 'Good' | 'Medium' | 'Poor',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const filtered = visibleVerified.filter(b => 
    b.id.toLowerCase().includes(search.toLowerCase()) ||
    b.sourceLocation.toLowerCase().includes(search.toLowerCase()) ||
    (b.driverName || '').toLowerCase().includes(search.toLowerCase()) ||
    (b.verificationProof || '').toLowerCase().includes(search.toLowerCase())
  );

  const getRecyclerName = (id?: string) => {
    if (!id) return 'Unknown Recycler';
    return recyclers.find(r => r.id === id)?.name ?? id;
  };

  const handleReopen = (batch: Batch) => {
    updateBatch(batch.id, {
      status: 'DELIVERED',
      timestamps: {
        ...batch.timestamps,
        verified: undefined,
      },
      modifiedBy: user?.displayName || 'Admin',
    });

    addActivity({
      type: 'verification',
      description: `Verified Batch ${batch.id} was reopened by Admin.`,
      userId: user?.id || 'system',
      batchId: batch.id,
    });
  };

  const handleOpenCorrection = (batch: Batch) => {
    setCorrectForm({
      weightKg: batch.weightKg,
      plasticWeightKg: batch.plasticWeightKg,
      metalWeightKg: batch.metalWeightKg || 0,
      glassWeightKg: batch.glassWeightKg || 0,
      quality: batch.quality || 'Medium',
    });
    setErrorMsg('');
    setCorrectingBatch(batch);
  };

  const submitCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingBatch) return;

    if (correctForm.weightKg <= 0) {
      setErrorMsg('Weight must be greater than 0 kg.');
      return;
    }
    if (correctForm.plasticWeightKg < 0) {
      setErrorMsg('Plastic weight cannot be negative.');
      return;
    }
    if (correctForm.plasticWeightKg > correctForm.weightKg) {
      setErrorMsg('Plastic weight cannot exceed total weight.');
      return;
    }

    updateBatch(correctingBatch.id, {
      weightKg: correctForm.weightKg,
      plasticWeightKg: correctForm.plasticWeightKg,
      metalWeightKg: correctForm.metalWeightKg || undefined,
      glassWeightKg: correctForm.glassWeightKg || undefined,
      quality: correctForm.quality,
      modifiedBy: user?.displayName || 'Admin',
    });

    addActivity({
      type: 'verification',
      description: `Verified Batch ${correctingBatch.id} weights corrected by Admin`,
      userId: user?.id || 'system',
      batchId: correctingBatch.id,
    });

    setCorrectingBatch(null);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="verified-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Search and control bar */}
      <div className="bins-controls" style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ flex: '1 1 300px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by Batch ID, Recycler notes, location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center' }}>
          Showing {filtered.length} verified cargo logs
        </span>
      </div>

      {/* Main verified cards layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {filtered.map((batch) => (
          <div 
            key={batch.id} 
            className="card"
            style={{ 
              border: '1px solid rgba(34, 197, 94, 0.25)', 
              background: 'linear-gradient(135deg, var(--surface) 0%, rgba(34, 197, 94, 0.02) 100%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--green-400)' }}>{batch.id}</span>
                  <span style={{ fontSize: '11px', background: 'var(--surface-3)', color: 'var(--green-400)', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>
                    VERIFIED &amp; AUDITED
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  Source ID: <strong>{batch.source}</strong> ({batch.sourceLocation})
                </div>
              </div>
              
              <div style={{ textAlign: 'right', fontSize: '12px' }}>
                <div style={{ color: 'var(--text-muted)' }}>Verified On</div>
                <strong style={{ color: 'var(--text)' }}>{formatDateTime(batch.timestamps.verified)}</strong>
              </div>
            </div>

            {/* Recycler confirmation details */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Recycler Partner</span>
                <div style={{ fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                  {getRecyclerName(batch.assignedRecyclerId)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Verification Statement</span>
                <div style={{ color: 'var(--green-400)', fontWeight: 500, fontSize: '12px', marginTop: '2px' }}>
                  ✓ {batch.verificationProof || 'Weights and composition audited and confirmed by facility scale.'}
                </div>
              </div>
            </div>

            {/* Weights, Delivery proofs, Audit, and Timeline */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', fontSize: '12px' }}>
              
              {/* Materials summary */}
              <div>
                <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Cargo Weights</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Total Weight:</span>
                    <strong style={{ color: 'var(--text)' }}>{batch.weightKg} kg</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Recyclable Plastic:</span>
                    <strong style={{ color: 'var(--text)' }}>{batch.plasticWeightKg} kg</strong>
                  </div>
                  {(batch.metalWeightKg ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Recyclable Metal:</span>
                      <strong style={{ color: 'var(--text)' }}>{batch.metalWeightKg} kg</strong>
                    </div>
                  )}
                  {(batch.glassWeightKg ?? 0) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Recyclable Glass:</span>
                      <strong style={{ color: 'var(--text)' }}>{batch.glassWeightKg} kg</strong>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--green-400)', fontWeight: 600, borderTop: '1px dashed var(--border)', paddingTop: '4px' }}>
                    <span>CO₂ Saved:</span>
                    <span>{(batch.plasticWeightKg * 3.0).toFixed(1)} kg</span>
                  </div>
                </div>
              </div>

              {/* Delivery Proof */}
              <div>
                <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Logistics Proof</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <UserIcon size={12} style={{ color: 'var(--primary)' }} />
                    <span>Driver: <strong>{batch.driverName || '—'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Truck size={12} style={{ color: 'var(--primary)' }} />
                    <span>Vehicle ID: <strong>{batch.vehicleId || '—'}</strong></span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: batch.audit.qrVerified ? 'var(--green-400)' : 'var(--text-dim)' }}>
                      <QrCode size={11} /> QR Match
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: batch.audit.gpsLogged ? 'var(--green-400)' : 'var(--text-dim)' }}>
                      <MapPin size={11} /> GPS Log
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', color: batch.audit.photoVerified ? 'var(--green-400)' : 'var(--text-dim)' }}>
                      <Camera size={11} /> Photo Audit
                    </span>
                  </div>
                </div>
              </div>

              {/* Operations Timestamps */}
              <div>
                <strong style={{ display: 'block', color: 'var(--text)', marginBottom: '6px', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>Timeline Logs</strong>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-muted)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Created:</span>
                    <span>{formatDateTime(batch.timestamps.created)}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Delivered:</span>
                    <span>{formatDateTime(batch.timestamps.delivered)}</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Audit History Panel */}
            {batch.history && batch.history.length > 0 && (
              <div style={{ borderTop: '1px dashed var(--border)', paddingTop: '8px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}>
                  <History size={12} /> Audit Revision Panel
                </span>
                <div className="audit-history-panel" style={{ margin: '4px 0 0 0', padding: '10px', maxHeight: '100px', overflowY: 'auto' }}>
                  {batch.history.map((h, i) => (
                    <div key={i} className="audit-log-item">
                      <div className="audit-log-meta">
                        <strong>{h.modifiedBy}</strong>
                        <span>{new Date(h.timestamp).toLocaleString()}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--red-400)' }}>{h.prevValues}</span> &rarr; <span style={{ color: 'var(--green-400)' }}>{h.newValues}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Admin actions */}
            {isAdmin && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '8px', display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                <button 
                  className="btn-secondary"
                  onClick={() => handleOpenCorrection(batch)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px' }}
                >
                  <Edit3 size={12} /> Correct Ledger Weights
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => handleReopen(batch)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '12px', color: 'var(--amber-400)', borderColor: 'rgba(245,158,11,0.2)' }}
                >
                  <RotateCcw size={12} /> Reopen Verification
                </button>
              </div>
            )}

          </div>
        ))}

        {filtered.length === 0 && (
          <div style={{ padding: '48px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            No verified batch logs match your query.
          </div>
        )}
      </div>

      {/* ── MODAL: EDIT/CORRECT VERIFIED BATCH (ADMIN ONLY) ── */}
      {correctingBatch && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Edit3 size={20} style={{ color: 'var(--primary)' }} />
                <h2>Correct Ledger Weights: {correctingBatch.id}</h2>
              </div>
              <button className="btn-close" onClick={() => setCorrectingBatch(null)}><X size={20} /></button>
            </div>
            <form onSubmit={submitCorrection}>
              <div className="wizard-body">
                {errorMsg && <div className="wizard-error">{errorMsg}</div>}
                
                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Total Waste Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.1"
                    value={correctForm.weightKg}
                    onChange={e => setCorrectForm({ ...correctForm, weightKg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '12px' }}>
                  <label>Plastic Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.1"
                    value={correctForm.plasticWeightKg}
                    onChange={e => setCorrectForm({ ...correctForm, plasticWeightKg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-grid-2" style={{ marginBottom: '12px' }}>
                  <div className="form-group">
                    <label>Metal Weight (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      value={correctForm.metalWeightKg}
                      onChange={e => setCorrectForm({ ...correctForm, metalWeightKg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Glass Weight (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      value={correctForm.glassWeightKg}
                      onChange={e => setCorrectForm({ ...correctForm, glassWeightKg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Segregation Quality</label>
                  <select
                    className="form-control"
                    value={correctForm.quality}
                    onChange={e => setCorrectForm({ ...correctForm, quality: e.target.value as any })}
                  >
                    <option value="Good">Good</option>
                    <option value="Medium">Medium</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn-secondary" onClick={() => setCorrectingBatch(null)}>Cancel</button>
                <button type="submit" className="btn-primary">Apply Ledger Correction</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
