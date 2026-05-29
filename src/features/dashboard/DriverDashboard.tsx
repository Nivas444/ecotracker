import React, { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { 
  User, ClipboardList, 
  Scale, FileText, CheckCircle, Package, Check, Award
} from 'lucide-react';
import type { Batch } from '../../types';

export function DriverDashboard() {
  const { user } = useAuth();
  const { batches, routes, addBatch, updateRoute, addActivity } = useAppState();

  const [hotelName, setHotelName] = useState('Hilton Resort');
  const [weightKg, setWeightKg] = useState('');
  const [plasticWeightKg, setPlasticWeightKg] = useState('');
  const [notes, setNotes] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Get driver assignment info
  const driverName = user?.displayName || 'John Williams';
  const experience = '5 Years Experience';
  const assignedVehicle = 'GC-2045';
  const assignedRouteId = 'ROUTE-3';
  const assignedRouteName = 'Route 3';
  const driverStatus = 'Active';

  // Find Route 3
  const activeRoute = routes.find(r => r.id === assignedRouteId);
  const stops = activeRoute?.assignedBins || [
    { binId: 'BIN-ST1', customerName: 'Hilton Resort', location: 'Hilton Resort Stop', status: 'pending' as const },
    { binId: 'BIN-ST2', customerName: 'Secrets Resort', location: 'Secrets Resort Stop', status: 'pending' as const },
    { binId: 'BIN-ST3', customerName: 'Iberostar', location: 'Iberostar Stop', status: 'pending' as const }
  ];

  // 2. Filter driver's own records
  const driverBatches = batches.filter(b => b.driverName === driverName);
  
  // KPI Calculations
  const distinctHotels = new Set(driverBatches.map(b => b.sourceLocation));
  const hotelsVisitedCount = distinctHotels.size;
  const totalWasteCollected = driverBatches.reduce((sum, b) => sum + b.weightKg, 0);
  const batchesCreatedCount = driverBatches.length;
  const completedRoutesCount = routes.filter(r => r.driverName === driverName && r.status === 'completed').length;

  const handleSubmitBatch = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    const parsedWeight = parseFloat(weightKg);
    const parsedPlastic = parseFloat(plasticWeightKg);

    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setErrorMsg('Total waste weight must be greater than 0 kg.');
      return;
    }
    if (isNaN(parsedPlastic) || parsedPlastic < 0) {
      setErrorMsg('Plastic weight cannot be negative.');
      return;
    }
    if (parsedPlastic > parsedWeight) {
      setErrorMsg('Plastic weight cannot exceed total waste weight.');
      return;
    }

    const batchCounter = batches.length + 1;
    const batchId = `BATCH-${String(batchCounter).padStart(3, '0')}`;

    // Create legacy composition percentages
    const safeTotal = parsedWeight || 1;
    const plasticPct = Math.round((parsedPlastic / safeTotal) * 100) || 0;
    const composition = {
      pet: Math.floor(plasticPct * 0.4),
      hdpe: Math.floor(plasticPct * 0.3),
      ldpe: Math.floor(plasticPct * 0.1),
      pp: Math.floor(plasticPct * 0.1),
      mixed: Math.floor(plasticPct * 0.1),
      metal: 0,
      glass: 0,
      organic: 0,
      paper: 0,
    };

    const newBatch: Batch = {
      id: batchId,
      source: 'BIN-' + hotelName.slice(0, 3).toUpperCase() + '-' + String(batchCounter),
      sourceLocation: hotelName,
      weightKg: parsedWeight,
      plasticWeightKg: parsedPlastic,
      composition,
      status: 'CREATED',
      destination: 'recycler',
      timestamps: {
        created: new Date().toISOString(),
      },
      audit: {
        qrVerified: true,
        gpsLogged: true,
        photoVerified: true,
      },
      driverName,
      vehicleId: assignedVehicle,
      routeId: assignedRouteId,
      quality: 'Good',
      verificationProof: notes.trim() || undefined,
      ownerId: user?.id || 'driver_john',
    };

    // Add batch and activity
    addBatch(newBatch);

    addActivity({
      type: 'collection',
      description: `${driverName} created Batch ${batchId} from ${hotelName}.`,
      userId: user?.id || 'driver_john',
      batchId,
    });

    // Automatically update the stop status on the active route
    if (activeRoute) {
      const updatedBins = activeRoute.assignedBins.map(b => 
        b.customerName === hotelName ? { ...b, status: 'collected' as const } : b
      );
      const allCollected = updatedBins.every(b => b.status === 'collected');
      
      updateRoute(activeRoute.id, {
        assignedBins: updatedBins,
        status: allCollected ? 'completed' : 'active'
      });

      if (allCollected) {
        addActivity({
          type: 'pickup',
          description: `Route "${activeRoute.routeName}" completely collected and delivered to internal facility by ${driverName}.`,
          userId: user?.id || 'driver_john'
        });
      }
    }

    setSuccessMsg(`Batch ${batchId} successfully created for ${hotelName}!`);
    setWeightKg('');
    setPlasticWeightKg('');
    setNotes('');

    // Clear success message after 4s
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  return (
    <div className="driver-dashboard" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Success Alert Banner */}
      {successMsg && (
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.3)',
          color: 'var(--green-400)',
          padding: '12px 16px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          fontWeight: 600,
          animation: 'fadeIn 0.3s ease'
        }}>
          <CheckCircle size={18} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid of Profile, Assignment & Create Batch Form */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'stretch' }}>
        
        {/* Left Side Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Driver Profile */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              <User size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
              <h2 className="card-title">Driver Profile</h2>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '8px 0' }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                background: 'rgba(51, 126, 105, 0.15)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '18px'
              }}>
                JW
              </div>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>{driverName}</h3>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{experience}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Assigned Vehicle</span>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: 'var(--text)' }}>{assignedVehicle}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Active Route</span>
                <div style={{ fontSize: '14px', fontWeight: 700, marginTop: '2px', color: 'var(--text)' }}>{assignedRouteName}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', gridColumn: 'span 2' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 600 }}>Driver Status</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--green-500)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--green-400)' }}>{driverStatus}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Collection Summary */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              <Award size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
              <h2 className="card-title">Collection Summary</h2>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Hotels Visited</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--primary)', marginTop: '2px' }}>{hotelsVisitedCount}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Waste Collected</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--text)', marginTop: '2px' }}>{totalWasteCollected} kg</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Batches Created</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--amber-400)', marginTop: '2px' }}>{batchesCreatedCount}</div>
              </div>
              <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Completed Routes</span>
                <div style={{ fontSize: '20px', fontWeight: 800, color: 'var(--green-400)', marginTop: '2px' }}>{completedRoutesCount}</div>
              </div>
            </div>
          </div>

        </div>

        {/* Right Side Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Today's Assignment */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              <ClipboardList size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
              <h2 className="card-title">Today's Assignment</h2>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface-2)', padding: '10px 14px', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <div>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Active Assignment</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--primary)' }}>{assignedRouteName} – {assignedVehicle}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Expected Completion</span>
                <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>4:00 PM</div>
              </div>
            </div>

            <div style={{ marginTop: '4px' }}>
              <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '8px' }}>
                Stops checklist
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stops.map((stop, index) => {
                  const isCollected = stop.status === 'collected';
                  return (
                    <div 
                      key={stop.binId} 
                      style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        padding: '10px 14px', 
                        background: 'var(--surface-2)', 
                        border: isCollected ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid var(--border)', 
                        borderRadius: '6px',
                        opacity: isCollected ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          background: isCollected ? 'var(--green-500)' : 'var(--surface-3)',
                          color: isCollected ? '#fff' : 'var(--text-dim)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700
                        }}>
                          {isCollected ? <Check size={11} /> : index + 1}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{stop.customerName}</span>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{stop.location}</span>
                        </div>
                      </div>
                      
                      <span style={{ 
                        fontSize: '11px', 
                        fontWeight: 700, 
                        color: isCollected ? 'var(--green-400)' : 'var(--text-dim)',
                        padding: '2px 8px',
                        background: isCollected ? 'rgba(34, 197, 94, 0.1)' : 'var(--surface-3)',
                        borderRadius: '12px'
                      }}>
                        {isCollected ? 'COLLECTED' : 'PENDING'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Driver Batch Operations - Create Batch Form */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 0 }}>
              <Package size={18} className="card-icon" style={{ color: 'var(--primary)' }} />
              <h2 className="card-title">Create Collection Batch</h2>
            </div>
            
            <form onSubmit={handleSubmitBatch} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {errorMsg && (
                <div style={{
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--red-400)',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600
                }}>
                  {errorMsg}
                </div>
              )}

              {/* Autocomplete / Select Hotel Stop */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: '4px' }}>Hotel Stop Name</label>
                <select 
                  className="form-control"
                  value={hotelName}
                  onChange={e => setHotelName(e.target.value)}
                  style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                >
                  {stops.map(stop => (
                    <option key={stop.binId} value={stop.customerName}>{stop.customerName}</option>
                  ))}
                </select>
              </div>

              {/* Weight Inputs Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Waste Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <div className="input-wrapper">
                    <Scale size={14} className="input-icon" />
                    <input 
                      type="number"
                      className="form-input"
                      placeholder="e.g. 100"
                      min="0.1"
                      step="0.1"
                      value={weightKg}
                      onChange={e => setWeightKg(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label" style={{ marginBottom: '4px' }}>Plastic Weight (kg) <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <div className="input-wrapper">
                    <Scale size={14} className="input-icon" />
                    <input 
                      type="number"
                      className="form-input"
                      placeholder="e.g. 40"
                      min="0"
                      step="0.1"
                      value={plasticWeightKg}
                      onChange={e => setPlasticWeightKg(e.target.value)}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Optional Notes */}
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label" style={{ marginBottom: '4px' }}>Optional Notes</label>
                <div className="input-wrapper">
                  <FileText size={14} className="input-icon" />
                  <input 
                    type="text"
                    className="form-input"
                    placeholder="e.g. Verified by hotel manager"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                  />
                </div>
              </div>

              {/* Auto-filled details info badge */}
              <div style={{
                background: 'var(--surface-3)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: 'var(--text-dim)',
                lineHeight: '1.4'
              }}>
                <strong>Auto-filled:</strong> Route: {assignedRouteName} | Driver: {driverName} | Status: <span style={{ color: 'var(--amber-400)', fontWeight: 600 }}>CREATED</span> | Time: Just Now
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: '10px', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                <Package size={16} /> Register Collection Batch
              </button>
            </form>
          </div>

        </div>

      </div>

    </div>
  );
}
