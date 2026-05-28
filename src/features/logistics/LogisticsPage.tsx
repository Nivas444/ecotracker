import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { 
  User, Truck, Phone, Mail, Plus, X, 
  Wrench, CheckCircle 
} from 'lucide-react';
import type { Driver, Vehicle } from '../../types';

export function LogisticsPage() {
  const { drivers, vehicles, addDriver, addVehicle, updateVehicleStatus } = useAppState();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  // Modals state
  const [isMergedModalOpen, setIsMergedModalOpen] = useState(false);
  
  // Validation state
  const [mergedError, setMergedError] = useState('');

  // Merged Form Form
  const [mergedForm, setMergedForm] = useState({
    driverName: '',
    vehicleNumber: '',
  });

  // Metrics
  const totalDrivers = drivers.length;
  const totalVehicles = vehicles.length;
  const vehiclesOnRoute = vehicles.filter(v => v.status === 'On Route').length;
  const vehiclesMaintenance = vehicles.filter(v => v.status === 'Maintenance').length;

  const handleAddMerged = (e: React.FormEvent) => {
    e.preventDefault();
    setMergedError('');

    const driverName = mergedForm.driverName.trim();
    const vehicleNumber = mergedForm.vehicleNumber.trim().toUpperCase();

    if (!driverName || !vehicleNumber) {
      setMergedError('Both Driver Name and Vehicle Plate Number are required.');
      return;
    }

    if (vehicles.some(v => v.vehicleNumber.toUpperCase() === vehicleNumber)) {
      setMergedError('A vehicle with this plate number is already registered.');
      return;
    }

    // Create Driver
    const driverId = `DRV-${Date.now().toString().slice(-4)}`;
    const newDrv: Driver = {
      id: driverId,
      driverName,
      phoneNumber: '+1-555-0100', // minimal/default
      email: `${driverName.toLowerCase().replace(/\s+/g, '')}@greencarib.com`, // minimal/default
      experience: '1 year', // minimal/default
      assignedVehicle: vehicleNumber,
    };

    // Create Vehicle
    const vehicleId = `VEH-${Date.now().toString().slice(-4)}`;
    const newVeh: Vehicle = {
      id: vehicleId,
      vehicleNumber,
      vehicleType: 'Waste Compactor',
      capacityKg: 5000,
      assignedDriver: driverName,
      status: 'Available',
    };

    addDriver(newDrv);
    addVehicle(newVeh);
    setIsMergedModalOpen(false);
    setMergedForm({
      driverName: '',
      vehicleNumber: '',
    });
  };

  return (
    <div className="logistics-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── METRICS ROW ── */}
      <div className="metrics-row" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
        <div className="metric-card">
          <div className="metric-icon" style={{ color: 'var(--primary)' }}><User size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">Active Drivers</span>
            <span className="metric-value">{totalDrivers}</span>
            <span className="metric-sub">Registered Staff</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ color: 'var(--sky-500)' }}><Truck size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">Fleet Capacity</span>
            <span className="metric-value">{totalVehicles}</span>
            <span className="metric-sub">Operational Vehicles</span>
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-icon" style={{ color: 'var(--green-400)' }}><CheckCircle size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">On Route Vehicles</span>
            <span className="metric-value" style={{ color: 'var(--green-400)' }}>{vehiclesOnRoute}</span>
            <span className="metric-sub">Actively Collecting</span>
          </div>
        </div>
        <div className="metric-card" style={{ borderColor: vehiclesMaintenance > 0 ? 'rgba(239,68,68,0.3)' : 'var(--border)' }}>
          <div className="metric-icon" style={{ color: vehiclesMaintenance > 0 ? 'var(--red-400)' : 'var(--text-dim)' }}><Wrench size={20} /></div>
          <div className="metric-body">
            <span className="metric-label">In Maintenance</span>
            <span className="metric-value" style={{ color: vehiclesMaintenance > 0 ? 'var(--red-400)' : 'inherit' }}>{vehiclesMaintenance}</span>
            <span className="metric-sub">Temporarily Offline</span>
          </div>
        </div>
      </div>

      {/* ── HEADER TITLE ── */}
      <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <User size={20} className="card-icon" style={{ color: 'var(--primary)' }} />
          <h2 className="card-title" style={{ fontSize: '18px', fontWeight: 700 }}>Logistics</h2>
        </div>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => { setMergedError(''); setIsMergedModalOpen(true); }} style={{ fontSize: '12px' }}>
            <Plus size={14} /> Add Driver &amp; Vehicle
          </button>
        )}
      </div>

      {/* ── TWO-COLUMN SPLIT GRID ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: DRIVERS LIST */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Drivers Registry
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {drivers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-dim)', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                No drivers registered. Click "Add Driver &amp; Vehicle" to start.
              </div>
            ) : (
              drivers.map(drv => (
                <div key={drv.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                      <User size={14} />
                    </div>
                    <div>
                      <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{drv.driverName}</strong>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                        <span>Exp: {drv.experience}</span>
                        <span>|</span>
                        <span>Vehicle: <strong style={{ color: 'var(--primary)' }}>{drv.assignedVehicle || 'None'}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '11px', color: 'var(--text-dim)' }}>
                    <div><Phone size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{drv.phoneNumber}</div>
                    <div style={{ marginTop: '2px' }}><Mail size={10} style={{ verticalAlign: 'middle', marginRight: '3px' }} />{drv.email}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: VEHICLES LIST */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h3 style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Vehicle Fleet Registry
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {vehicles.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 10px', color: 'var(--text-dim)', border: '1px dashed var(--border)', borderRadius: '6px' }}>
                No fleet vehicles registered. Click "Add Driver &amp; Vehicle" to start.
              </div>
            ) : (
              vehicles.map(veh => {
                const isMaintenance = veh.status === 'Maintenance';
                const isOnRoute = veh.status === 'On Route';
                const statusColor = isMaintenance ? 'var(--red-400)' : isOnRoute ? 'var(--green-400)' : 'var(--text-muted)';
                const statusBg = isMaintenance ? 'rgba(239,68,68,0.1)' : isOnRoute ? 'rgba(123,199,169,0.1)' : 'var(--surface-3)';

                return (
                  <div key={veh.id} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--surface-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isMaintenance ? 'var(--red-400)' : 'var(--primary)' }}>
                        <Truck size={14} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '13px', color: 'var(--text)' }}>{veh.vehicleNumber}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px', marginTop: '2px' }}>
                          <span>Type: {veh.vehicleType}</span>
                          <span>|</span>
                          <span>Cap: {veh.capacityKg} kg</span>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '12px', color: statusColor, background: statusBg }}>
                        {veh.status.toUpperCase()}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                        Driver: <strong>{veh.assignedDriver || 'None'}</strong>
                      </span>
                      {isAdmin && (
                        <select
                          value={veh.status}
                          onChange={e => updateVehicleStatus(veh.vehicleNumber, e.target.value as any)}
                          style={{ fontSize: '10px', padding: '2px 4px', background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: '4px', marginTop: '2px', cursor: 'pointer' }}
                        >
                          <option value="Available">Set: Available</option>
                          <option value="On Route">Set: On Route</option>
                          <option value="Maintenance">Set: Maintenance</option>
                        </select>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* ── DRIVER & VEHICLE REGISTRATION MODAL ── */}
      {isMergedModalOpen && (
        <div className="modal-overlay" style={{ zIndex: 1200 }}>
          <div className="modal-content wizard-modal" style={{ maxWidth: '420px', width: '90%' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Plus size={20} style={{ color: 'var(--primary)' }} />
                <h2>Register Driver &amp; Vehicle</h2>
              </div>
              <button className="btn-close" onClick={() => setIsMergedModalOpen(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAddMerged}>
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {mergedError && <div className="wizard-error">{mergedError}</div>}

                <div className="form-group">
                  <label>Driver Full Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Liam Neeson"
                    value={mergedForm.driverName}
                    onChange={e => setMergedForm({ ...mergedForm, driverName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Vehicle Plate Number <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. CARIB-04"
                    value={mergedForm.vehicleNumber}
                    onChange={e => setMergedForm({ ...mergedForm, vehicleNumber: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsMergedModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
