import { useState } from 'react';
import {
  Package,
  Plus,
  ChevronRight,
  QrCode,
  MapPin,
  Camera,
  Check,
  User as UserIcon,
  Truck,
  Recycle,
  Clock,
} from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import {
  advanceBatchStatus,
  getStatusLabel,
  STATUS_ORDER,
  filterByRole,
} from '../../utils/batchUtils';
import type { BatchStatus } from '../../types';
import { BatchCreationWizard } from './BatchCreationWizard';

// ── Status color map ──────────────────────────────────────────

const STATUS_COLORS: Record<BatchStatus, string> = {
  CREATED: '#f59e0b',
  COLLECTED: '#f59e0b',
  DELIVERED: '#14b8a6',
  VERIFIED: '#22c55e',
};

export function BatchTrackingPanel() {
  const { batches, recyclers, updateBatch, addActivity } = useAppState();
  const { user } = useAuth();

  const isAdmin = user?.role === 'admin';
  const filteredBatches = filterByRole(batches, user, 'batch');
  const [isWizardOpen, setIsWizardOpen] = useState(false);

  const handleAdvance = (batchId: string) => {
    const batch = batches.find(b => b.id === batchId);
    if (!batch) return;
    const updated = advanceBatchStatus(batch);
    updateBatch(batchId, updated);

    // Determine activity type from new status
    const actType =
      updated.status === 'COLLECTED' ? 'pickup' :
      updated.status === 'DELIVERED' ? 'delivery' :
      updated.status === 'VERIFIED' ? 'verification' : 'collection';

    addActivity({
      type: actType,
      description: `${batchId} → ${getStatusLabel(updated.status)}`,
      userId: user?.id || 'system',
      batchId,
    });
  };

  const formatTime = (iso?: string) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getRecyclerName = (recyclerId?: string) => {
    if (!recyclerId) return '—';
    return recyclers.find(r => r.id === recyclerId)?.name ?? recyclerId;
  };

  return (
    <div className="card batch-panel" style={{ overflowX: 'hidden' }}>
      <div className="card-header">
        <Package size={18} className="card-icon" />
        <h2 className="card-title">Batch Pipeline</h2>
        <span className="card-count">{filteredBatches.length} batches</span>
        <button
          className="btn-primary btn-generate"
          onClick={() => setIsWizardOpen(true)}
          id="generate-batch-btn"
        >
          <Plus size={14} />
          New Batch
        </button>
      </div>

      {/* Pipeline legend */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {STATUS_ORDER.map((s: BatchStatus) => (
          <span
            key={s}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '12px',
              background: `${STATUS_COLORS[s]}18`,
              color: STATUS_COLORS[s],
              fontWeight: 600,
              border: `1px solid ${STATUS_COLORS[s]}40`,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: STATUS_COLORS[s], display: 'inline-block' }} />
            {getStatusLabel(s)}
          </span>
        ))}
      </div>

      {filteredBatches.length === 0 ? (
        <div className="batch-empty">
          <Package size={32} className="batch-empty-icon" />
          <p>No batches yet. Click <strong>New Batch</strong> to log a waste collection.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px' }}>
          {STATUS_ORDER.map((status: BatchStatus) => {
            const columnBatches = filteredBatches.filter(b => b.status === status);
            return (
              <div key={status} style={{ minWidth: '300px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Column header */}
                <div style={{
                  padding: '8px 12px',
                  background: `${STATUS_COLORS[status]}12`,
                  borderRadius: '6px',
                  fontWeight: 700,
                  fontSize: '13px',
                  border: `1px solid ${STATUS_COLORS[status]}30`,
                  color: STATUS_COLORS[status],
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}>
                  {getStatusLabel(status)}
                  <span style={{
                    fontSize: '12px',
                    background: 'var(--surface)',
                    color: 'var(--text-muted)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    border: '1px solid var(--border)',
                  }}>
                    {columnBatches.length}
                  </span>
                </div>

                {columnBatches.map(batch => {
                  const isComplete = batch.status === 'VERIFIED';
                  return (
                    <div key={batch.id} className="batch-card" style={{ margin: 0 }}>
                      {/* Header row */}
                      <div className="batch-card-header">
                        <div className="batch-card-id">
                          <span className="batch-id-tag">{batch.id}</span>
                          <span className="batch-source">from {batch.source}</span>
                        </div>
                        <span
                          className="batch-weight"
                          style={{ fontSize: '12px', color: 'var(--text-muted)' }}
                        >
                          {batch.weightKg} kg
                        </span>
                      </div>

                      {/* Location */}
                      <div className="batch-location">
                        <MapPin size={13} />
                        <span>{batch.sourceLocation}</span>
                      </div>

                      {/* Plastic / CO₂ row */}
                      <div style={{ display: 'flex', gap: '12px', marginTop: '8px', fontSize: '12px', color: 'var(--text-muted)' }}>
                        <span>
                          <Recycle size={12} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                          {batch.plasticWeightKg} kg plastic
                        </span>
                        <span style={{ color: '#22c55e' }}>
                          ~{(batch.plasticWeightKg * 3.0).toFixed(1)} kg CO₂ saved
                        </span>
                      </div>

                      {/* Quality badge */}
                      {batch.quality && (
                        <div style={{ marginTop: '6px' }}>
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            background:
                              batch.quality === 'Good' ? 'rgba(34,197,94,0.15)' :
                              batch.quality === 'Medium' ? 'rgba(245,158,11,0.15)' :
                              'rgba(239,68,68,0.15)',
                            color:
                              batch.quality === 'Good' ? '#16a34a' :
                              batch.quality === 'Medium' ? '#d97706' :
                              '#dc2626',
                          }}>
                            {batch.quality}
                          </span>
                        </div>
                      )}

                      {/* ADMIN-ONLY details */}
                      {isAdmin && (
                        <>
                          <div className="batch-admin-details" style={{ display: 'flex', gap: '12px', marginTop: '10px', fontSize: '12px', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <UserIcon size={12} />
                              {batch.driverName || '—'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Truck size={12} />
                              {batch.vehicleId || '—'}
                            </div>
                          </div>

                          {/* Assigned recycler */}
                          {batch.assignedRecyclerId && (
                            <div style={{ marginTop: '6px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', color: '#6366f1' }}>
                              <Recycle size={12} />
                              {getRecyclerName(batch.assignedRecyclerId)}
                            </div>
                          )}

                          {/* Verification proof */}
                          {batch.status === 'VERIFIED' && batch.verificationProof && (
                            <div style={{ marginTop: '6px', fontSize: '11px', color: '#22c55e' }}>
                              ✅ {batch.verificationProof}
                            </div>
                          )}

                          {/* Audit row */}
                          <div className="audit-row" style={{ marginTop: '10px' }}>
                            <div className={`audit-item ${batch.audit.qrVerified ? 'audit-item--pass' : 'audit-item--fail'}`}>
                              <QrCode size={14} />
                              <span>QR</span>
                              {batch.audit.qrVerified ? <Check size={12} /> : <span>✗</span>}
                            </div>
                            <div className={`audit-item ${batch.audit.gpsLogged ? 'audit-item--pass' : 'audit-item--fail'}`}>
                              <MapPin size={14} />
                              <span>GPS</span>
                              {batch.audit.gpsLogged ? <Check size={12} /> : <span>✗</span>}
                            </div>
                            <div className={`audit-item ${batch.audit.photoVerified ? 'audit-item--pass' : 'audit-item--fail'}`}>
                              <Camera size={14} />
                              <span>Photo</span>
                              {batch.audit.photoVerified ? <Check size={12} /> : <span>✗</span>}
                            </div>
                          </div>
                        </>
                      )}

                      {/* Timestamps */}
                      <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                          <Clock size={11} /> Created
                        </span>
                        <span>{formatTime(batch.timestamps.created)}</span>
                      </div>
                      {batch.timestamps.delivered && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Delivered</span>
                          <span>{formatTime(batch.timestamps.delivered)}</span>
                        </div>
                      )}
                      {batch.timestamps.verified && (
                        <div style={{ fontSize: '11px', color: '#22c55e', display: 'flex', justifyContent: 'space-between' }}>
                          <span>Verified</span>
                          <span>{formatTime(batch.timestamps.verified)}</span>
                        </div>
                      )}

                      {/* Advance button */}
                      {!isComplete && (
                        <button
                          className="btn-advance"
                          onClick={() => handleAdvance(batch.id)}
                          style={{ marginTop: '12px', width: '100%' }}
                        >
                          Advance to {getStatusLabel(STATUS_ORDER[STATUS_ORDER.indexOf(batch.status) + 1])} <ChevronRight size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {isWizardOpen && (
        <BatchCreationWizard onClose={() => setIsWizardOpen(false)} />
      )}
    </div>
  );
}
