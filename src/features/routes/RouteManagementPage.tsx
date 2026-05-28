import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import type { Route } from '../../types';
import { 
  Truck, Plus, MapPin, AlertTriangle, 
  CheckCircle, Play, Navigation, X, Map
} from 'lucide-react';

export function RouteManagementPage() {
  const { bins, routes, drivers, vehicles, addRoute, updateRoute, addActivity, addBatch } = useAppState();
  const { user } = useAuth();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formError, setFormError] = useState('');
  
  // Route form state
  const [routeForm, setRouteForm] = useState({
    routeName: '',
    driverName: '',
    vehicleNumber: '',
    binIds: [] as string[],
    expectedCompletionTime: '',
  });

  const availableBins = bins.filter(b => !b.archived);

  // Toggle bin selection in form
  const handleToggleBinSelection = (binId: string) => {
    setRouteForm(prev => {
      const idx = prev.binIds.indexOf(binId);
      if (idx > -1) {
        return { ...prev, binIds: prev.binIds.filter(id => id !== binId) };
      } else {
        return { ...prev, binIds: [...prev.binIds, binId] };
      }
    });
  };

  const handleCreateRoute = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!routeForm.routeName.trim() || !routeForm.driverName.trim() || !routeForm.vehicleNumber.trim() || !routeForm.expectedCompletionTime) {
      setFormError('All fields marked with * are required.');
      return;
    }

    if (routeForm.binIds.length === 0) {
      setFormError('Please assign at least one smart bin to this route.');
      return;
    }

    const assignedBins = routeForm.binIds.map(id => {
      const bin = bins.find(b => b.id === id);
      return {
        binId: id,
        customerName: bin?.customerName || 'Partner Location',
        location: bin?.location || 'Unknown location',
        status: 'pending' as const
      };
    });

    const newRoute: Route = {
      id: `ROUTE-${Date.now().toString().slice(-4)}`,
      routeName: routeForm.routeName.trim(),
      driverName: routeForm.driverName.trim(),
      vehicleNumber: routeForm.vehicleNumber.trim().toUpperCase(),
      assignedBins,
      expectedCompletionTime: new Date(routeForm.expectedCompletionTime).toISOString(),
      status: 'pending',
      delayStatus: false,
      createdAt: new Date().toISOString(),
    };

    addRoute(newRoute);

    // Automatically create a collection batch in Batch Ops for each bin assigned to this route
    assignedBins.forEach(ab => {
      const bin = bins.find(b => b.id === ab.binId);
      if (!bin) return;

      const batchId = `BATCH-${Date.now().toString().slice(-4)}-${ab.binId}`;
      const newBatch = {
        id: batchId,
        source: bin.id,
        sourceLocation: bin.location,
        weightKg: 0,
        plasticWeightKg: 0,
        metalWeightKg: 0,
        glassWeightKg: 0,
        composition: {
          pet: 0,
          hdpe: 0,
          ldpe: 0,
          pp: 0,
          mixed: 0,
          metal: 0,
          glass: 0,
          organic: 0,
          paper: 0,
        },
        status: 'COLLECTED' as const,
        destination: 'recycler' as const,
        timestamps: {
          created: new Date().toISOString(),
        },
        audit: {
          qrVerified: false,
          gpsLogged: false,
          photoVerified: false,
        },
        driverName: newRoute.driverName,
        vehicleId: newRoute.vehicleNumber,
        routeId: newRoute.id,
        quality: 'Medium' as const,
        ownerId: user?.id || 'admin',
      };
      addBatch(newBatch);
    });

    addActivity({
      type: 'pickup',
      description: `New collection route "${newRoute.routeName}" created. Driver: ${newRoute.driverName} (${newRoute.vehicleNumber}).`,
      userId: user?.id || 'admin',
    });

    setIsCreateOpen(false);
    setRouteForm({
      routeName: '',
      driverName: '',
      vehicleNumber: '',
      binIds: [],
      expectedCompletionTime: '',
    });
  };

  // Toggle bin collection status inside active route
  const handleToggleBinCollected = (routeId: string, binId: string) => {
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    const nextBins = route.assignedBins.map(b => {
      if (b.binId === binId) {
        return { ...b, status: b.status === 'pending' ? 'collected' as const : 'pending' as const };
      }
      return b;
    });

    const allCollected = nextBins.every(b => b.status === 'collected');
    const nextStatus = allCollected ? 'completed' as const : 'active' as const;

    updateRoute(routeId, {
      assignedBins: nextBins,
      status: nextStatus,
    });

    const binName = route.assignedBins.find(b => b.binId === binId)?.customerName || binId;
    addActivity({
      type: 'collection',
      description: `Bin ${binId} (${binName}) marked as collected on route "${route.routeName}".`,
      userId: user?.id || 'admin',
    });

    if (allCollected) {
      addActivity({
        type: 'pickup',
        description: `Route "${route.routeName}" completely collected and delivered to internal facility.`,
        userId: user?.id || 'admin',
      });
    }
  };

  // Start route
  const handleStartRoute = (routeId: string) => {
    updateRoute(routeId, { status: 'active' });
    const route = routes.find(r => r.id === routeId);
    if (route) {
      addActivity({
        type: 'pickup',
        description: `Collection route "${route.routeName}" started by driver ${route.driverName}.`,
        userId: user?.id || 'admin',
      });
    }
  };

  // Check delay statuses dynamically
  const now = new Date().getTime();
  const processedRoutes = routes.map(route => {
    const isPastDeadline = now > new Date(route.expectedCompletionTime).getTime();
    const isDelayed = route.status !== 'completed' && isPastDeadline;
    return {
      ...route,
      delayStatus: isDelayed
    };
  });

  // Stats calculation
  const activeRoutes = processedRoutes.filter(r => r.status === 'active').length;
  const delayedRoutesCount = processedRoutes.filter(r => r.delayStatus).length;
  const completedRoutes = processedRoutes.filter(r => r.status === 'completed').length;
  
  let totalPickupsCount = 0;
  let completedPickupsCount = 0;
  processedRoutes.forEach(r => {
    totalPickupsCount += r.assignedBins.length;
    completedPickupsCount += r.assignedBins.filter(b => b.status === 'collected').length;
  });

  const getDelayMinutes = (expectedIso: string) => {
    const diff = now - new Date(expectedIso).getTime();
    return diff > 0 ? Math.floor(diff / (1000 * 60)) : 0;
  };

  return (
    <div className="routes-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Overview Cards */}
      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ color: 'var(--primary)' }}><Truck size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">Active Routes</span>
            <span className="metric-value">{activeRoutes}</span>
            <span className="metric-sub">Dispatch Fleet</span>
          </div>
        </div>
        <div className="metric-card" style={{ borderColor: delayedRoutesCount > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
          <div className="metric-icon" style={{ color: delayedRoutesCount > 0 ? 'var(--red-400)' : 'var(--text-muted)' }}><AlertTriangle size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">Delayed Routes</span>
            <span className="metric-value" style={{ color: delayedRoutesCount > 0 ? 'var(--red-400)' : 'inherit' }}>{delayedRoutesCount}</span>
            <span className="metric-sub">Exceeded Deadline</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ color: 'var(--green-400)' }}><CheckCircle size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">Pickups Completed</span>
            <span className="metric-value" style={{ color: 'var(--green-400)' }}>{completedPickupsCount} / {totalPickupsCount}</span>
            <span className="metric-sub">Collect Progress</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ color: 'var(--sky-500)' }}><Navigation size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">Completed Routes</span>
            <span className="metric-value">{completedRoutes}</span>
            <span className="metric-sub">Total Cycles Today</span>
          </div>
        </div>
      </div>

      {/* Header bar */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Map size={20} className="card-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 700 }}>Operational Routes Monitoring</h2>
        </div>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <Plus size={16} /> Create Route
        </button>
      </div>

      {/* Operational Route Monitoring Cards List (Full width) */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {processedRoutes.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            <Truck size={48} style={{ color: 'var(--text-dim)', marginBottom: '16px', opacity: 0.5, display: 'inline' }} />
            <h3 style={{ color: 'var(--text)', marginBottom: '8px', fontSize: '16px', fontWeight: 600 }}>No Active Routes</h3>
            <p style={{ fontSize: '13px', maxWidth: '380px', margin: '0 auto', color: 'var(--text-muted)' }}>
              Register customer locations and add logistics vehicles to trigger dispatcher tracking schedules.
            </p>
          </div>
        ) : (
          processedRoutes.map(route => {
            const totalBins = route.assignedBins.length;
            const collectedBins = route.assignedBins.filter(b => b.status === 'collected').length;
            const pct = totalBins > 0 ? Math.round((collectedBins / totalBins) * 100) : 0;
            const isDelayed = route.delayStatus;

            return (
              <div 
                key={route.id} 
                className="card"
                style={{ 
                  border: isDelayed ? '1px solid var(--red-500)' : route.status === 'completed' ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--border)',
                  background: isDelayed ? 'rgba(239, 68, 68, 0.01)' : 'var(--surface)'
                }}
              >
                {/* Card top */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text)' }}>{route.routeName}</span>
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: route.status === 'completed' ? 'rgba(34,197,94,0.12)' : route.status === 'active' ? 'rgba(51, 126, 105, 0.12)' : 'var(--surface-3)',
                        color: route.status === 'completed' ? 'var(--green-400)' : route.status === 'active' ? 'var(--primary)' : 'var(--text-muted)'
                      }}>
                        {route.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      ID: <strong>{route.id}</strong> | Driver: <strong>{route.driverName}</strong> | Vehicle: <strong>{route.vehicleNumber}</strong>
                    </div>
                  </div>
                  
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Target Completion</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                      {new Date(route.expectedCompletionTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                {/* Delay alerts */}
                {isDelayed && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'var(--red-400)', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', marginBottom: '12px', fontWeight: 600 }}>
                    <AlertTriangle size={15} />
                    <span>Route delayed by {getDelayMinutes(route.expectedCompletionTime)} mins. Immediate dispatcher contact advised.</span>
                  </div>
                )}

                {/* Bins Checklist */}
                <div style={{ margin: '8px 0 14px' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Assigned Collection Bins ({collectedBins}/{totalBins})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {route.assignedBins.map(b => (
                      <div 
                        key={b.binId} 
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          padding: '8px 12px', 
                          background: 'var(--surface-2)', 
                          border: '1px solid var(--border)', 
                          borderRadius: '6px',
                          opacity: route.status === 'pending' ? 0.7 : 1
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <MapPin size={13} style={{ color: 'var(--primary)' }} />
                          <div>
                            <strong style={{ fontSize: '12px', color: 'var(--text)' }}>{b.binId}</strong>
                            <span style={{ color: 'var(--text-muted)', fontSize: '12px', marginLeft: '6px' }}>({b.customerName} - {b.location})</span>
                          </div>
                        </div>
                        
                        {/* Collected Checkbox toggle */}
                        {route.status === 'active' ? (
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 600, color: b.status === 'collected' ? 'var(--green-400)' : 'var(--text-muted)' }}>
                            <input 
                              type="checkbox"
                              checked={b.status === 'collected'}
                              onChange={() => handleToggleBinCollected(route.id, b.binId)}
                              style={{ accentColor: 'var(--green-500)', cursor: 'pointer' }}
                            />
                            Collected
                          </label>
                        ) : (
                          <span style={{ fontSize: '11px', fontWeight: 700, color: b.status === 'collected' ? 'var(--green-400)' : 'var(--text-dim)' }}>
                            {b.status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ height: '6px', background: 'var(--surface-3)', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, background: route.status === 'completed' ? 'var(--green-500)' : 'var(--primary)', height: '100%', borderRadius: '3px', transition: 'width 0.4s ease' }} />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', width: '38px', textAlign: 'right' }}>{pct}%</span>
                  
                  {/* Action buttons */}
                  {route.status === 'pending' && (
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleStartRoute(route.id)}
                      style={{ height: '28px', fontSize: '11px', padding: '0 12px', borderRadius: '4px' }}
                    >
                      <Play size={11} /> Start Dispatch
                    </button>
                  )}
                </div>

              </div>
            );
          })
        )}
      </div>

      {/* ── CREATE ROUTE MODAL ── */}
      {isCreateOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '480px', width: '90%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Truck size={20} style={{ color: 'var(--primary)' }} />
                <h2>Create Waste Collection Route</h2>
              </div>
              <button className="btn-close" onClick={() => setIsCreateOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleCreateRoute}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {formError && <div className="wizard-error">{formError}</div>}

                <div className="form-group">
                  <label>Route Label / Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input 
                    type="text"
                    className="form-control"
                    placeholder="e.g. Route 1 - Hotels North"
                    value={routeForm.routeName}
                    onChange={e => setRouteForm({ ...routeForm, routeName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid-2">
                  <div className="form-group">
                    <label>Driver Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={routeForm.driverName}
                      onChange={e => setRouteForm({ ...routeForm, driverName: e.target.value })}
                      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    >
                      <option value="">-- Select Driver --</option>
                      {drivers.map(d => (
                        <option key={d.id} value={d.driverName}>{d.driverName}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Vehicle Plate No. <span style={{ color: 'var(--red-400)' }}>*</span></label>
                    <select
                      className="form-control"
                      value={routeForm.vehicleNumber}
                      onChange={e => setRouteForm({ ...routeForm, vehicleNumber: e.target.value })}
                      style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    >
                      <option value="">-- Select Vehicle --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.vehicleNumber}>{v.vehicleNumber} ({v.vehicleType})</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Assign Bins to Collection Route <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  {availableBins.length === 0 ? (
                    <div style={{ fontSize: '11px', color: 'var(--text-dim)', padding: '10px', background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '4px' }}>
                      No bins registered. Create active bins first.
                    </div>
                  ) : (
                    <div style={{ maxHeight: '120px', overflowY: 'auto', border: '1px solid var(--border)', padding: '6px 10px', borderRadius: '6px', background: 'var(--surface-2)', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {availableBins.map(b => {
                        const isChecked = routeForm.binIds.includes(b.id);
                        return (
                          <label key={b.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', cursor: 'pointer', userSelect: 'none', color: isChecked ? 'var(--text)' : 'var(--text-muted)' }}>
                            <input 
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleBinSelection(b.id)}
                              style={{ accentColor: 'var(--primary)' }}
                            />
                            <strong>{b.id}</strong> - {b.customerName || b.location} ({b.fillLevel}% full)
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Expected Completion Deadline <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input 
                    type="datetime-local"
                    className="form-control"
                    value={routeForm.expectedCompletionTime}
                    onChange={e => setRouteForm({ ...routeForm, expectedCompletionTime: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCreateOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Dispatch Route</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
