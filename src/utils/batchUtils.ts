import type {
  Bin,
  Batch,
  BatchStatus,
  BatchDestination,
  ESGMetrics,
  ComplianceStatus,
  User,
} from '../types';

// ── Status progression order ──────────────────────────────────

const STATUS_ORDER: BatchStatus[] = [
  'CREATED',
  'DELIVERED',
  'VERIFIED',
];

// ── Role Filtering ────────────────────────────────────────────

export function filterByRole<T>(data: T[], _user: User | null, _type: 'bin' | 'batch' | 'alert'): T[] {
  // Everyone is Admin now, role system is bypassed
  return data;
}

// ── Batch Creation ────────────────────────────────────────────

let batchCounter = 0;

/**
 * Creates a Batch from a Bin (legacy auto-generate path).
 */
export function createBatchFromBin(bin: Bin): Batch {
  batchCounter += 1;
  const id = `BATCH-${String(batchCounter).padStart(3, '0')}`;

  const totalKg = bin.weightKg || 1;
  const catPct = (name: string): number => {
    const cat = bin.categories.find(c => c.name === name);
    return cat ? Math.round((cat.weightKg / totalKg) * 100) : 0;
  };

  const basePlasticPct = catPct('plastic');
  const composition = {
    pet: Math.floor(basePlasticPct * 0.4),
    hdpe: Math.floor(basePlasticPct * 0.3),
    ldpe: Math.floor(basePlasticPct * 0.1),
    pp: Math.floor(basePlasticPct * 0.1),
    mixed: Math.floor(basePlasticPct * 0.1),
    metal: catPct('metal'),
    glass: catPct('glass'),
    organic: catPct('organic'),
    paper: catPct('paper'),
  };

  const plasticCat = bin.categories.find(c => c.name === 'plastic');
  const plasticWeightKg = plasticCat ? plasticCat.weightKg : 0;
  const metalCat = bin.categories.find(c => c.name === 'metal');
  const glassCat = bin.categories.find(c => c.name === 'glass');

  const destination: BatchDestination = 'recycler';

  const audit = {
    qrVerified: Math.random() > 0.2,
    gpsLogged: Math.random() > 0.15,
    photoVerified: Math.random() > 0.25,
  };

  return {
    id,
    source: bin.id,
    sourceLocation: bin.location || `Location ${batchCounter}`,
    weightKg: bin.weightKg,
    plasticWeightKg,
    metalWeightKg: metalCat?.weightKg,
    glassWeightKg: glassCat?.weightKg,
    composition,
    status: 'COLLECTED',
    destination,
    timestamps: {
      created: new Date().toISOString(),
    },
    audit,
    driverName: 'John Doe',
    vehicleId: 'TRK-9921',
    quality: 'Medium',
  };
}

/**
 * Creates a Batch from the manual 4-step wizard.
 */
export function createManualBatch(data: {
  bin: Bin;
  weightKg: number;
  plasticWeightKg: number;
  metalWeightKg?: number;
  glassWeightKg?: number;
  quality: 'Good' | 'Medium' | 'Poor';
  timestamp: string;
  ownerId: string;
}): Batch {
  batchCounter += 1;
  const id = `BATCH-${String(batchCounter).padStart(3, '0')}`;

  // Build legacy composition object so CSV export still works
  const safeTotal = data.weightKg || 1;
  const calcPct = (kg: number) => Math.round((kg / safeTotal) * 100) || 0;
  const plasticPct = calcPct(data.plasticWeightKg);
  const composition = {
    pet: Math.floor(plasticPct * 0.4),
    hdpe: Math.floor(plasticPct * 0.3),
    ldpe: Math.floor(plasticPct * 0.1),
    pp: Math.floor(plasticPct * 0.1),
    mixed: Math.floor(plasticPct * 0.1),
    metal: calcPct(data.metalWeightKg ?? 0),
    glass: calcPct(data.glassWeightKg ?? 0),
    organic: 0,
    paper: 0,
  };

  const audit = {
    qrVerified: true,
    gpsLogged: true,
    photoVerified: true,
  };

  return {
    id,
    source: data.bin.id,
    sourceLocation: data.bin.location,
    weightKg: data.weightKg,
    plasticWeightKg: data.plasticWeightKg,
    metalWeightKg: data.metalWeightKg,
    glassWeightKg: data.glassWeightKg,
    composition,
    quality: data.quality,
    status: 'CREATED',
    destination: 'recycler',
    ownerId: data.ownerId,
    timestamps: {
      created: data.timestamp || new Date().toISOString(),
    },
    audit,
    driverName: 'Pending Assignment',
    vehicleId: 'TBD',
  } as Batch & { ownerId: string };
}

// ── Status Advancement ────────────────────────────────────────

/**
 * Returns a new batch with status advanced one step.
 * If already at 'VERIFIED', returns unchanged.
 */
