import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';
import { formatUSD, formatPercent } from '../utils/format';
import { RISK_THRESHOLDS } from '../config';
import { PRICE_MULTIPLIER } from '../utils/constants';
import './RiskVisualizer.css';

/**
 * RiskVisualizer Component
 *
 * Displays vault metrics (collateral, debt, borrowing power) and an
 * interactive gauge for visualizing and simulating liquidation risk.
 * The gauge can be dragged to simulate different debt levels.
 */
const RiskVisualizer = ({ data }) => {
  const trackRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragBorrow, setDragBorrow] = useState(null);

  // Memoize derived values from data
  const metrics = useMemo(() => {
    if (!data) return null;
    return {
      maxBorrow: Number(data.maxBorrow) / PRICE_MULTIPLIER,
      totalBorrow: Number(data.totalBorrow) / PRICE_MULTIPLIER,
      totalCollateral: Number(data.totalCollateral) / PRICE_MULTIPLIER,
    };
  }, [data]);

  // Current displayed borrow value: drag value during interaction, otherwise actual
  const displayBorrow = dragBorrow ?? metrics?.totalBorrow ?? 0;
  const maxBorrow = metrics?.maxBorrow ?? 0;

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
    // Initialize drag at current value
    setDragBorrow(displayBorrow);
  }, [displayBorrow]);

  // Drag simulation effect - handles mouse move and release
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e) => {
      if (!trackRef.current || maxBorrow === 0) return;

      const rect = trackRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / rect.width));
      setDragBorrow(percentage * maxBorrow);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      // Keep the dragged value displayed after release
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, maxBorrow]);

  // Reset drag state when new data loads (e.g., new vault address)
  // This is intentional - we want to reset simulation when underlying data changes
  const dataId = data?.maxBorrow?.toString();
  useEffect(() => {
    setDragBorrow(null); // eslint-disable-line react-hooks/set-state-in-effect
  }, [dataId]);

  // Early return AFTER all hooks
  if (!metrics) return null;

  const healthFactor = maxBorrow > 0 ? displayBorrow / maxBorrow : 0;

  const getRiskColor = (usage) => {
    if (usage >= RISK_THRESHOLDS.DANGER) return 'var(--danger)';
    if (usage >= RISK_THRESHOLDS.WARNING) return 'var(--warning)';
    return 'var(--success)';
  };

  const riskColor = getRiskColor(healthFactor);

  return (
    <div className="risk-visualizer">
      <div className="stats-grid">
        <div className="stat-card">
          <h3>Total Collateral</h3>
          <p className="value">{formatUSD(metrics.totalCollateral)}</p>
        </div>
        <div className="stat-card">
          <h3>Total Debt</h3>
          <p
            className="value"
            style={{
              color: isDragging || dragBorrow !== null ? riskColor : 'inherit',
              transition: 'color 0.2s',
            }}
          >
            {formatUSD(displayBorrow)}
          </p>
        </div>
        <div className="stat-card">
          <h3>Borrowing Power</h3>
          <p className="value">{formatUSD(maxBorrow)}</p>
        </div>
      </div>

      <div className="gauge-container">
        <h3>
          Liquidation Risk
          <div className="tooltip-container">
            <span className="tooltip-icon">?</span>
            <div className="tooltip-content">
              Drag the white handle to simulate how increasing your debt affects your liquidation risk
              and health factor.
            </div>
          </div>
        </h3>
        <div
          className="gauge-wrapper"
          ref={trackRef}
          style={{ cursor: isDragging ? 'col-resize' : 'default' }}
        >
          {/* Background Track */}
          <div className="gauge-track"></div>

          {/* Progress Fill */}
          <div
            className="gauge-fill"
            style={{
              width: `${Math.min(healthFactor * 100, 100)}%`,
              backgroundColor: riskColor,
              boxShadow: `0 0 12px ${riskColor}`,
              transition: isDragging
                ? 'none'
                : 'width 1s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s',
            }}
          >
            {healthFactor >= 0.13 && (
              <span className="gauge-percentage">{formatPercent(healthFactor)}</span>
            )}

            {/* Drag Handle */}
            <div
              className="gauge-handle"
              onMouseDown={handleMouseDown}
              style={{ backgroundColor: riskColor }}
            />
          </div>

          {/* Floating Label for Total Borrow */}
          {healthFactor <= 0.82 && (
            <div
              className="gauge-value floating"
              style={{
                left: `${Math.min(healthFactor * 100, 100)}%`,
                color: riskColor,
                transition: isDragging ? 'none' : 'left 1s cubic-bezier(0.4, 0, 0.2, 1)',
                pointerEvents: 'none',
              }}
            >
              {formatUSD(displayBorrow)}
            </div>
          )}

          {/* Fixed Label for Max Borrow */}
          <div className="gauge-value max">{formatUSD(maxBorrow)}</div>
        </div>
      </div>

      {healthFactor > RISK_THRESHOLDS.CRITICAL && (
        <div className="risk-alert">WARNING: Your position is at high risk of liquidation!</div>
      )}
    </div>
  );
};

RiskVisualizer.propTypes = {
  data: PropTypes.shape({
    totalCollateral: PropTypes.oneOfType([PropTypes.number, PropTypes.bigint]),
    totalBorrow: PropTypes.oneOfType([PropTypes.number, PropTypes.bigint]),
    maxBorrow: PropTypes.oneOfType([PropTypes.number, PropTypes.bigint]),
  }),
};

RiskVisualizer.defaultProps = {
  data: null,
};

export default RiskVisualizer;
