import { useState } from 'react';
import {
  X,
  ChevronRight,
  ChevronLeft,
  Check,
  Package,
  MapPin,
  Scale,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { createManualBatch, filterByRole } from '../../utils/batchUtils';
import type { Bin } from '../../types';

interface BatchCreationWizardProps {
  onClose: () => void;
}

export function BatchCreationWizard({ onClose }: BatchCreationWizardProps) {
  const { bins, routes, addBatch, addActivity } = useAppState();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const eligibleBins = filterByRole(bins, user, 'bin') as Bin[];

  const [formData, setFormData] = useState({
    binId: '',
    timestamp: new Date().toISOString().slice(0, 16),
    weightKg: 0,
    plasticWeightKg: 0,
    metalWeightKg: 0,
    glassWeightKg: 0,
    quality: 'Medium' as 'Good' | 'Medium' | 'Poor',
    hasPhoto: false,
  });

  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [createdBatchId, setCreatedBatchId] = useState('');

  const selectedBin = bins.find(b => b.id === formData.binId);

  const handleBinSelect = (binId: string) => {
    const selectedBin = bins.find(b => b.id === binId);
    if (!selectedBin) {
      setFormData(prev => ({
        ...prev,
        binId,
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
      const matchingRoute = routes.find(r => r.assignedBins.some(ab => ab.binId === selectedBin.id));
      if (matchingRoute) {
        assignedRouteId = matchingRoute.id;
      }
    }

    if (assignedRouteId) {
      const plasticWeight = selectedBin.categories.find(c => c.name === 'plastic')?.weightKg || 0;
      const metalWeight = selectedBin.categories.find(c => c.name === 'metal')?.weightKg || 0;
      const glassWeight = selectedBin.categories.find(c => c.name === 'glass')?.weightKg || 0;

      setFormData(prev => ({
        ...prev,
        binId,
        weightKg: selectedBin.weightKg || 0,
        plasticWeightKg: plasticWeight,
        metalWeightKg: metalWeight,
        glassWeightKg: glassWeight,
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        binId,
        weightKg: 0,
        plasticWeightKg: 0,
        metalWeightKg: 0,
        glassWeightKg: 0,
      }));
    }
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!formData.binId) {
        setError('Please select a bin first.');
        return;
      }
    } else if (step === 2) {
      if (formData.weightKg <= 0) {
        setError('Total waste weight must be greater than 0 kg.');
        return;
      }
      if (formData.plasticWeightKg < 0) {
        setError('Plastic weight cannot be negative.');
        return;
      }
      if (formData.plasticWeightKg > formData.weightKg) {
        setError('Plastic weight cannot exceed total waste weight.');
        return;
      }
      const otherKg = (formData.metalWeightKg || 0) + (formData.glassWeightKg || 0);
      if (formData.plasticWeightKg + otherKg > formData.weightKg) {
        setError('Sum of material weights cannot exceed total waste weight.');
        return;
      }
    }
    setStep(s => s + 1);
  };

  const handleBack = () => {
    setError('');
    setStep(s => s - 1);
  };

  const handleSubmit = () => {
    if (!selectedBin || !user) return;

    const batch = createManualBatch({
      bin: selectedBin,
      weightKg: formData.weightKg,
      plasticWeightKg: formData.plasticWeightKg,
      metalWeightKg: formData.metalWeightKg || undefined,
      glassWeightKg: formData.glassWeightKg || undefined,
      quality: formData.quality,
      timestamp: new Date(formData.timestamp).toISOString(),
      ownerId: user.id,
    });

    addBatch(batch);
    addActivity({
      type: 'collection',
      description: `Batch ${batch.id} created at ${selectedBin.location} — ${formData.weightKg} kg total, ${formData.plasticWeightKg} kg plastic`,
      userId: user.id,
      batchId: batch.id,
    });

    setCreatedBatchId(batch.id);
    setSubmitted(true);
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content wizard-modal">
        <div className="modal-header">
          <div className="wizard-title">
            <Package size={20} className="text-primary" />
            <h2>Create Batch</h2>
          </div>
          <button className="btn-close" onClick={handleClose}><X size={20} /></button>
        </div>

        {/* Progress Steps */}
        {!submitted && (
          <div className="wizard-progress">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`progress-step ${step >= s ? 'active' : ''} ${step > s ? 'completed' : ''}`}>
                <div className="step-circle">{step > s ? <Check size={12} /> : s}</div>
                <span className="step-label">
                  {s === 1 && 'Source'}
                  {s === 2 && 'Waste'}
                  {s === 3 && 'Quality'}
                  {s === 4 && 'Confirm'}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="wizard-body">
          {error && <div className="wizard-error">{error}</div>}

          {/* ── STEP 1: Source Details ── */}
          {!submitted && step === 1 && (
            <div className="wizard-step fade-in">
              <h3><MapPin size={16} /> Step 1: Source Details</h3>

              <div className="form-group">
                <label>Bin Number</label>
                <select
                  className="form-control"
                  value={formData.binId}
                  onChange={e => handleBinSelect(e.target.value)}
                >
                  <option value="">-- Select a bin --</option>
                  {eligibleBins.map(b => (
                    <option key={b.id} value={b.id}>{b.id} – {b.location}</option>
                  ))}
                </select>
              </div>

              {selectedBin && (
                <div className="source-preview">
                  <strong>Location:</strong> {selectedBin.location}<br />
                  <strong>Zone:</strong> {selectedBin.zone}<br />
                  <strong>Current Fill:</strong> {selectedBin.fillLevel}%
                </div>
              )}

              <div className="form-group">
                <label>Collection Date &amp; Time</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={formData.timestamp}
                  onChange={e => setFormData({ ...formData, timestamp: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* ── STEP 2: Waste Details ── */}
          {!submitted && step === 2 && (
            <div className="wizard-step fade-in">
              <h3><Scale size={16} /> Step 2: Waste Details</h3>

              <div className="form-group">
                <label>Total Waste Weight (kg) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number"
                  className="form-control"
                  min="0.1"
                  step="0.1"
                  placeholder="e.g. 50"
                  value={formData.weightKg || ''}
                  onChange={e => setFormData({ ...formData, weightKg: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="form-group">
                <label>Total Plastic Weight (kg) <span style={{ color: '#ef4444' }}>*</span></label>
                <input
                  type="number"
                  className="form-control"
                  min="0"
                  step="0.1"
                  placeholder="e.g. 25"
                  value={formData.plasticWeightKg || ''}
                  onChange={e => setFormData({ ...formData, plasticWeightKg: parseFloat(e.target.value) || 0 })}
                />
                {formData.weightKg > 0 && formData.plasticWeightKg > 0 && (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    CO₂ saved estimate: <strong style={{ color: '#22c55e' }}>{(formData.plasticWeightKg * 3.0).toFixed(1)} kg</strong>
                  </p>
                )}
              </div>

              <div className="breakdown-grid">
                <label className="full-width" style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Optional — Other Materials
                </label>
                <div className="form-group small">
                  <label>Metal Weight (kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={formData.metalWeightKg || ''}
                    onChange={e => setFormData({ ...formData, metalWeightKg: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group small">
                  <label>Glass Weight (kg)</label>
                  <input
                    type="number"
                    className="form-control"
                    min="0"
                    step="0.1"
                    placeholder="0"
                    value={formData.glassWeightKg || ''}
                    onChange={e => setFormData({ ...formData, glassWeightKg: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Quality & Verification ── */}
          {!submitted && step === 3 && (
            <div className="wizard-step fade-in">
              <h3><ShieldCheck size={16} /> Step 3: Quality &amp; Verification</h3>

              <div className="form-group">
                <label>Segregation Quality</label>
                <div className="quality-options">
                  {(['Good', 'Medium', 'Poor'] as const).map(q => (
                    <button
                      key={q}
                      type="button"
                      className={`quality-btn ${formData.quality === q ? 'active' : ''} ${q.toLowerCase()}`}
                      onClick={() => setFormData({ ...formData, quality: q })}
                    >
                      {q === 'Good' && '✅ '}
                      {q === 'Medium' && '⚠️ '}
                      {q === 'Poor' && '❌ '}
                      {q}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Photo Verification (Optional)</label>
                <div
                  className="mock-upload"
                  onClick={() => setFormData({ ...formData, hasPhoto: !formData.hasPhoto })}
                  style={{ cursor: 'pointer', userSelect: 'none' }}
                >
                  <Upload size={16} />
                  <span>{formData.hasPhoto ? '✅ Photo attached' : '📷 Click to attach image'}</span>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Confirmation ── */}
          {!submitted && step === 4 && (
            <div className="wizard-step fade-in">
              <h3><Check size={16} /> Step 4: Review &amp; Generate</h3>
              <div className="confirmation-summary">
                <div className="summary-row">
                  <span>Source:</span>
                  <strong>{selectedBin?.id} — {selectedBin?.location}</strong>
                </div>
                <div className="summary-row">
                  <span>Total Waste:</span>
                  <strong>{formData.weightKg} kg</strong>
                </div>
                <div className="summary-row">
                  <span>Plastic:</span>
                  <strong>{formData.plasticWeightKg} kg</strong>
                </div>
                {formData.metalWeightKg > 0 && (
                  <div className="summary-row">
                    <span>Metal:</span>
                    <strong>{formData.metalWeightKg} kg</strong>
                  </div>
                )}
                {formData.glassWeightKg > 0 && (
                  <div className="summary-row">
                    <span>Glass:</span>
                    <strong>{formData.glassWeightKg} kg</strong>
                  </div>
                )}
                <div className="summary-row">
                  <span>Quality:</span>
                  <strong className={`quality-label ${formData.quality.toLowerCase()}`}>
                    {formData.quality}
                  </strong>
                </div>
                <div className="summary-row">
                  <span>Est. CO₂ Saved:</span>
                  <strong style={{ color: '#22c55e' }}>
                    {(formData.plasticWeightKg * 3.0).toFixed(1)} kg
                  </strong>
                </div>
              </div>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {submitted && (
            <div className="wizard-step fade-in" style={{ textAlign: 'center', padding: '32px 16px' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Check size={32} color="#22c55e" />
              </div>
              <h3 style={{ color: '#22c55e', marginBottom: 8 }}>Batch Successfully Created!</h3>
              <p style={{ color: 'var(--text-muted)', marginBottom: 16 }}>
                <strong>{createdBatchId}</strong> is ready for delivery processing.
              </p>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                The batch has been added to the pipeline with status <strong>COLLECTED</strong>.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer wizard-footer" style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginTop: '20px' }}>
          {!submitted ? (
            <>
              {step > 1 ? (
                <button className="btn-secondary" onClick={handleBack} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}>
                  <ChevronLeft size={16} /> Back
                </button>
              ) : <div />}

              {step < 4 ? (
                <button className="btn-primary" onClick={handleNext} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}>
                  Next <ChevronRight size={16} />
                </button>
              ) : (
                <button className="btn-success" onClick={handleSubmit} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }}>
                  Generate Batch <Check size={16} />
                </button>
              )}
            </>
          ) : (
            <button className="btn-primary" style={{ margin: '0 auto', display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 16px' }} onClick={handleClose}>
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
