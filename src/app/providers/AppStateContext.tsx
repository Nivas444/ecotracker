import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { Bin, PlasticPrice, Activity, Batch, Recycler, LogisticsProvider, BrandingConfig, Route, Driver, Vehicle } from '../../types';
import { mockBins, mockPrices, mockActivities, mockRecyclers, mockBatches } from '../../data/mockData';

// ── Types ─────────────────────────────────────────────────────

interface AppStateContextValue {
  bins: Bin[];
  prices: PlasticPrice[];
  activities: Activity[];
  batches: Batch[];
  recyclers: Recycler[];
  logistics: LogisticsProvider[];
  routes: Route[];
  drivers: Driver[];
  vehicles: Vehicle[];
  branding: BrandingConfig;
  theme: 'dark' | 'light';
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  addBin: (bin: Bin) => void;
  updateBin: (id: string, updates: Partial<Bin> & { modifiedBy?: string }) => void;
  addBatch: (batch: Batch) => void;
  updateBatch: (id: string, updates: Partial<Batch> & { modifiedBy?: string }) => void;
  addRecycler: (recycler: Recycler) => void;
  addLogistics: (provider: LogisticsProvider) => void;
  addRoute: (route: Route) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  addDriver: (driver: Driver) => void;
  addVehicle: (vehicle: Vehicle) => void;
  updateVehicleStatus: (vehicleNumber: string, status: Vehicle['status']) => void;
  updateBranding: (companyName: string, logoUrl: string) => void;
  toggleTheme: () => void;
}

// ── Context ───────────────────────────────────────────────────

