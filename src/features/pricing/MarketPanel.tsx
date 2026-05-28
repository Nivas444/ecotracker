import { TrendingUp, TrendingDown, Minus, DollarSign, Recycle } from 'lucide-react';
import { useAppState } from '../../app/providers/AppStateContext';
import { useAuth } from '../../app/providers/AuthContext';
import { getMarketInsights } from '../../utils/insights';
import type { PlasticPrice, TrendDirection } from '../../types';

// ── Helpers ───────────────────────────────────────────────────

function TrendIcon({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <TrendingUp size={16} className="trend-up" />;
  if (direction === 'down') return <TrendingDown size={16} className="trend-down" />;
  return <Minus size={16} className="trend-stable" />;
}

function PriceCard({ price, onTrade }: { price: PlasticPrice; onTrade: (action: 'buy' | 'sell') => void }) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const isSell = price.action === 'Sell';

  return (
    <div className="price-card">
      <div className="price-card-header">
        <span className="region-badge">{price.region}</span>
        <TrendIcon direction={price.trend} />
      </div>
      <div className="price-value">
        <span className="price-amount">{price.pricePerKg}</span>
        <span className="price-currency">{price.currency}</span>
      </div>
      <div className={`action-badge action-badge--${isSell ? 'sell' : 'hold'}`}>
        {price.action}
      </div>

      {isAdmin && (
        <div className="trade-buttons">
          <button className="trade-btn trade-btn--sell" onClick={() => onTrade('sell')}>Sell</button>
          <button className="trade-btn trade-btn--buy" onClick={() => onTrade('buy')}>Buy</button>
        </div>
      )}
    </div>
  );
}

// ── Recycler rate rows ────────────────────────────────────────

const RECYCLER_RATES = [
  { label: 'Plastic (Mixed)', price: 1.20, unit: 'kg', currency: '$', trend: 'up' as TrendDirection },
  { label: 'Mixed Waste',     price: 0.80, unit: 'kg', currency: '$', trend: 'stable' as TrendDirection },
  { label: 'Metal Scrap',     price: 1.90, unit: 'kg', currency: '$', trend: 'up' as TrendDirection },
  { label: 'Glass',           price: 0.40,  unit: 'kg', currency: '$', trend: 'down' as TrendDirection },
  { label: 'Paper / Cardboard', price: 0.60, unit: 'kg', currency: '$', trend: 'stable' as TrendDirection },
];

function TrendSymbol({ direction }: { direction: TrendDirection }) {
  if (direction === 'up') return <span style={{ color: '#22c55e', fontWeight: 700 }}>↑</span>;
  if (direction === 'down') return <span style={{ color: '#ef4444', fontWeight: 700 }}>↓</span>;
  return <span style={{ color: '#f59e0b', fontWeight: 700 }}>→</span>;
}

// ── Panel ─────────────────────────────────────────────────────

export function MarketPanel() {
  const { prices, addActivity } = useAppState();
  const { user } = useAuth();
  const insight = getMarketInsights(prices);

  if (user?.role !== 'admin') return null;

  const handleTrade = (price: PlasticPrice, action: 'buy' | 'sell') => {
    addActivity({
      type: action,
      description: `${action === 'sell' ? 'Sold' : 'Bought'} 100 kg plastic in ${price.region} market @ ${price.currency.replace('/kg', '')} ${price.pricePerKg}/kg`,
      userId: user?.username ?? 'admin',
      metadata: { region: price.region, pricePerKg: price.pricePerKg, action },
    });
  };

  return (
    <div className="card">
      <div className="card-header">
        <DollarSign size={18} className="card-icon" />
        <h2 className="card-title">Marketplace &amp; Pricing</h2>
      </div>

      <p className="trend-insight">{insight}</p>

      {/* Global price cards */}
      <div className="prices-grid">
        {prices.map(price => (
          <PriceCard
            key={price.id}
            price={price}
            onTrade={(action) => handleTrade(price, action)}
          />
        ))}
      </div>

      {/* ── Recycler Rates ── */}
      <div style={{ marginTop: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Recycle size={16} style={{ color: '#6366f1' }} />
          <span style={{ fontWeight: 700, fontSize: '14px' }}>Recycler Buying Rates</span>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>(Current — US)</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {RECYCLER_RATES.map(rate => (
            <div
              key={rate.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 14px',
                borderRadius: '8px',
                background: 'var(--surface)',
                border: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{rate.label}</span>
              <span style={{ fontWeight: 700, fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {rate.currency}{rate.price}/{rate.unit}
                <TrendSymbol direction={rate.trend} />
              </span>
            </div>
          ))}
        </div>

        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '10px' }}>
          * Rates sourced from connected recyclers. Updated daily.
        </p>
      </div>
    </div>
  );
}
