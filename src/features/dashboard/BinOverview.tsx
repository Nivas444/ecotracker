import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { getBinStatusColor } from '../../utils/insights';
import { filterByRole } from '../../utils/batchUtils';
import { MapPin, X, Info, AlertTriangle, History } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import type { Bin, WasteCategory } from '../../types';

export function BinOverview() {
  const { bins, batches, routes } = useAppState();
  const { user } = useAuth();
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);

  // Show top 4 bins by fill level from filtered, non-archived bins
  const filteredBins = filterByRole(bins.filter(b => !b.archived), user, 'bin');
  const topBins = [...filteredBins].sort((a, b) => b.fillLevel - a.fillLevel).slice(0, 4);

  return (
    <div className="card">
      <div className="card-header">
        <MapPin size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
        <h2 className="card-title">Bin Overview</h2>
        <span className="card-count">{filteredBins.length} active bins</span>
      </div>

      <div className="bin-overview-grid">
        {topBins.map((bin) => {
          const color = getBinStatusColor(bin.fillLevel);
          return (
            <div 
              key={bin.id} 
              className="bin-mini-card"
              onClick={() => setSelectedBin(bin)}
              style={{ cursor: 'pointer', transition: 'border-color 0.2s, background 0.2s' }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-3)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--surface-2)'; }}
            >
              <div className="bin-mini-id" style={{ color: 'var(--primary)' }}>{bin.id}</div>
              <div className="bin-mini-location" style={{ fontWeight: 600 }}>
                {bin.customerName || bin.location}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {bin.location}
              </div>
              <div className="bin-fill-bar-wrapper">
                <div
                  className="bin-fill-bar"
                  style={{ width: `${bin.fillLevel}%`, background: color }}
                />
              </div>
              <div className="bin-mini-stats">
                <span style={{ color }}>{bin.fillLevel}%</span>
                <span>{bin.weightKg} kg</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bin Insights Modal */}
      {selectedBin && (() => {
        const binBatches = batches.filter(b => b.source === selectedBin.id);
        const binTrendData = binBatches.map(b => ({
          date: new Date(b.timestamps.created).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          weight: b.weightKg,
          plastic: b.plasticWeightKg,
        })).reverse();

        return (
          <div className="modal-overlay" style={{ zIndex: 1100 }}>
            <div className="modal-content wizard-modal" style={{ maxWidth: '560px', width: '90%' }}>
              <div className="modal-header">
                <div className="wizard-title">
                  <Info size={20} style={{ color: 'var(--primary)' }} />
                  <h2>Bin Operations &amp; Insights: {selectedBin.id}</h2>
                </div>
                <button className="btn-close" onClick={() => setSelectedBin(null)}><X size={20} /></button>
              </div>
              
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Customer Name</div>
                    <div style={{ fontWeight: 700, fontSize: '14px' }}>{selectedBin.customerName || 'Operational Partner'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Location</div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{selectedBin.location}</div>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Updated</div>
                    <div style={{ fontSize: '12px', color: 'var(--text)' }}>{new Date(selectedBin.lastUpdated).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Route Assignment</div>
                    <div style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>
                      {(() => {
                        const r = routes.find(route => route.id === selectedBin.assignedRouteId);
                        return r ? r.routeName : 'Unassigned';
                      })()}
                    </div>
                  </div>
                  {selectedBin.lastModifiedBy && (
                    <div style={{ marginTop: '4px', gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Modified</div>
                      <div style={{ fontSize: '11px', color: 'var(--text)' }}>
                        By {selectedBin.lastModifiedBy} at {selectedBin.lastModifiedTime ? new Date(selectedBin.lastModifiedTime).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 700 }}>Telemetry fill</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', fontSize: '11px', marginBottom: '2px', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>Recyclable Fill</span>
                        <strong>{selectedBin.recyclablePct}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${selectedBin.recyclablePct}%`, background: 'var(--green-500)', height: '100%' }} />
                      </div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', fontSize: '11px', marginBottom: '2px', justifyContent: 'space-between' }}>
                        <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>Non-Recyclable Fill</span>
                        <strong>{selectedBin.nonRecyclablePct}%</strong>
                      </div>
                      <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${selectedBin.nonRecyclablePct}%`, background: 'var(--amber-500)', height: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Bin Waste Trends */}
                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 700 }}>Waste Weight Trends</h4>
                  {binTrendData.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      No batch collections recorded yet.
                    </div>
                  ) : (
                    <div style={{ height: '120px', background: 'var(--surface-2)', padding: '8px', borderRadius: '8px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={binTrendData}>
                          <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                          <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} unit="kg" />
                          <ChartTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 10 }} />
                          <Line type="monotone" dataKey="weight" stroke="var(--green-500)" strokeWidth={2} dot={{ r: 2 }} name="Total Weight" />
                          <Line type="monotone" dataKey="plastic" stroke="var(--primary)" strokeWidth={1.5} dot={{ r: 2 }} name="Plastic" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 700 }}>Waste breakdown</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
                    {selectedBin.categories.map((cat: WasteCategory) => (
                      <div key={cat.name} style={{ fontSize: '11px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '2px' }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{cat.name}</span>
                        <strong style={{ color: 'var(--text)' }}>{cat.weightKg} kg</strong>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1', fontSize: '11px', display: 'flex', justifyContent: 'space-between', paddingTop: '2px', fontWeight: 700, color: 'var(--primary)' }}>
                      <span>Total Weight</span>
                      <span>{selectedBin.weightKg} kg</span>
                    </div>
                  </div>
                </div>

                {selectedBin.fillLevel > 60 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.15)', padding: '8px 12px', borderRadius: '6px' }}>
                    <AlertTriangle size={16} style={{ color: 'var(--amber-400)' }} />
                    <div style={{ fontSize: '11px' }}>
                      <strong style={{ color: 'var(--amber-400)' }}>Active Alert</strong>
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>Bin is {selectedBin.fillLevel}% full. Collection recommended.</span>
                    </div>
                  </div>
                )}

                {/* History modifications log */}
                {selectedBin.history && selectedBin.history.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <History size={13} /> Audit Modifications Log
                    </h4>
                    <div className="audit-history-panel" style={{ margin: 0, padding: '8px', maxHeight: '100px', overflowY: 'auto' }}>
                      {selectedBin.history.map((h, i) => (
                        <div key={i} className="audit-log-item">
                          <div className="audit-log-meta">
                            <strong>{h.modifiedBy}</strong>
                            <span>{new Date(h.timestamp).toLocaleDateString()}</span>
                          </div>
                          <div>
                            <span style={{ color: 'var(--red-400)' }}>{h.prevValues}</span> &rarr; <span style={{ color: 'var(--green-400)' }}>{h.newValues}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer" style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-primary" onClick={() => setSelectedBin(null)}>Close</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