const AppStateContext = createContext<AppStateContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [bins, setBins] = useState<Bin[]>(mockBins);
  const [prices] = useState<PlasticPrice[]>(mockPrices);
  const [activities, setActivities] = useState<Activity[]>(mockActivities);
  const [batches, setBatches] = useState<Batch[]>(mockBatches);
  const [recyclers, setRecyclers] = useState<Recycler[]>(mockRecyclers);
  const [logistics, setLogistics] = useState<LogisticsProvider[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([
    { id: 'DRV-1', driverName: 'Liam Neeson', phoneNumber: '+1-555-0199', email: 'liam@greencarib.com', experience: '8 years', assignedVehicle: 'CARIB-03' },
    { id: 'DRV-2', driverName: 'John Doe', phoneNumber: '+1-555-0144', email: 'john@greencarib.com', experience: '3 years', assignedVehicle: 'TRK-9921' },
    { id: 'DRV-3', driverName: 'John Williams', phoneNumber: '+1-555-0155', email: 'john.williams@greencarib.com', experience: '5 Years Experience', assignedVehicle: 'GC-2045' }
  ]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([
    { id: 'VEH-1', vehicleNumber: 'CARIB-03', vehicleType: 'Waste Compactor', capacityKg: 5000, assignedDriver: 'Liam Neeson', status: 'Available' },
    { id: 'VEH-2', vehicleNumber: 'TRK-9921', vehicleType: 'Flatbed Truck', capacityKg: 3000, assignedDriver: 'John Doe', status: 'Available' },
    { id: 'VEH-3', vehicleNumber: 'GC-2045', vehicleType: 'Waste Loader', capacityKg: 4000, assignedDriver: 'John Williams', status: 'Available' }
  ]);
  const [branding, setBranding] = useState<BrandingConfig>({
    companyName: 'Green Carib',
    logoUrl: '/image.png',
  });
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem('ecotracker-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return 'dark';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light-theme');
    } else {
      root.classList.remove('light-theme');
    }
    localStorage.setItem('ecotracker-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const addActivity = useCallback(
    (activity: Omit<Activity, 'id' | 'timestamp'>) => {
      const newActivity: Activity = {
        ...activity,
        id: `act-${Date.now()}`,
        timestamp: new Date().toISOString(),
      };
      setActivities((prev) => [newActivity, ...prev]);
    },
    []
  );

  const addBin = useCallback((bin: Bin) => {
    setBins((prev) => [...prev, bin]);
  }, []);

  const updateBin = useCallback((id: string, updates: Partial<Bin> & { modifiedBy?: string }) => {
    const { modifiedBy, ...cleanUpdates } = updates;
    setBins((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;

        const historyEntry: Array<{ modifiedBy: string; timestamp: string; prevValues: string; newValues: string }> = [];
        if (modifiedBy) {
          const timestamp = new Date().toISOString();
          Object.keys(cleanUpdates).forEach((key) => {
            const typedKey = key as keyof Bin;
            if (cleanUpdates[typedKey] !== undefined && cleanUpdates[typedKey] !== b[typedKey]) {
              historyEntry.push({
                modifiedBy,
                timestamp,
                prevValues: `${key}: ${JSON.stringify(b[typedKey])}`,
                newValues: `${key}: ${JSON.stringify(cleanUpdates[typedKey])}`,
              });
            }
          });
        }

        return {
          ...b,
          ...cleanUpdates,
          lastModifiedBy: modifiedBy || b.lastModifiedBy,
          lastModifiedTime: modifiedBy ? new Date().toISOString() : b.lastModifiedTime,
          history: historyEntry.length > 0 ? [...(b.history || []), ...historyEntry] : b.history,
        };
      })
    );
  }, []);

  const addBatch = useCallback((batch: Batch) => {
    setBatches((prev) => [batch, ...prev]);
  }, []);

  const updateBatch = useCallback((id: string, updates: Partial<Batch> & { modifiedBy?: string }) => {
    const { modifiedBy, ...cleanUpdates } = updates;
    setBatches((prev) =>
      prev.map((b) => {
        if (b.id !== id) return b;

        const historyEntry: Array<{ modifiedBy: string; timestamp: string; prevValues: string; newValues: string }> = [];
        if (modifiedBy) {
          const timestamp = new Date().toISOString();
          Object.keys(cleanUpdates).forEach((key) => {
            const typedKey = key as keyof Batch;
            if (cleanUpdates[typedKey] !== undefined && cleanUpdates[typedKey] !== b[typedKey]) {
              historyEntry.push({
                modifiedBy,
                timestamp,
                prevValues: `${key}: ${JSON.stringify(b[typedKey])}`,
                newValues: `${key}: ${JSON.stringify(cleanUpdates[typedKey])}`,
              });
            }
          });
        }

        return {
          ...b,
          ...cleanUpdates,
          history: historyEntry.length > 0 ? [...(b.history || []), ...historyEntry] : b.history,
        };
      })
    );
  }, []);

  const addRecycler = useCallback((recycler: Recycler) => {
    setRecyclers((prev) => [...prev, recycler]);
  }, []);

  const addLogistics = useCallback((provider: LogisticsProvider) => {
    setLogistics((prev) => [...prev, provider]);
  }, []);

  const addRoute = useCallback((route: Route) => {
    setRoutes((prev) => [...prev, route]);
  }, []);

  const updateRoute = useCallback((id: string, updates: Partial<Route>) => {
    setRoutes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...updates } : r))
    );
  }, []);

  const addDriver = useCallback((driver: Driver) => {
    setDrivers((prev) => [...prev, driver]);
  }, []);

  const addVehicle = useCallback((vehicle: Vehicle) => {
    setVehicles((prev) => [...prev, vehicle]);
  }, []);

  const updateVehicleStatus = useCallback((vehicleNumber: string, status: Vehicle['status']) => {
    setVehicles((prev) =>
      prev.map((v) => (v.vehicleNumber === vehicleNumber ? { ...v, status } : v))
    );
  }, []);

  const updateBranding = useCallback((companyName: string, logoUrl: string) => {
    setBranding({ companyName, logoUrl });
  }, []);

  return (
    <AppStateContext.Provider
      value={{
        bins,
        prices,
        activities,
        batches,
        recyclers,
        logistics,
        routes,
        drivers,
        vehicles,
        branding,
        theme,
        addActivity,
        addBin,
        updateBin,
        addBatch,
        updateBatch,
        addRecycler,
        addLogistics,
        addRoute,
        updateRoute,
        addDriver,
        addVehicle,
        updateVehicleStatus,
        updateBranding,
        toggleTheme,
      }}
    >
      {children}
    </AppStateContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────

export function useAppState(): AppStateContextValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) throw new Error('useAppState must be used inside <AppStateProvider>');
  return ctx;
}
