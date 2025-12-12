import React from 'react';
import { formatUSD, formatPercent } from '../utils/format';
import './RiskVisualizer.css';

const RiskVisualizer = ({ data }) => {
    if (!data) return null;

    // Convert BigInt to number for visualization (assuming 18 decimals from raw data, but data here might already be parsed or in USD units from contract?)
    // The contract returns amounts in USD with 18 decimals usually if using PriceProvider.
    // Wait, `SafeCashData` has `uint256 totalCollateral` etc.
    // The ABI returns BigInts. I need to convert them.
    // Assuming USD values are 18 decimals (standard in these protocols).

    const toFloat = (val) => {
        if (!val) return 0;
        // value is likely BigInt 18 decimals
        return Number(val) / 1e6; // USD values are 6 decimals
    };

    const totalCollateral = toFloat(data.totalCollateral);
    const totalBorrow = toFloat(data.totalBorrow);
    const maxBorrow = toFloat(data.maxBorrow);

    const ltv = totalCollateral > 0 ? totalBorrow / totalCollateral : 0;
    const healthFactor = maxBorrow > 0 ? totalBorrow / maxBorrow : 0; // Usage ratio
    // If healthFactor >= 1.0, liquidation imminent. 
    // Typically maxBorrow < totalCollateral (LTV factor). 

    // Example: Collateral $1000, Max LTV 80% -> MaxBorrow $800. 
    // Borrow $400. Health = 400/800 = 50%.

    const getRiskColor = (usage) => {
        if (usage >= 0.9) return 'var(--danger)';
        if (usage >= 0.75) return 'var(--warning)';
        return 'var(--success)';
    };

    const riskColor = getRiskColor(healthFactor);

    return (
        <div className="risk-visualizer">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Total Collateral</h3>
                    <p className="value">{formatUSD(totalCollateral)}</p>
                </div>
                <div className="stat-card">
                    <h3>Total Debt</h3>
                    <p className="value">{formatUSD(totalBorrow)}</p>
                </div>
                <div className="stat-card">
                    <h3>Borrowing Power</h3>
                    <p className="value">{formatUSD(maxBorrow)}</p>
                </div>
            </div>

            <div className="gauge-container">
                <h3>Liquidation Risk</h3>
                <div className="gauge-bg">
                    <div
                        className="gauge-fill"
                        style={{
                            width: `${Math.min(healthFactor * 100, 100)}%`,
                            backgroundColor: riskColor
                        }}
                    />
                </div>
                <div className="gauge-labels">
                    <span>Safe</span>
                    <span>Liquidation Loop</span>
                </div>
                <div className="risk-metrics">
                    <div className="metric">
                        <span>Utilization:</span>
                        <strong style={{ color: riskColor }}>{formatPercent(healthFactor)}</strong>
                    </div>
                    <div className="metric">
                        <span>Current LTV:</span>
                        <strong>{formatPercent(ltv)}</strong>
                    </div>
                </div>
            </div>

            {healthFactor > 0.9 && (
                <div className="risk-alert">
                    WARNING: Your position is at high risk of liquidation!
                </div>
            )}
        </div>
    );
};

export default RiskVisualizer;
