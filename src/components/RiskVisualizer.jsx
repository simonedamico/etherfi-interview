import React, { useState, useEffect, useRef } from 'react';
import { formatUSD, formatPercent } from '../utils/format';
import './RiskVisualizer.css';

const RiskVisualizer = ({ data }) => {
    const trackRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);
    const [simulatedBorrow, setSimulatedBorrow] = useState(null);

    // Calculate maxBorrow early for hook dependency, ensuring it exists
    const maxBorrow = data ? Number(data.maxBorrow) / 1e6 : 0;

    // Initialize or reset simulated value when data changes
    useEffect(() => {
        if (data) {
            setSimulatedBorrow(Number(data.totalBorrow) / 1e6);
        }
    }, [data]);

    const handleMouseDown = (e) => {
        e.preventDefault();
        setIsDragging(true);
    };

    // Drag simulation effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging || !trackRef.current) return;

            const rect = trackRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, x / rect.width));

            const newBorrow = percentage * maxBorrow;
            setSimulatedBorrow(newBorrow);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, maxBorrow]);

    // Early return AFTER all hooks
    if (!data || simulatedBorrow === null) return null;

    const toFloat = (val) => {
        if (!val) return 0;
        return Number(val) / 1e6;
    };

    const totalCollateral = toFloat(data.totalCollateral);
    const currentBorrow = simulatedBorrow;

    const ltv = totalCollateral > 0 ? currentBorrow / totalCollateral : 0;
    const healthFactor = maxBorrow > 0 ? currentBorrow / maxBorrow : 0;

    const getRiskColor = (usage) => {
        if (usage >= 0.8) return 'var(--danger)';
        if (usage >= 0.6) return 'var(--warning)';
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
                    <p className="value" style={{ color: isDragging ? riskColor : 'inherit', transition: 'color 0.2s' }}>
                        {formatUSD(currentBorrow)}
                    </p>
                </div>
                <div className="stat-card">
                    <h3>Borrowing Power</h3>
                    <p className="value">{formatUSD(maxBorrow)}</p>
                </div>
            </div>

            <div className="gauge-container">
                <h3>Liquidation Risk (Drag to Simulate)</h3>
                <div className="gauge-wrapper" ref={trackRef} style={{ cursor: isDragging ? 'col-resize' : 'default' }}>
                    {/* Background Track */}
                    <div className="gauge-track"></div>

                    {/* Progress Fill */}
                    <div
                        className="gauge-fill"
                        style={{
                            width: `${Math.min(healthFactor * 100, 100)}%`,
                            backgroundColor: riskColor,
                            boxShadow: `0 0 12px ${riskColor}`,
                            transition: isDragging ? 'none' : 'width 1s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.5s'
                        }}
                    >
                        <span className="gauge-percentage">{formatPercent(healthFactor)}</span>

                        {/* Drag Handle */}
                        <div
                            className="gauge-handle"
                            onMouseDown={handleMouseDown}
                            style={{ backgroundColor: riskColor }}
                        />
                    </div>

                    {/* Floating Label for Total Borrow */}
                    <div
                        className="gauge-value floating"
                        style={{
                            left: `${Math.min(healthFactor * 100, 100)}%`,
                            color: riskColor,
                            transition: isDragging ? 'none' : 'left 1s cubic-bezier(0.4, 0, 0.2, 1)',
                            pointerEvents: 'none'
                        }}
                    >
                        {formatUSD(currentBorrow)}
                    </div>

                    {/* Fixed Label for Max Borrow */}
                    <div className="gauge-value max">
                        {formatUSD(maxBorrow)}
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
