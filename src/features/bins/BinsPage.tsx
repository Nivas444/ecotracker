import { useState } from 'react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { getBinStatusColor, getBinStatusLabel } from '../../utils/insights';
import { filterByRole } from '../../utils/batchUtils';
import { 
  Search, Filter, Wifi, WifiOff, AlertTriangle, Plus, 
  Edit3, X, Info, Archive, RotateCcw, History
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip as ChartTooltip, ResponsiveContainer } from 'recharts';
import type { Bin, WasteCategory } from '../../types';

type SortKey = 'fillLevel' | 'weightKg' | 'location' | 'segregationScore';
type FilterStatus = 'all' | 'empty' | 'medium' | 'full';

export function BinsPage() {
  const { bins, activities, batches, routes, addBin, updateBin, addActivity } = useAppState();
  const { user } = useAuth();
  
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('fillLevel');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [showArchived, setShowArchived] = useState(false);
  
  // Modals state
  const [selectedBin, setSelectedBin] = useState<Bin | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  // Add bin form state
  const [newBin, setNewBin] = useState({
    id: '',
    location: '',
    customerName: '',
  });

  // Edit bin form state
  const [editForm, setEditForm] = useState({
    location: '',
    customerName: '',
    assignedRouteId: '',
  });

  const [formError, setFormError] = useState('');

  // ── SENSOR TELEMETRY SIMULATION STATE ──
  const [simRecyclable, setSimRecyclable] = useState(0);
  const [simNonRecyclable, setSimNonRecyclable] = useState(0);
  const [simConnectivity, setSimConnectivity] = useState<'online' | 'offline'>('online');

  const handleOpenBinDetails = (bin: Bin) => {
    setSelectedBin(bin);
    setSimRecyclable(bin.recyclablePct || 0);
    setSimNonRecyclable(bin.nonRecyclablePct || 0);
    setSimConnectivity(bin.connectivity || 'online');
  };

  const handleSendTelemetry = () => {
    if (!selectedBin) return;
    const fillLevel = Math.max(simRecyclable, simNonRecyclable);
    const weightKg = Math.round((simRecyclable + simNonRecyclable) * 1.5);
    const status = fillLevel > 80 ? 'full' : fillLevel > 40 ? 'medium' : 'empty';

    updateBin(selectedBin.id, {
      recyclablePct: simRecyclable,
      nonRecyclablePct: simNonRecyclable,
      fillLevel,
      weightKg,
      status,
      connectivity: simConnectivity,
      lastUpdated: new Date().toISOString(),
    });

    if (fillLevel > 85) {
      addActivity({
        type: 'alert',
        description: `CRITICAL OVERFLOW ALERT: Bin ${selectedBin.id} at ${selectedBin.location} exceeded 85% fill level (${fillLevel}%).`,
        userId: user?.id || 'system',
      });
    } else if (simConnectivity === 'offline' && selectedBin.connectivity === 'online') {
      addActivity({
        type: 'alert',
        description: `OFFLINE ALERT: Smart Bin ${selectedBin.id} at ${selectedBin.location} went offline.`,
        userId: user?.id || 'system',
      });
    }

    setSelectedBin(prev => {
      if (!prev) return null;
      return {
        ...prev,
        recyclablePct: simRecyclable,
        nonRecyclablePct: simNonRecyclable,
        fillLevel,
        weightKg,
        status,
        connectivity: simConnectivity,
        lastUpdated: new Date().toISOString(),
      };
    });
  };

  const visibleBins = filterByRole(bins, user, 'bin') as Bin[];

  // Filter & Sort
  const filtered = visibleBins
    .filter((b) => {
      const matchSearch =
        b.id.toLowerCase().includes(search.toLowerCase()) ||
        b.location.toLowerCase().includes(search.toLowerCase()) ||
        (b.customerName || '').toLowerCase().includes(search.toLowerCase());
      
      const matchStatus =
        filterStatus === 'all' || getBinStatusLabel(b.fillLevel).toLowerCase() === filterStatus;
      
      const matchArchived = showArchived ? b.archived === true : !b.archived;
      
      return matchSearch && matchStatus && matchArchived;
    })
    .sort((a, b) => {
      if (sortKey === 'location') return a.location.localeCompare(b.location);
      return (b[sortKey] as number) - (a[sortKey] as number);
    });

  // Handle Add Bin
  const handleAddBin = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!newBin.id.trim() || !newBin.location.trim() || !newBin.customerName.trim()) {
      setFormError('Bin ID, Location, and Customer Name are required.');
      return;
    }

    if (bins.some(b => b.id.toLowerCase() === newBin.id.trim().toLowerCase())) {
      setFormError('A bin with this ID already exists.');
      return;
    }

    const newBinObj: Bin = {
      id: newBin.id.trim().toUpperCase(),
      location: newBin.location.trim(),
      zone: 'Zone A',
      fillLevel: 0,
      weightKg: 0,
      lastCollected: new Date().toISOString(),
      status: 'empty',
      categories: [
        { name: 'plastic', weightKg: 0, percentage: 0 },
        { name: 'organic', weightKg: 0, percentage: 0 },
        { name: 'glass', weightKg: 0, percentage: 0 },
        { name: 'paper', weightKg: 0, percentage: 0 },
        { name: 'metal', weightKg: 0, percentage: 0 },
      ],
      connectivity: 'online',
      lastUpdated: new Date().toISOString(),
      recyclablePct: 0,
      nonRecyclablePct: 0,
      segregationScore: 100,
      customerName: newBin.customerName.trim(),
      assignedRouteId: undefined,
      archived: false,
      history: [{
        modifiedBy: user?.displayName || 'Operator',
        timestamp: new Date().toISOString(),
        prevValues: 'Bin Registered',
        newValues: `ID: ${newBin.id.trim().toUpperCase()}, Customer: ${newBin.customerName.trim()}`,
      }]
    };

    addBin(newBinObj);
    setIsAddOpen(false);
    setNewBin({ id: '', location: '', customerName: '' });
  };

  // Open Edit Form
  const handleOpenEdit = (bin: Bin) => {
    setEditForm({
      location: bin.location,
      customerName: bin.customerName || '',
      assignedRouteId: bin.assignedRouteId || '',
    });
    setFormError('');
    setIsEditOpen(true);
  };

  // Handle Edit Bin
  const handleEditBin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBin) return;
    setFormError('');

    if (!editForm.location.trim() || !editForm.customerName.trim()) {
      setFormError('Location and Customer Name are required.');
      return;
    }

    updateBin(selectedBin.id, {
      location: editForm.location.trim(),
      customerName: editForm.customerName.trim(),
      assignedRouteId: editForm.assignedRouteId || undefined,
      modifiedBy: user?.displayName || 'Operator',
    });

    // Update locally selected bin for insights view
    setSelectedBin(prev => {
      if (!prev) return null;
      return {
        ...prev,
        location: editForm.location.trim(),
        customerName: editForm.customerName.trim(),
        assignedRouteId: editForm.assignedRouteId || undefined,
      };
    });

    setIsEditOpen(false);
  };

  // Handle Archive / Restore Bin
  const handleToggleArchive = (bin: Bin) => {
    const nextArchived = !bin.archived;
    updateBin(bin.id, {
      archived: nextArchived,
      modifiedBy: user?.displayName || 'Operator',
    });
    
    // Close modal if details open
    setSelectedBin(null);
  };

  // Render components inside modal
  const getBinHistory = (bin: Bin) => {
    // Filter activities involving this bin
    return activities.filter(a => a.description.includes(bin.id));
  };

  return (
    <div className="bins-page">
      {/* Controls & Search */}
      <div className="bins-controls" style={{ gap: '16px', flexWrap: 'wrap' }}>
        <div className="search-wrapper" style={{ flex: '1 1 250px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by ID, Customer, Location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="filter-group" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={15} style={{ color: 'var(--text-muted)' }} />
          {(['all', 'empty', 'medium', 'full'] as FilterStatus[]).map((s) => (
            <button
              key={s}
              className={`filter-btn ${filterStatus === s ? 'filter-btn--active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', userSelect: 'none', color: 'var(--text-muted)' }}>
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              style={{ accentColor: 'var(--primary)' }}
            />
            Show Archived Bins
          </label>

          <select
            className="sort-select"
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px 12px', borderRadius: '6px' }}
          >
            <option value="fillLevel">Sort: Fill Level</option>
            <option value="segregationScore">Sort: Segregation Score</option>
            <option value="weightKg">Sort: Weight</option>
            <option value="location">Sort: Location</option>
          </select>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsAddOpen(true)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 16px' }}
          >
            <Plus size={16} /> Add Smart Bin
          </button>
        </div>
      </div>

      <p className="bins-count" style={{ marginTop: '12px', color: 'var(--text-muted)', fontSize: '13px' }}>
        {filtered.length} of {visibleBins.filter(b => showArchived ? b.archived : !b.archived).length} bins shown {showArchived && '(Archived Mode)'}
      </p>

      {/* Grid of Bins */}
      <div className="bin-overview-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', marginTop: '16px' }}>
        {filtered.map((bin) => {
          const color = getBinStatusColor(bin.fillLevel);
          const label = getBinStatusLabel(bin.fillLevel);
          const isOnline = bin.connectivity === 'online';

          return (
            <div 
              key={bin.id} 
              className="card bin-mini-card" 
              onClick={() => handleOpenBinDetails(bin)}
              style={{ 
                cursor: 'pointer', 
                border: bin.fillLevel > 85 ? '1px solid var(--red-500)' : '1px solid var(--border)',
                transition: 'transform 0.2s, border-color 0.2s',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="bin-mini-id" style={{ color: 'var(--primary)', fontWeight: 700 }}>{bin.id}</span>
                <span 
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '4px', 
                    fontSize: '11px', 
                    color: isOnline ? 'var(--green-400)' : 'var(--text-dim)' 
                  }}
                >
                  {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>

              <div style={{ minHeight: '44px' }}>
                <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>
                  {bin.customerName || 'Operational Bin'}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {bin.location}
                </div>
              </div>

              <div className="bin-fill-bar-wrapper" style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden', marginTop: '4px' }}>
                <div 
                  className="bin-fill-bar" 
                  style={{ width: `${bin.fillLevel}%`, background: color, height: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', fontWeight: 600, marginTop: '2px' }}>
                <span style={{ color }}>{bin.fillLevel}% Full ({label})</span>
                <span style={{ color: 'var(--text-muted)' }}>{bin.weightKg} kg</span>
              </div>

              {bin.fillLevel > 80 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--red-400)', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
                  <AlertTriangle size={12} /> Overflow Risk
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div style={{ gridColumn: '1 / -1', padding: '48px', textAlign: 'center', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', color: 'var(--text-muted)' }}>
            No bins found. Create a new bin or adjust filters to begin.
          </div>
        )}
      </div>

      {/* ── ADD SMART BIN MODAL ── */}
      {isAddOpen && (
        <div className="modal-overlay">
          <div className="modal-content wizard-modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Plus size={20} style={{ color: 'var(--primary)' }} />
                <h2>Register Smart Bin</h2>
              </div>
              <button className="btn-close" onClick={() => setIsAddOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleAddBin}>
              <div className="wizard-body">
                {formError && <div className="wizard-error">{formError}</div>}
                
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Bin ID / Serial Number <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. BIN-009"
                    value={newBin.id}
                    onChange={e => setNewBin({ ...newBin, id: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Customer Name / Hotel Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Grand Hyatt Lobby"
                    value={newBin.customerName}
                    onChange={e => setNewBin({ ...newBin, customerName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Physical Address / Location <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="e.g. Sector 4, Ground Floor Entrance"
                    value={newBin.location}
                    onChange={e => setNewBin({ ...newBin, location: e.target.value })}
                    required
                  />
                </div>


              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Register Bin</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BIN INSIGHTS MODAL ── */}
      {selectedBin && (() => {
        const binBatches = batches.filter(b => b.source === selectedBin.id);
        const binTrendData = binBatches.map(b => ({
          date: new Date(b.timestamps.created).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
          weight: b.weightKg,
          plastic: b.plasticWeightKg,
        })).reverse();

        return (
          <div className="modal-overlay">
            <div className="modal-content wizard-modal" style={{ maxWidth: '580px', width: '90%' }}>
              <div className="modal-header">
                <div className="wizard-title">
                  <Info size={20} style={{ color: 'var(--primary)' }} />
                  <h2>Bin Operations &amp; Insights: {selectedBin.id}</h2>
                </div>
                <button className="btn-close" onClick={() => setSelectedBin(null)}><X size={20} /></button>
              </div>
              
              <div className="wizard-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                
                {/* Basic Meta row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', background: 'var(--surface-2)', padding: '12px 16px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Customer / Hotel Name</div>
                    <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text)' }}>{selectedBin.customerName || 'None'}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Location</div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text)' }}>{selectedBin.location}</div>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Updated</div>
                    <div style={{ fontSize: '13px', color: 'var(--text)' }}>{new Date(selectedBin.lastUpdated).toLocaleString('en-IN')}</div>
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Route Assignment</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--primary)' }}>
                      {(() => {
                        const r = routes.find(route => route.id === selectedBin.assignedRouteId);
                        return r ? `${r.routeName} (Driver: ${r.driverName})` : 'Unassigned';
                      })()}
                    </div>
                  </div>
                  {selectedBin.lastModifiedBy && (
                    <div style={{ marginTop: '4px', gridColumn: '1 / -1' }}>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Last Modified</div>
                      <div style={{ fontSize: '12px', color: 'var(--text)' }}>
                        By {selectedBin.lastModifiedBy} at {selectedBin.lastModifiedTime ? new Date(selectedBin.lastModifiedTime).toLocaleDateString() : '—'}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── SENSOR TELEMETRY SIMULATOR ── */}
                <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Wifi size={16} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                      Live Sensor Telemetry Simulator (Future-Ready)
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        <span>Recyclable Fill:</span>
                        <strong>{simRecyclable}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={simRecyclable} 
                        onChange={e => setSimRecyclable(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)' }}
                      />
                    </div>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                        <span>Non-Recyclable Fill:</span>
                        <strong>{simNonRecyclable}%</strong>
                      </div>
                      <input 
                        type="range" 
                        min="0" 
                        max="100" 
                        value={simNonRecyclable} 
                        onChange={e => setSimNonRecyclable(parseInt(e.target.value))}
                        style={{ width: '100%', accentColor: 'var(--primary)' }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
                    <select 
                      className="form-control"
                      value={simConnectivity}
                      onChange={e => setSimConnectivity(e.target.value as 'online' | 'offline')}
                      style={{ background: 'var(--surface-3)', border: '1px solid var(--border)', color: 'var(--text)', padding: '6px', borderRadius: '4px', fontSize: '12px', width: '150px' }}
                    >
                      <option value="online">📡 Sensor Online</option>
                      <option value="offline">🔌 Sensor Offline</option>
                    </select>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleSendTelemetry}
                      style={{ fontSize: '12px', height: '32px', padding: '0 16px' }}
                    >
                      Send Sensor Update
                    </button>
                  </div>
                </div>

                {/* Recyclable / Non-recyclable Progress bars */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 700 }}>Telemetry Capacities</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--green-400)', fontWeight: 600 }}>Recyclable Fill Level</span>
                        <strong>{selectedBin.recyclablePct}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${selectedBin.recyclablePct}%`, background: 'var(--green-500)', height: '100%' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '4px' }}>
                        <span style={{ color: 'var(--amber-500)', fontWeight: 600 }}>Non-Recyclable Fill Level</span>
                        <strong>{selectedBin.nonRecyclablePct}%</strong>
                      </div>
                      <div style={{ height: '8px', background: 'var(--surface-3)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ width: `${selectedBin.nonRecyclablePct}%`, background: 'var(--amber-500)', height: '100%' }} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Individual Bin Waste Trends */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 700 }}>Waste Weight Trends</h4>
                  {binTrendData.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-dim)', textAlign: 'center', padding: '16px', background: 'var(--surface-2)', borderRadius: '8px' }}>
                      No batch collections recorded yet.
                    </div>
                  ) : (
                    <div style={{ height: '140px', background: 'var(--surface-2)', padding: '10px', borderRadius: '8px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={binTrendData}>
                          <XAxis dataKey="date" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
                          <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit="kg" />
                          <ChartTooltip contentStyle={{ background: 'var(--surface)', border: '1px solid var(--border)', fontSize: 11 }} />
                          <Line type="monotone" dataKey="weight" stroke="var(--green-500)" strokeWidth={2} dot={{ r: 3 }} name="Total Weight" />
                          <Line type="monotone" dataKey="plastic" stroke="var(--primary)" strokeWidth={1.5} dot={{ r: 2 }} name="Plastic" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>

                {/* Categories Weight Breakdown */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 700 }}>Material Weights</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px', background: 'var(--surface-2)', padding: '12px', borderRadius: '8px' }}>
                    {selectedBin.categories.map((cat: WasteCategory) => (
                      <div key={cat.name} style={{ fontSize: '12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                        <span style={{ textTransform: 'capitalize', color: 'var(--text-muted)' }}>{cat.name}</span>
                        <strong style={{ color: 'var(--text)' }}>{cat.weightKg} kg</strong>
                      </div>
                    ))}
                    <div style={{ gridColumn: '1 / -1', fontSize: '12px', display: 'flex', justifyContent: 'space-between', paddingTop: '4px', fontWeight: 700, color: 'var(--primary)' }}>
                      <span>Total Weight</span>
                      <span>{selectedBin.weightKg} kg</span>
                    </div>
                  </div>
                </div>

                {/* Active Alerts */}
                {selectedBin.fillLevel > 60 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: selectedBin.fillLevel > 80 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(245, 158, 11, 0.1)', border: '1px solid', borderColor: selectedBin.fillLevel > 80 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)', padding: '10px 14px', borderRadius: '6px' }}>
                    <AlertTriangle size={18} style={{ color: selectedBin.fillLevel > 80 ? 'var(--red-400)' : 'var(--amber-400)' }} />
                    <div style={{ fontSize: '12px' }}>
                      <strong style={{ color: selectedBin.fillLevel > 80 ? 'var(--red-400)' : 'var(--amber-400)' }}>
                        {selectedBin.fillLevel > 80 ? 'Critical Overflow Alert' : 'Warning Alert'}
                      </strong>
                      <div style={{ color: 'var(--text-muted)' }}>
                        {selectedBin.fillLevel > 80 ? `Current fill level is ${selectedBin.fillLevel}% (over limit). Schedule pickup immediately.` : `Current fill level is ${selectedBin.fillLevel}% (approaching threshold).`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Activity History */}
                <div>
                  <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 700 }}>Activity History</h4>
                  <div style={{ maxHeight: '100px', overflowY: 'auto', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {getBinHistory(selectedBin).length === 0 ? (
                      <div style={{ color: 'var(--text-dim)', textAlign: 'center', padding: '8px' }}>No operational history for this bin.</div>
                    ) : (
                      getBinHistory(selectedBin).map((act) => (
                        <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '4px' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{act.description}</span>
                          <span style={{ color: 'var(--text-dim)', fontSize: '10px' }}>{new Date(act.timestamp).toLocaleDateString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Audit history */}
                {selectedBin.history && selectedBin.history.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '13px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <History size={14} /> Modification Audit Log
                    </h4>
                    <div className="audit-history-panel" style={{ margin: 0, padding: '10px', maxHeight: '110px', overflowY: 'auto' }}>
                      {selectedBin.history.map((h, i) => (
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
              </div>

              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => handleToggleArchive(selectedBin)}
                  style={{ 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    color: selectedBin.archived ? 'var(--green-400)' : 'var(--red-400)',
                    borderColor: selectedBin.archived ? 'var(--green-900)' : 'var(--red-900)'
                  }}
                >
                  {selectedBin.archived ? <RotateCcw size={14} /> : <Archive size={14} />}
                  {selectedBin.archived ? 'Restore Bin' : 'Archive Bin'}
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => handleOpenEdit(selectedBin)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Edit3 size={14} /> Edit Details
                  </button>
                  <button type="button" className="btn btn-primary" onClick={() => setSelectedBin(null)}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── EDIT BIN MODAL ── */}
      {isEditOpen && selectedBin && (
        <div className="modal-overlay">
          <div className="modal-content wizard-modal" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <div className="wizard-title">
                <Edit3 size={20} style={{ color: 'var(--primary)' }} />
                <h2>Edit Bin: {selectedBin.id}</h2>
              </div>
              <button className="btn-close" onClick={() => setIsEditOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditBin}>
              <div className="wizard-body">
                {formError && <div className="wizard-error">{formError}</div>}
                
                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Customer Name / Hotel Name <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.customerName}
                    onChange={e => setEditForm({ ...editForm, customerName: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Physical Address / Location <span style={{ color: 'var(--red-400)' }}>*</span></label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.location}
                    onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '14px' }}>
                  <label>Assigned Route ID</label>
                  <select
                    className="form-control"
                    value={editForm.assignedRouteId}
                    onChange={e => setEditForm({ ...editForm, assignedRouteId: e.target.value })}
                    style={{ background: 'var(--surface-2)', color: 'var(--text)' }}
                  >
                    <option value="">-- Unassigned --</option>
                    {routes.map(r => (
                      <option key={r.id} value={r.id}>{r.routeName} (Driver: {r.driverName})</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