export function advanceBatchStatus(batch: Batch): Batch {
  const currentIdx = STATUS_ORDER.indexOf(batch.status);
  if (currentIdx >= STATUS_ORDER.length - 1) return batch;

  const nextStatus = STATUS_ORDER[currentIdx + 1];
  const now = new Date().toISOString();

  const timestampUpdates: Partial<Batch['timestamps']> = {};
  if (nextStatus === 'DELIVERED') timestampUpdates.delivered = now;
  if (nextStatus === 'VERIFIED') timestampUpdates.verified = now;

  return {
    ...batch,
    status: nextStatus,
    timestamps: { ...batch.timestamps, ...timestampUpdates },
  };
}

// ── CO2 Calculation ───────────────────────────────────────────

/**
 * CO₂ saved = plasticWeightKg × 3.0 (average mixed recyclable plastic factor).
 * Source: average emission factor for mixed recyclable plastics.
 */
export function calculateCO2(batches: Batch[]): number {
  const CO2_FACTOR = 3.0; // kg CO₂ saved per kg of plastic recycled
  let totalCO2 = 0;

  for (const b of batches) {
    totalCO2 += b.plasticWeightKg * CO2_FACTOR;
  }

  return parseFloat(totalCO2.toFixed(1));
}

// ── ESG Metrics ───────────────────────────────────────────────

/**
 * Calculates aggregate ESG metrics from all batches.
 */
export function calculateESGMetrics(batches: Batch[]): ESGMetrics {
  if (batches.length === 0) {
    return { co2SavedKg: 0, landfillDivertedKg: 0, recyclingPct: 0 };
  }

  let totalWeight = 0;
  let recyclableWeight = 0;

  for (const b of batches) {
    totalWeight += b.weightKg;
    recyclableWeight += b.plasticWeightKg + (b.metalWeightKg ?? 0) + (b.glassWeightKg ?? 0);
  }

  return {
    co2SavedKg: calculateCO2(batches),
    landfillDivertedKg: parseFloat(totalWeight.toFixed(1)),
    recyclingPct: totalWeight > 0
      ? parseFloat(((recyclableWeight / totalWeight) * 100).toFixed(1))
      : 0,
  };
}

// ── Compliance Check ──────────────────────────────────────────

/**
 * Returns compliance status for a single batch.
 * Compliant if all audit checks pass.
 */
export function getComplianceStatus(batch: Batch): ComplianceStatus {
  const auditPassed =
    batch.audit.qrVerified && batch.audit.gpsLogged && batch.audit.photoVerified;

  return auditPassed ? 'Verified' : 'Pending';
}

// ── Status helpers ────────────────────────────────────────────

export function getStatusIndex(status: BatchStatus): number {
  return STATUS_ORDER.indexOf(status);
}

export function getStatusLabel(status: BatchStatus): string {
  const labels: Record<BatchStatus, string> = {
    CREATED: 'Created',
    COLLECTED: 'Collected',
    DELIVERED: 'Delivered',
    VERIFIED: 'Verified',
  };
  return labels[status];
}

// ── Trend Data ────────────────────────────────────────────────

export function generateTrendFromBatches(batches: Batch[]): import('../types').TrendDataPoint[] {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trendMap: Record<string, import('../types').TrendDataPoint> = {};

  const today = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dayStr = days[d.getDay()];
    trendMap[dayStr] = { date: dayStr, plastic: 0, organic: 0, glass: 0, paper: 0, metal: 0 };
  }

  for (const b of batches) {
    const d = new Date(b.timestamps.created);
    const dayStr = days[d.getDay()];
    if (trendMap[dayStr]) {
      trendMap[dayStr].plastic += b.plasticWeightKg;
      trendMap[dayStr].metal += b.metalWeightKg ?? 0;
      trendMap[dayStr].glass += b.glassWeightKg ?? 0;
      // other categories derived from composition for display
      const org = (b.composition.organic / 100) * b.weightKg;
      const paper = (b.composition.paper / 100) * b.weightKg;
      trendMap[dayStr].organic += org;
      trendMap[dayStr].paper += paper;
    }
  }

  return Object.values(trendMap).map(v => ({
    date: v.date,
    plastic: parseFloat(v.plastic.toFixed(1)),
    organic: parseFloat(v.organic.toFixed(1)),
    glass: parseFloat(v.glass.toFixed(1)),
    paper: parseFloat(v.paper.toFixed(1)),
    metal: parseFloat(v.metal.toFixed(1)),
  }));
}

// ── Pickup prediction helper ──────────────────────────────────

/**
 * Returns estimated hours until full based on current fill level.
 * Simple linear extrapolation for demo purposes.
 */
export function estimatePickupHours(fillLevel: number): number | null {
  if (fillLevel >= 100) return 0;
  if (fillLevel < 60) return null; // No prediction needed yet
  // Assume fill rate of ~4% per hour in peak usage
  const remaining = 100 - fillLevel;
  return Math.max(1, Math.round(remaining / 4));
}

export { STATUS_ORDER };
