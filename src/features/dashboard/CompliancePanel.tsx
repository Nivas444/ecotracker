import {
  Shield,
  Download,
  Leaf,
  Trash2,
  Recycle,
  Check,
  X,
  QrCode,
  MapPin,
  Camera,
} from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import {
  calculateESGMetrics,
  getComplianceStatus,
  getStatusLabel,
  filterByRole,
} from '../../utils/batchUtils';
import { exportBatchReportToCSV } from '../../utils/export';

export function CompliancePanel() {
  const { batches, recyclers } = useAppState();
  const { user } = useAuth();
  
  const filteredBatches = filterByRole(batches, user, 'batch');
  const esg = calculateESGMetrics(filteredBatches);

  if (filteredBatches.length === 0) return null;

  const getRecyclerName = (recyclerId?: string) => {
    if (!recyclerId) return 'Recycler Facility';
    return recyclers.find(r => r.id === recyclerId)?.name ?? recyclerId;
  };

  return (
    <div className="card compliance-panel">
      <div className="card-header">
        <Shield size={18} className="card-icon" />
        <h2 className="card-title">Compliance &amp; ESG Reporting</h2>
        <button
          className="btn-export"
          onClick={() => exportBatchReportToCSV(filteredBatches)}
          id="download-batch-report-btn"
        >
          <Download size={15} />
          Download Report
        </button>
      </div>

      <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
        * CO₂ values are estimated using average recyclable plastic emission factors (1.8 kg CO₂ / kg plastic).
      </p>

      {/* ── ESG Metrics ──────────────────────────────────── */}
      <div className="esg-grid">
        <div className="esg-card">
          <Leaf size={20} className="esg-icon esg-icon--green" />
          <div className="esg-body">
            <span className="esg-value">{esg.co2SavedKg} kg</span>
            <span className="esg-label">CO₂ Saved</span>
          </div>
        </div>
        <div className="esg-card">
          <Trash2 size={20} className="esg-icon esg-icon--blue" />
          <div className="esg-body">
            <span className="esg-value">{esg.landfillDivertedKg} kg</span>
            <span className="esg-label">Waste Tracked</span>
          </div>
        </div>
        <div className="esg-card">
          <Recycle size={20} className="esg-icon esg-icon--teal" />
          <div className="esg-body">
            <span className="esg-value">{esg.recyclingPct}%</span>
            <span className="esg-label">Recycling Rate</span>
          </div>
        </div>
      </div>

      {/* ── Chain of Custody Table ────────────────────────── */}
      <h3 className="compliance-section-title">Chain of Custody Log</h3>
      <div className="table-wrapper">
        <table className="bins-table">
          <thead>
            <tr>
              <th>Batch ID</th>
              <th>Source</th>
              <th>Collected At</th>
              <th>Current Status</th>
              <th>Destination</th>
              <th>Verification Audit</th>
              <th>Operational Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredBatches.map(batch => {
              const compliance = getComplianceStatus(batch);
              return (
                <tr key={batch.id} className="bins-row">
                  <td><span className="bin-id-cell">{batch.id}</span></td>
                  <td>{batch.sourceLocation}</td>
                  <td className="date-cell">
                    {new Date(batch.timestamps.created).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      // year: 'numeric',
                    })}
                  </td>
                  <td>
                    <span className={`status-chip status-chip--${batch.status}`}>
                      {getStatusLabel(batch.status)}
                    </span>
                  </td>
                  <td>
                    <span className="destination-badge destination-badge--recycler">
                      <Recycle size={12} /> {getRecyclerName(batch.assignedRecyclerId)}
                    </span>
                  </td>
                  <td>
                    <div className="audit-mini-row">
                      <span className={batch.audit.qrVerified ? 'audit-mini--pass' : 'audit-mini--fail'} title="QR Verified">
                        <QrCode size={12} />
                      </span>
                      <span className={batch.audit.gpsLogged ? 'audit-mini--pass' : 'audit-mini--fail'} title="GPS Logged">
                        <MapPin size={12} />
                      </span>
                      <span className={batch.audit.photoVerified ? 'audit-mini--pass' : 'audit-mini--fail'} title="Photo Verified">
                        <Camera size={12} />
                      </span>
                    </div>
                  </td>
                  <td>
                    <span className={`compliance-badge compliance-badge--${compliance === 'Verified' ? 'ok' : 'review'}`}>
                      {compliance === 'Verified' ? <Check size={12} /> : <X size={12} />}
                      {compliance}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
