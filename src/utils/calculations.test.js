/**
 * Calculation Utilities Tests
 *
 * Unit tests for the pure calculation functions used in vault metrics.
 */

import { describe, it, expect } from 'vitest';
import {
  toUSDFloat,
  toUSDScaled,
  calculateHealthFactor,
  calculateLTV,
  buildPriceMap,
  mergeSimulatedPrices,
  calculateVaultMetrics,
} from './calculations';

describe('toUSDFloat', () => {
  it('converts 6-decimal scaled value to float', () => {
    expect(toUSDFloat(1000000)).toBe(1);
    expect(toUSDFloat(1500000)).toBe(1.5);
    expect(toUSDFloat(123456789)).toBe(123.456789);
  });

  it('handles zero and undefined', () => {
    expect(toUSDFloat(0)).toBe(0);
    expect(toUSDFloat(undefined)).toBe(0);
    expect(toUSDFloat(null)).toBe(0);
  });

  it('handles BigInt values', () => {
    expect(toUSDFloat(BigInt(5000000))).toBe(5);
  });
});

describe('toUSDScaled', () => {
  it('converts float to 6-decimal scaled integer', () => {
    expect(toUSDScaled(1)).toBe(1000000);
    expect(toUSDScaled(1.5)).toBe(1500000);
    expect(toUSDScaled(0.000001)).toBe(1);
  });

  it('floors fractional values', () => {
    expect(toUSDScaled(1.0000001)).toBe(1000000);
    expect(toUSDScaled(1.9999999)).toBe(1999999);
  });
});

describe('calculateHealthFactor', () => {
  it('calculates ratio of borrow to max borrow', () => {
    expect(calculateHealthFactor(50, 100)).toBe(0.5);
    expect(calculateHealthFactor(80, 100)).toBe(0.8);
    expect(calculateHealthFactor(100, 100)).toBe(1);
  });

  it('returns 0 when max borrow is 0', () => {
    expect(calculateHealthFactor(50, 0)).toBe(0);
  });

  it('handles over-borrowed positions', () => {
    expect(calculateHealthFactor(150, 100)).toBe(1.5);
  });
});

describe('calculateLTV', () => {
  it('calculates loan-to-value ratio', () => {
    expect(calculateLTV(50, 100)).toBe(0.5);
    expect(calculateLTV(25, 100)).toBe(0.25);
  });

  it('returns 0 when collateral is 0', () => {
    expect(calculateLTV(50, 0)).toBe(0);
  });
});

describe('buildPriceMap', () => {
  it('creates a Map from price array', () => {
    const prices = [
      { token: '0xABC', amount: 1000000 },
      { token: '0xDEF', amount: 2000000 },
    ];
    const map = buildPriceMap(prices);

    expect(map.get('0xabc')).toBe(1000000);
    expect(map.get('0xdef')).toBe(2000000);
  });

  it('lowercases addresses', () => {
    const prices = [{ token: '0xABCDEF', amount: 1000000 }];
    const map = buildPriceMap(prices);

    expect(map.get('0xabcdef')).toBe(1000000);
    expect(map.has('0xABCDEF')).toBe(false);
  });

  it('handles empty or null input', () => {
    expect(buildPriceMap(null).size).toBe(0);
    expect(buildPriceMap([]).size).toBe(0);
  });
});

describe('mergeSimulatedPrices', () => {
  it('merges original prices with simulated overrides', () => {
    const original = [
      { token: '0xAAA', amount: 1000000 },
      { token: '0xBBB', amount: 2000000 },
    ];
    const simulated = { '0xaaa': 1500000 };

    const merged = mergeSimulatedPrices(original, simulated);

    expect(merged.get('0xaaa')).toBe(1500000); // Overridden
    expect(merged.get('0xbbb')).toBe(2000000); // Original
  });
});

describe('calculateVaultMetrics', () => {
  it('calculates total collateral and max borrow', () => {
    // Mock token with 18 decimals, $1000 price, 50% LTV
    const collateralTokens = [
      {
        token: '0xf0bb20865277abd641a307ece5ee04e79073416c', // LiquidETH (50% LTV in config)
        amount: BigInt('1000000000000000000'), // 1 token
      },
    ];

    const priceMap = new Map([
      ['0xf0bb20865277abd641a307ece5ee04e79073416c', 1000000000], // $1000
    ]);

    const metadataMap = new Map([
      ['0xf0bb20865277abd641a307ece5ee04e79073416c', { symbol: 'TEST', decimals: 18 }],
    ]);

    const result = calculateVaultMetrics(collateralTokens, priceMap, metadataMap);

    // 1 token * $1000 = $1000 collateral
    expect(Number(result.totalCollateral) / 1e6).toBe(1000);

    // $1000 * 50% LTV = $500 max borrow
    expect(Number(result.maxBorrow) / 1e6).toBe(500);
  });

  it('handles tokens not in LTV config', () => {
    const collateralTokens = [
      {
        token: '0x0000000000000000000000000000000000000000', // Not in config
        amount: BigInt('1000000000000000000'),
      },
    ];

    const priceMap = new Map([['0x0000000000000000000000000000000000000000', 1000000000]]);
    const metadataMap = new Map([
      ['0x0000000000000000000000000000000000000000', { symbol: 'UNKNOWN', decimals: 18 }],
    ]);

    const result = calculateVaultMetrics(collateralTokens, priceMap, metadataMap);

    // Collateral value is still counted
    expect(Number(result.totalCollateral) / 1e6).toBe(1000);
    // But max borrow is 0 (0% LTV)
    expect(Number(result.maxBorrow) / 1e6).toBe(0);
  });
});
