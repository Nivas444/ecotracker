import type {
  Bin,
  BinAlert,
  CleanlinessScore,
  EnvironmentalImpact,
  PlasticPrice,
  TrendDataPoint,
  User,
} from '../types';
import { filterByRole } from './batchUtils';

// ── Alerts ────────────────────────────────────────────────────

/**
 * Returns sorted alerts for bins that exceed fill thresholds.
 * >80 → critical (overflow risk), >60 → warning (pickup soon)
 */
export function getBinAlerts(bins: Bin[], user: User | null): BinAlert[] {
  const filteredBins = filterByRole(bins, user, 'bin');
  const alerts: BinAlert[] = [];

  for (const bin of filteredBins) {
    if (bin.connectivity === 'offline') {
      alerts.push({
        binId: bin.id,
        location: bin.customerName || bin.location,
        severity: 'warning',
        message: `Offline – Sensor telemetry lost`,
        fillLevel: bin.fillLevel,
      });
    }

    if (bin.fillLevel > 85) {
      alerts.push({
        binId: bin.id,
        location: bin.customerName || bin.location,
        severity: 'critical',
        message: `Critical overflow risk – ${bin.fillLevel}% full`,
        fillLevel: bin.fillLevel,
      });
    } else if (bin.fillLevel > 60) {
      alerts.push({
        binId: bin.id,
        location: bin.customerName || bin.location,
        severity: 'warning',
        message: `Pickup soon – ${bin.fillLevel}% full`,
        fillLevel: bin.fillLevel,
      });
    }
  }

  // Sort: critical first, then by fill level descending
  return alerts.sort((a, b) => {
    if (a.severity === b.severity) return b.fillLevel - a.fillLevel;
    return a.severity === 'critical' ? -1 : 1;
  });
}

// ── Environmental Impact ──────────────────────────────────────

/**
 * Derives CO2 saved, waste diverted, and recycled plastic from bin data.
 * Formula: CO2 saved = totalPlasticKg * 1.5
 */
export function calculateImpact(bins: Bin[]): EnvironmentalImpact {
  // We'll leave this as is since calculateCO2 is now batch-based.
  // The user prompt specifically asked to add CO2 calculation using batch composition data.
  // We will calculate CO2 in MetricsRow using batches instead of bins.
  let plasticKg = 0;
  let totalKg = 0;

  for (const bin of bins) {
    totalKg += bin.weightKg;
    const plasticCat = bin.categories.find((c) => c.name === 'plastic');
    if (plasticCat) plasticKg += plasticCat.weightKg;
  }

  return {
    co2SavedKg: parseFloat((plasticKg * 1.5).toFixed(1)),
    wasteDivertedKg: parseFloat(totalKg.toFixed(1)),
    plasticRecycledKg: parseFloat(plasticKg.toFixed(1)),
    binsMonitored: bins.length,
  };
}

// ── Cleanliness Score ─────────────────────────────────────────

/**
 * Returns a cleanliness score based on average bin fill level.
 * <30 → Green Zone, 30–60 → Moderate, >60 → Needs Attention
 */
export function getCleanlinessScore(bins: Bin[]): CleanlinessScore {
  if (bins.length === 0) {
    return { score: 0, label: 'Green Zone', color: '#22c55e' };
  }

  const avg = bins.reduce((sum, b) => sum + b.fillLevel, 0) / bins.length;
  const score = parseFloat(avg.toFixed(1));

  if (score < 30) {
    return { score, label: 'Green Zone', color: '#22c55e' };
  } else if (score <= 60) {
    return { score, label: 'Moderate', color: '#f59e0b' };
  } else {
    return { score, label: 'Needs Attention', color: '#ef4444' };
  }
}

// ── Trend Intelligence ────────────────────────────────────────

/**
 * Derives an insight string from 7-day trend data.
 * Finds peak day and calculates week-over-week change for plastic.
 */
export function generateTrendInsight(data: TrendDataPoint[]): string {
  if (data.length === 0) return '';

  const peak = data.reduce((max, d) => (d.plastic > max.plastic ? d : max), data[0]);
  const firstHalf = data.slice(0, Math.floor(data.length / 2));
  const secondHalf = data.slice(Math.floor(data.length / 2));

  const avgFirst = firstHalf.reduce((s, d) => s + d.plastic, 0) / firstHalf.length;
  const avgSecond = secondHalf.reduce((s, d) => s + d.plastic, 0) / secondHalf.length;
  const trend = avgSecond > avgFirst ? 'rising' : 'declining';

  return `Plastic waste peaks on ${peak.date} (${peak.plastic} kg). Weekend volume is ${trend} — consider extra pickups on Fri–Sat.`;
}

// ── Market Insights ───────────────────────────────────────────

/**
 * Returns a market summary string from current plastic prices.
 */
export function getMarketInsights(prices: PlasticPrice[]): string {
  const sellCount = prices.filter((p) => p.action === 'Sell').length;
  const bestSell = prices
    .filter((p) => p.action === 'Sell')
    .sort((a, b) => b.pricePerKg - a.pricePerKg)[0];

  if (sellCount === 0) {
    return 'Markets are soft. Hold inventory and wait for better prices.';
  }

  return `${sellCount} market${sellCount > 1 ? 's' : ''} recommend selling. Best rate: ${bestSell.region} @ ${bestSell.currency.replace('/kg', '')} ${bestSell.pricePerKg}/kg.`;
}

// ── Bin status helpers ────────────────────────────────────────

export function getBinStatusColor(fillLevel: number): string {
  if (fillLevel > 80) return '#ef4444'; // red
  if (fillLevel > 40) return '#f59e0b'; // amber
  return '#22c55e';                      // green
}

export function getBinStatusLabel(fillLevel: number): 'Full' | 'Medium' | 'Empty' {
  if (fillLevel > 80) return 'Full';
  if (fillLevel > 40) return 'Medium';
  return 'Empty';
}
