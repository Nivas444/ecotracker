import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { 
  Package, MapPin, ShieldCheck, 
  Edit3, X, Plus 
} from 'lucide-react';
import { createManualBatch, advanceBatchStatus, getStatusLabel, STATUS_ORDER } from '../../utils/batchUtils';
import type { Batch, BatchStatus } from '../../types';

export function BatchOperationsPage() {
  const { bins, batches, routes, addBatch, updateBatch, addActivity } = useAppState();
  const { user } = useAuth();

  const [isAddBatchModalOpen, setIsAddBatchModalOpen] = useState(false);
  const [formError, setFormError] = useState('');

  // ── COMPACT ADD BATCH FORM STATE ──
  const [newBatchForm, setNewBatchForm] = useState({
    binId: '',
    routeId: '',
    timestamp: new Date().toISOString().slice(0, 16),
    weightKg: 0,
    plasticWeightKg: 0,
    metalWeightKg: 0,
    glassWeightKg: 0,
    quality: 'Medium' as 'Good' | 'Medium' | 'Poor',
    deliveryStatus: 'CREATED' as BatchStatus,
  });

  // ── OPERATIONS MODALS STATE ──
  const [verifyingBatch, setVerifyingBatch] = useState<Batch | null>(null);
  const [verifyForm, setVerifyForm] = useState({
    verificationProof: 'Facility sorting checked. Weight verified on entry scale.',
    qrVerified: true,
    gpsLogged: true,
    photoVerified: true,
  });

  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  const [editForm, setEditForm] = useState({
    weightKg: 0,
    plasticWeightKg: 0,
    metalWeightKg: 0,
    glassWeightKg: 0,
    quality: 'Medium' as 'Good' | 'Medium' | 'Poor',
  });

  const [opError, setOpError] = useState('');

  const eligibleBins = bins.filter(b => !b.archived);

  // ── AUTO-FILL DETAILS HANDLER ──
  const handleBinSelect = (binId: string) => {
    const selectedBin = bins.find(b => b.id === binId);
    if (!selectedBin) {
      setNewBatchForm(prev => ({
        ...prev,
        binId,
        routeId: '',
        weightKg: 0,
        plasticWeightKg: 0,
        metalWeightKg: 0,
        glassWeightKg: 0,
      }));
      return;
    }

    // Find assigned route
    let assignedRouteId = selectedBin.assignedRouteId || '';
    if (!assignedRouteId) {
      // Fallback: search active routes to find if this bin is assigned
      const matchingRoute = routes.find(r => r.assignedBins.some(ab => ab.binId === selectedBin.id));
      if (matchingRoute) {
        assignedRouteId = matchingRoute.id;
      }
    }

    if (assignedRouteId) {
      const plasticWeight = selectedBin.categories.find(c => c.name === 'plastic')?.weightKg || 0;
      const metalWeight = selectedBin.categories.find(c => c.name === 'metal')?.weightKg || 0;
      const glassWeight = selectedBin.categories.find(c => c.name === 'glass')?.weightKg || 0;

      setNewBatchForm(prev => ({
        ...prev,
        binId,
        routeId: assignedRouteId,
        weightKg: selectedBin.weightKg || 0,
        plasticWeightKg: plasticWeight,
        metalWeightKg: metalWeight,
        glassWeightKg: glassWeight,
      }));
    } else {
      setNewBatchForm(prev => ({
        ...prev,
        binId,
        routeId: '',
        weightKg: 0,
        plasticWeightKg: 0,
        metalWeightKg: 0,
        glassWeightKg: 0,
      }));
    }
  };

  // ── ADD BATCH HANDLER ──
  const handleAddBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newBatchForm.binId) {
      setFormError('Please select a source smart bin.');
      return;
    }
    if (!newBatchForm.routeId) {
      setFormError('Please assign this batch to an active route.');
      return;
    }
    if (newBatchForm.weightKg <= 0) {
      setFormError('Total weight must be greater than 0 kg.');
      return;
    }
    if (newBatchForm.plasticWeightKg < 0) {
      setFormError('Plastic weight cannot be negative.');
      return;
    }
    if (newBatchForm.plasticWeightKg > newBatchForm.weightKg) {
      setFormError('Plastic weight cannot exceed total weight.');
      return;
    }
    const otherKg = (newBatchForm.metalWeightKg || 0) + (newBatchForm.glassWeightKg || 0);
    if (newBatchForm.plasticWeightKg + otherKg > newBatchForm.weightKg) {
      setFormError('Sum of recyclable weights cannot exceed total weight.');
      return;
    }

    const selectedBin = bins.find(b => b.id === newBatchForm.binId);
    if (!selectedBin || !user) return;

    const matchedRoute = routes.find(r => r.id === newBatchForm.routeId);

    const batch = createManualBatch({
      bin: selectedBin,
      weightKg: newBatchForm.weightKg,
      plasticWeightKg: newBatchForm.plasticWeightKg,
      metalWeightKg: newBatchForm.metalWeightKg || undefined,
      glassWeightKg: newBatchForm.glassWeightKg || undefined,
      quality: newBatchForm.quality,
      timestamp: new Date(newBatchForm.timestamp).toISOString(),
      ownerId: user.id,
    });

    // Attach route fields and set status
    batch.routeId = newBatchForm.routeId;
    batch.status = newBatchForm.deliveryStatus;
    if (matchedRoute) {
      batch.driverName = matchedRoute.driverName;
      batch.vehicleId = matchedRoute.vehicleNumber;
    }

    if (newBatchForm.deliveryStatus === 'DELIVERED') {
      batch.timestamps.delivered = new Date().toISOString();
    } else if (newBatchForm.deliveryStatus === 'VERIFIED') {
      batch.timestamps.delivered = new Date().toISOString();
      batch.timestamps.verified = new Date().toISOString();
      batch.verificationProof = 'Pre-verified during manual collection entry.';
    }

    addBatch(batch);
    addActivity({
      type: 'collection',
      description: `Batch ${batch.id} logged from bin ${selectedBin.id} (${selectedBin.customerName || selectedBin.location}) — status: ${batch.status}`,
      userId: user.id,
      batchId: batch.id,
    });

    setIsAddBatchModalOpen(false);
    setNewBatchForm({
      binId: '',
      routeId: '',
      timestamp: new Date().toISOString().slice(0, 16),
      weightKg: 0,
      plasticWeightKg: 0,
      metalWeightKg: 0,
      glassWeightKg: 0,
      quality: 'Medium',
      deliveryStatus: 'CREATED' as BatchStatus,
    });
  };

  // ── PIPELINE FLOW TRIGGERS ──
  const handleTriggerAdvance = (batch: Batch) => {
    if (!batch.weightKg || batch.weightKg <= 0) {
      setOpError(`Please enter the weight for batch ${batch.id} before advancing it.`);
      handleOpenEdit(batch);
      return;
    }

    const nextIdx = STATUS_ORDER.indexOf(batch.status) + 1;
    const nextStatus = STATUS_ORDER[nextIdx];

    if (nextStatus === 'VERIFIED') {
      setVerifyForm({
        verificationProof: 'Facility sorting checked. Weight verified on entry scale.',
        qrVerified: true,
        gpsLogged: true,
        photoVerified: true,
      });
      setVerifyingBatch(batch);
    } else {
      // Just advance to DELIVERED directly
      const updated = advanceBatchStatus(batch);
      updateBatch(batch.id, updated);
      
      addActivity({
        type: 'delivery',
        description: `Batch ${batch.id} advanced to ${getStatusLabel(updated.status)}`,
        userId: user?.id || 'system',
        batchId: batch.id,
      });
    }
  };



  const submitVerification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyingBatch) return;

    if (!verifyForm.verificationProof.trim()) {
      setOpError('Verification proof notes are required.');
      return;
    }

    const updated: Batch = {
      ...verifyingBatch,
      status: 'VERIFIED',
      verificationProof: verifyForm.verificationProof.trim(),
      audit: {
        qrVerified: verifyForm.qrVerified,
        gpsLogged: verifyForm.gpsLogged,
        photoVerified: verifyForm.photoVerified,
      },
      timestamps: {
        ...verifyingBatch.timestamps,
        verified: new Date().toISOString(),
      }
    };

    updateBatch(verifyingBatch.id, updated);
    addActivity({
      type: 'verification',
      description: `Batch ${verifyingBatch.id} processed internally at Green Carib Facility (CO₂ Saved: ${(verifyingBatch.plasticWeightKg * 3.0).toFixed(1)} kg)`,
      userId: user?.id || 'system',
      batchId: verifyingBatch.id,
    });

    setVerifyingBatch(null);
    setOpError('');
  };

  const handleReopenBatch = (batch: Batch) => {
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
      description: `Batch ${batch.id} internal verification reopened.`,
      userId: user?.id || 'system',
      batchId: batch.id,
    });
  };

  const handleOpenEdit = (batch: Batch) => {
    setEditForm({
      weightKg: batch.weightKg,
      plasticWeightKg: batch.plasticWeightKg,
      metalWeightKg: batch.metalWeightKg || 0,
      glassWeightKg: batch.glassWeightKg || 0,
      quality: batch.quality || 'Medium',
    });
    setOpError('');
    setEditingBatch(batch);
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    if (editForm.weightKg <= 0) {
      setOpError('Total weight must be greater than 0 kg.');
      return;
    }
    if (editForm.plasticWeightKg < 0) {
      setOpError('Plastic weight cannot be negative.');
      return;
    }
    if (editForm.plasticWeightKg > editForm.weightKg) {
      setOpError('Plastic weight cannot exceed total weight.');
      return;
    }
    const otherKg = (editForm.metalWeightKg || 0) + (editForm.glassWeightKg || 0);
    if (editForm.plasticWeightKg + otherKg > editForm.weightKg) {
      setOpError('Sum of materials cannot exceed total weight.');
      return;
    }

    updateBatch(editingBatch.id, {
      weightKg: editForm.weightKg,
      plasticWeightKg: editForm.plasticWeightKg,
      metalWeightKg: editForm.metalWeightKg || undefined,
      glassWeightKg: editForm.glassWeightKg || undefined,
      quality: editForm.quality,
      modifiedBy: user?.displayName || 'Operator',
    });

    addActivity({
      type: 'collection',
      description: `Batch ${editingBatch.id} details corrected by ${user?.displayName || 'Operator'}`,
      userId: user?.id || 'system',
      batchId: editingBatch.id,
    });

    setEditingBatch(null);
    setOpError('');
  };

  return (
    <div className="batch-operations-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      <div className="card-header" style={{ marginBottom: 0, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Package size={20} className="card-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="card-title">Operational Collection Records</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span className="card-count" style={{ whiteSpace: 'nowrap' }}>{batches.length} Batches Tracked</span>
          <button 
            className="btn btn-primary" 
            onClick={() => { setFormError(''); setIsAddBatchModalOpen(true); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={16} /> Add Batch
          </button>
        </div>
      </div>

      {/* Columns Board view */}
      <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
        {STATUS_ORDER.map((status: BatchStatus) => {
          const columnBatches = batches.filter(b => b.status === status);
          const columnColors: Record<BatchStatus, string> = {
            CREATED: 'var(--amber-500)',
            COLLECTED: 'var(--amber-500)',
            DELIVERED: 'var(--green-400)',
            VERIFIED: 'var(--green-500)',
          };

          return (
            <div key={status} style={{ minWidth: '300px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Column Header */}
              <div style={{
                padding: '10px 14px',
                background: 'var(--surface-2)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                borderLeft: `3px solid ${columnColors[status]}`,
                borderRight: '1px solid var(--border)',
                borderTop: '1px solid var(--border)',
                borderBottom: '1px solid var(--border)',
                color: 'var(--text)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}>
                <span>{getStatusLabel(status)}</span>
                <span style={{ fontSize: '11px', background: 'var(--surface-3)', padding: '2px 8px', borderRadius: '12px' }}>
                  {columnBatches.length}
                </span>
              </div>

              {/* Batch list */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '70vh' }}>
                {columnBatches.map(batch => {
                  const isVerified = batch.status === 'VERIFIED';
                  return (
                    <div 
                      key={batch.id} 
                      className="card" 
                      style={{ 
                        margin: 0, 
                        padding: '12px',
                        border: isVerified ? '1px solid rgba(51, 126, 105, 0.3)' : '1px solid var(--border)',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    >
                      
                      {/* Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontWeight: 700, fontSize: '13px', color: isVerified ? 'var(--green-400)' : 'var(--primary)' }}>
                          {batch.id}{isVerified && ' — VERIFIED'}
                        </span>
                      </div>

                      {/* Location details */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text)', marginBottom: '8px' }}>
                        <MapPin size={12} style={{ color: 'var(--primary)' }} />
                        <span>{batch.sourceLocation} ({batch.source})</span>
                      </div>

                      {/* Weights grid info */}
                      <div style={{ background: 'var(--surface-2)', padding: '8px', borderRadius: '6px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Total Weight:</span>
                          <strong>
                            {batch.weightKg === 0 ? (
                              <span style={{ color: 'var(--amber-400)', fontWeight: 600 }}>⚠️ Pending Weight</span>
                            ) : (
                              `${batch.weightKg} kg`
                            )}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: 'var(--text-muted)' }}>Plastic Recycled:</span>
                          <strong>{batch.plasticWeightKg} kg</strong>
                        </div>
                        {(batch.metalWeightKg ?? 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Metal Recycled:</span>
                            <strong>{batch.metalWeightKg} kg</strong>
                          </div>
                        )}
                        {(batch.glassWeightKg ?? 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Glass Recycled:</span>
                            <strong>{batch.glassWeightKg} kg</strong>
                          </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border)', paddingTop: '4px', color: 'var(--green-400)', fontWeight: 600 }}>
                          <span>Est. CO₂ Offset:</span>
                          <span>~{(batch.plasticWeightKg * 3.0).toFixed(1)} kg</span>
                        </div>
                      </div>

                      {/* Driver assignment details */}
                      {(batch.driverName && batch.driverName !== 'Pending Assignment') && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '11px', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '6px', marginTop: '6px' }}>
                          <div>Driver: <strong style={{ color: 'var(--text)' }}>{batch.driverName}</strong></div>
                          <div>Vehicle Plate: <strong style={{ color: 'var(--text)' }}>{batch.vehicleId}</strong></div>
                        </div>
                      )}

                      {/* Verification proofs */}
                      {isVerified && batch.verificationProof && (
                        <div style={{ background: 'rgba(34,197,94,0.05)', padding: '6px', borderRadius: '4px', border: '1px solid rgba(34,197,94,0.1)', color: 'var(--green-400)', fontSize: '11px', marginTop: '6px' }}>
                          ✓ {batch.verificationProof}
                        </div>
                      )}

                      {/* Timeline stamps */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-dim)', marginTop: '8px' }}>
                        <span>Created: {new Date(batch.timestamps.created).toLocaleDateString()}</span>
                      </div>

                      {/* Action buttons on Card */}
                      <div style={{ display: 'flex', gap: '6px', marginTop: '10px' }}>
                        {(!isVerified) && (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleOpenEdit(batch)}
                            style={{ 
                              flex: 1, 
                              height: '28px', 
                              padding: 0, 
                              fontSize: '11px', 
                              borderRadius: '4px',
                              borderColor: batch.weightKg === 0 ? 'var(--amber-500)' : 'var(--border)',
                              color: batch.weightKg === 0 ? 'var(--amber-400)' : 'inherit',
                              fontWeight: batch.weightKg === 0 ? 'bold' : 'normal'
                            }}
                          >
                            <Edit3 size={11} /> {batch.weightKg === 0 ? 'Enter Weight' : 'Correct'}
                          </button>
                        )}
                        
                        {!isVerified && (
                          <button 
                            className="btn btn-primary"
                            onClick={() => handleTriggerAdvance(batch)}
                            style={{ flex: 2, height: '28px', padding: 0, fontSize: '11px', borderRadius: '4px' }}
                          >
                            Advance &rarr;
                          </button>
                        )}

                        {isVerified && (
                          <button 
                            className="btn btn-secondary"
                            onClick={() => handleReopenBatch(batch)}
                            style={{ flex: 1, height: '28px', padding: 0, fontSize: '11px', color: 'var(--amber-400)', borderColor: 'rgba(245,158,11,0.2)', borderRadius: '4px' }}
                          >
                            Reopen
                          </button>
                        )}
                      </div>

                    </div>
                  );
                })}

                {columnBatches.length === 0 && (
                  <div style={{ padding: '16px', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px' }}>
                    No collections here
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* ── ADD BATCH MODAL (COMPACT SINGLE PAGE FORM) ── */}
      {isAddBatchModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Package size={20} style={{ color: 'var(--primary)' }} />
                <h2>Log Waste Collection</h2>
              </div>
              <button className="btn-close" onClick={() => setIsAddBatchModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddBatchSubmit}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && <div className="wizard-error">{formError}</div>}

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Hotel / Source Bin <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={newBatchForm.binId}
                      onChange={e => handleBinSelect(e.target.value)}
                      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    >
                      <option value="">-- Select Hotel --</option>
                      {eligibleBins.map(b => (
                        <option key={b.id} value={b.id}>{b.customerName || b.location} ({b.id})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Collection Route <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={newBatchForm.routeId}
                      onChange={e => setNewBatchForm({ ...newBatchForm, routeId: e.target.value })}
                      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    >
                      <option value="">-- Select Route --</option>
                      {routes.map(r => (
                        <option key={r.id} value={r.id}>{r.routeName} ({r.id})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Collection Date &amp; Time <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={newBatchForm.timestamp}
                      onChange={e => setNewBatchForm({ ...newBatchForm, timestamp: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Delivery Status <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={newBatchForm.deliveryStatus}
                      onChange={e => setNewBatchForm({ ...newBatchForm, deliveryStatus: e.target.value as BatchStatus })}
                      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    >
                      <option value="COLLECTED">Collected</option>
                      <option value="DELIVERED">Delivered to Facility</option>
                      <option value="VERIFIED">Verified &amp; Audited</option>
                    </select>
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Total Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      placeholder="e.g. 50"
                      value={newBatchForm.weightKg || ''}
                      onChange={e => setNewBatchForm({ ...newBatchForm, weightKg: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Plastic Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      placeholder="e.g. 20"
                      value={newBatchForm.plasticWeightKg || ''}
                      onChange={e => setNewBatchForm({ ...newBatchForm, plasticWeightKg: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Metal (kg, Optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      placeholder="0"
                      value={newBatchForm.metalWeightKg || ''}
                      onChange={e => setNewBatchForm({ ...newBatchForm, metalWeightKg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Glass (kg, Optional)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      placeholder="0"
                      value={newBatchForm.glassWeightKg || ''}
                      onChange={e => setNewBatchForm({ ...newBatchForm, glassWeightKg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Collection Quality</label>
                  <select
                    className="form-control"
                    value={newBatchForm.quality}
                    onChange={e => setNewBatchForm({ ...newBatchForm, quality: e.target.value as any })}
                    style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                  >
                    <option value="Good">Good Segregation</option>
                    <option value="Medium">Medium Segregation</option>
                    <option value="Poor">Poor Segregation</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddBatchModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Collection</button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* ── MODAL: VERIFY INTERNAL FACILITY DELIVERY ── */}
      {verifyingBatch && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '420px', width: '95%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <ShieldCheck size={20} style={{ color: 'var(--green-500)' }} />
                <h2>Green Carib Facility Audit: {verifyingBatch.id}</h2>
              </div>
              <button type="button" className="btn-close" onClick={() => setVerifyingBatch(null)}><X size={20} /></button>
            </div>
            <form onSubmit={submitVerification}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {opError && <div className="wizard-error">{opError}</div>}
                
                <div style={{ background: 'var(--surface-2)', padding: '10px', borderRadius: '6px', fontSize: '12px', border: '1px solid var(--border)' }}>
                  <strong>Destination:</strong> Green Carib Processing Facility<br />
                  <strong>Audited Weight:</strong> {verifyingBatch.weightKg} kg (Plastic: {verifyingBatch.plasticWeightKg} kg)
                </div>

                <div className="form-group">
                  <label>Verification Statement <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <textarea
                    className="form-control"
                    rows={3}
                    value={verifyForm.verificationProof}
                    onChange={e => setVerifyForm({ ...verifyForm, verificationProof: e.target.value })}
                    required
                    style={{ background: 'var(--surface-2)', color: 'var(--text)', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={verifyForm.qrVerified}
                      onChange={e => setVerifyForm({ ...verifyForm, qrVerified: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Barcode / QR Scan Match Confirmed
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={verifyForm.gpsLogged}
                      onChange={e => setVerifyForm({ ...verifyForm, gpsLogged: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Vehicle GPS Transit Route Matches Log
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={verifyForm.photoVerified}
                      onChange={e => setVerifyForm({ ...verifyForm, photoVerified: e.target.checked })}
                      style={{ accentColor: 'var(--primary)' }}
                    />
                    Manual Sort Visual Audit Complete
                  </label>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setVerifyingBatch(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ background: 'var(--green-600)' }}>Verify &amp; Store</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: CORRECT BATCH WEIGHTS ── */}
      {editingBatch && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '400px', width: '95%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Edit3 size={20} style={{ color: 'var(--primary)' }} />
                <h2>Correct Log Entry: {editingBatch.id}</h2>
              </div>
              <button type="button" className="btn-close" onClick={() => setEditingBatch(null)}><X size={20} /></button>
            </div>
            <form onSubmit={submitEdit}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {opError && <div className="wizard-error">{opError}</div>}
                
                <div className="form-group">
                  <label>Total Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.1"
                    value={editForm.weightKg}
                    onChange={e => setEditForm({ ...editForm, weightKg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Plastic Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="number"
                    className="form-control"
                    step="0.1"
                    value={editForm.plasticWeightKg}
                    onChange={e => setEditForm({ ...editForm, plasticWeightKg: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Metal (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      value={editForm.metalWeightKg}
                      onChange={e => setEditForm({ ...editForm, metalWeightKg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Glass (kg)</label>
                    <input
                      type="number"
                      className="form-control"
                      step="0.1"
                      value={editForm.glassWeightKg}
                      onChange={e => setEditForm({ ...editForm, glassWeightKg: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Collection Quality</label>
                  <select
                    className="form-control"
                    value={editForm.quality}
                    onChange={e => setEditForm({ ...editForm, quality: e.target.value as any })}
                  >
                    <option value="Good">Good</option>
                    <option value="Medium">Medium</option>
                    <option value="Poor">Poor</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setEditingBatch(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Corrections</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
