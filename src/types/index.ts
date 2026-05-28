// ============================================================
// Core domain types for Smart Waste Management Dashboard
// ============================================================

export type WasteCategoryName = 'plastic' | 'organic' | 'glass' | 'paper' | 'metal';

export interface WasteCategory {
  name: WasteCategoryName;
  weightKg: number;
  percentage: number; // of total bin capacity
}

export type BinStatus = 'empty' | 'medium' | 'full';
export type BinConnectivity = 'online' | 'offline';

export interface Bin {
  id: string;
  location: string;
  zone: string;
  fillLevel: number;        // 0–100 %
  weightKg: number;
  lastCollected: string;    // ISO date string
  status: BinStatus;
  categories: WasteCategory[];
  latitude?: number;
  longitude?: number;
  owner?: string;           // e.g. "user" or "admin"
  // ── Smart Bin Fields ──────────────────────────────────
  connectivity: BinConnectivity;
  lastUpdated: string;      // ISO date string
  recyclablePct: number;    // 0–100 %
  nonRecyclablePct: number; // 0–100 %
  segregationScore: number; // 0–100
  // ── Operational & Audit Fields ────────────────────────
  customerName?: string;
  deviceId?: string;
  archived?: boolean;
  assignedRouteId?: string;
  lastModifiedBy?: string;
  lastModifiedTime?: string;
  history?: Array<{
    modifiedBy: string;
    timestamp: string;
    prevValues: string;
    newValues: string;
  }>;
}

// ── Route Management ─────────────────────────────────────────

export interface Route {
  id: string;
  routeName: string;
  driverName: string;
  vehicleNumber: string;
  assignedBins: Array<{
    binId: string;
    customerName: string;
    location: string;
    status: 'pending' | 'collected';
  }>;
  expectedCompletionTime: string; // ISO datetime string
  status: 'pending' | 'active' | 'completed';
  delayStatus: boolean;
  createdAt: string;
}

// ── Pricing ─────────────────────────────────────────────────

export type Region = 'IN' | 'US' | 'EU';
export type TrendDirection = 'up' | 'down' | 'stable';
export type MarketAction = 'Sell' | 'Hold';

export interface PlasticPrice {
  id: string;
  region: Region;
  pricePerKg: number;       // USD
  currency: string;
  trend: TrendDirection;
  action: MarketAction;
  updatedAt: string;        // ISO date string
}

// ── Trend data ───────────────────────────────────────────────

export interface TrendDataPoint {
  date: string;             // e.g. "Mon", "Tue"
  plastic: number;
  organic: number;
  glass: number;
  paper: number;
  metal: number;
}

// ── Auth ─────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user';

export interface User {
  id: string;
  username: string;
  role: UserRole;
  displayName: string;
  avatarInitials: string;
}

// ── Activity log ─────────────────────────────────────────────

export type ActivityType =
  | 'buy'
  | 'sell'
  | 'alert'
  | 'collection'
  | 'login'
  | 'pickup'
  | 'delivery'
  | 'verification';

export interface Activity {
  id: string;
  type: ActivityType;
  description: string;
  timestamp: string;        // ISO date string
  userId: string;
  batchId?: string;         // links activity to a specific batch (for user filtering)
  metadata?: Record<string, unknown>;
}

// ── Alerts ───────────────────────────────────────────────────

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface BinAlert {
  binId: string;
  location: string;
  severity: AlertSeverity;
  message: string;
  fillLevel: number;
}

// ── Environmental Impact ─────────────────────────────────────

export interface EnvironmentalImpact {
  co2SavedKg: number;
  wasteDivertedKg: number;
  plasticRecycledKg: number;
  binsMonitored: number;
}

// ── Cleanliness score ────────────────────────────────────────

export type CleanlinessLabel = 'Green Zone' | 'Moderate' | 'Needs Attention';

export interface CleanlinessScore {
  score: number;            // average fill %
  label: CleanlinessLabel;
  color: string;
}

// ── Global app state ─────────────────────────────────────────

export interface AppState {
  user: User | null;
  bins: Bin[];
  prices: PlasticPrice[];
  activities: Activity[];
}

// ── Recycler ─────────────────────────────────────────────────

export type RecyclerStatus = 'Receiving' | 'Paused' | 'Closed';

export interface Recycler {
  id: string;
  name: string;
  acceptedWasteType: string;
  buyingPricePerKg: number;
  currency: string;         // e.g. "₹"
  priceUnit: string;        // e.g. "kg"
  trend: TrendDirection;
  status: RecyclerStatus;
  location: string;
  contactPerson: string;
}

// ── Batch Tracking ──────────────────────────────────────────

export type BatchStatus = 'COLLECTED' | 'DELIVERED' | 'VERIFIED';
export type BatchDestination = 'marketplace' | 'recycler';
export type ComplianceStatus = 'Verified' | 'Pending';

export interface BatchComposition {
  // Kept for CSV export backward-compatibility; wizard no longer populates these
  pet: number;
  hdpe: number;
  ldpe: number;
  pp: number;
  mixed: number;
  metal: number;
  glass: number;
  organic: number;
  paper: number;
}

export interface AuditIndicators {
  qrVerified: boolean;
  gpsLogged: boolean;
  photoVerified: boolean;
}

export interface Batch {
  id: string;
  source: string;               // bin ID
  sourceLocation: string;       // readable location
  weightKg: number;             // total waste weight
  plasticWeightKg: number;      // plastic weight (drives CO₂ calc)
  metalWeightKg?: number;
  glassWeightKg?: number;
  composition: BatchComposition; // kept for legacy CSV export
  status: BatchStatus;
  destination: BatchDestination;
  assignedRecyclerId?: string;  // id from Recycler list
  timestamps: {
    created: string;
    assigned?: string;
    inTransit?: string;
    delivered?: string;
    verified?: string;
  };
  audit: AuditIndicators;
  driverName?: string;
  vehicleId?: string;
  routeId?: string;
  quality?: 'Good' | 'Medium' | 'Poor';
  verificationProof?: string;   // mock: description or image reference
  ownerId?: string;             // to associate batch with a user
  history?: Array<{
    modifiedBy: string;
    timestamp: string;
    prevValues: string;
    newValues: string;
  }>;
}

export interface ESGMetrics {
  co2SavedKg: number;
  landfillDivertedKg: number;
  recyclingPct: number;
}

export interface LogisticsProvider {
  id: string;
  driverName: string;
  vehicleNumber: string;
  contactNumber: string;
}

export interface Driver {
  id: string;
  driverName: string;
  phoneNumber: string;
  email: string;
  experience: string;
  assignedVehicle: string; // vehicle number plate
}

export interface Vehicle {
  id: string;
  vehicleNumber: string; // plate
  vehicleType: string;
  capacityKg: number;
  assignedDriver: string; // driver name
  status: 'Available' | 'On Route' | 'Maintenance';
}

export interface BrandingConfig {
  companyName: string;
  logoUrl: string;
}

