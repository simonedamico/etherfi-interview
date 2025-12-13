/**
 * Vault Calculation Utilities
 *
 * Pure functions for calculating vault metrics like LTV, max borrow,
 * and health factor. These are extracted from App.jsx for testability
 * and reusability.
 */

import { ethers } from 'ethers';
import { LTV_CONFIG } from '../config';
import { PRICE_MULTIPLIER, DEFAULT_TOKEN_DECIMALS } from './constants';

/**
 * @typedef {Object} TokenBalance
 * @property {string} token - Token contract address
 * @property {bigint} amount - Token amount in native decimals
 */

/**
 * @typedef {Object} TokenMetadata
 * @property {string} symbol - Token symbol (e.g., "USDC")
 * @property {number} decimals - Token decimals (e.g., 6 for USDC)
 */

/**
 * @typedef {Object} VaultMetrics
 * @property {bigint} maxBorrow - Maximum borrowable amount in 6-decimal USD
 * @property {bigint} totalCollateral - Total collateral value in 6-decimal USD
 */

/**
 * Calculates vault metrics from collateral tokens and current prices.
 *
 * @param {TokenBalance[]} collateralTokens - Array of collateral token balances
 * @param {Map<string, number>} priceMap - Map of token address to price (6 decimals)
 * @param {Map<string, TokenMetadata>} metadataMap - Map of token address to metadata
 * @returns {VaultMetrics} Calculated vault metrics
 */
export const calculateVaultMetrics = (collateralTokens, priceMap, metadataMap) => {
  let calculatedMaxBorrowUSD = 0;
  let calculatedTotalCollateralUSD = 0;

  collateralTokens.forEach((token) => {
    const tokenAddr = (token.token || token[0]).toLowerCase();
    const amount = token.amount || token[1];
    const decimals = metadataMap.get(tokenAddr)?.decimals || DEFAULT_TOKEN_DECIMALS;
    const price = priceMap.get(tokenAddr) || 0;
    const ltv = LTV_CONFIG[tokenAddr] || 0;

    // Convert to human-readable values
    const amountFloat = Number(ethers.formatUnits(amount, decimals));
    const priceFloat = price / PRICE_MULTIPLIER;
    const valueUSD = amountFloat * priceFloat;
    const borrowPower = valueUSD * (ltv / 100);

    calculatedMaxBorrowUSD += borrowPower;
    calculatedTotalCollateralUSD += valueUSD;
  });

  return {
    maxBorrow: BigInt(Math.floor(calculatedMaxBorrowUSD * PRICE_MULTIPLIER)),
    totalCollateral: BigInt(Math.floor(calculatedTotalCollateralUSD * PRICE_MULTIPLIER)),
  };
};

/**
 * Converts a 6-decimal USD BigInt to a float.
 *
 * @param {bigint|number|undefined} value - Value in 6-decimal format
 * @returns {number} Float USD value
 */
export const toUSDFloat = (value) => {
  if (!value) return 0;
  return Number(value) / PRICE_MULTIPLIER;
};

/**
 * Converts a float USD value to 6-decimal integer.
 *
 * @param {number} value - Float USD value
 * @returns {number} Scaled integer (6 decimals)
 */
export const toUSDScaled = (value) => {
  return Math.floor(value * PRICE_MULTIPLIER);
};

/**
 * Calculates the health factor (borrow usage ratio).
 *
 * @param {number} currentBorrow - Current borrowed amount in USD
 * @param {number} maxBorrow - Maximum borrowable amount in USD
 * @returns {number} Health factor (0-1+, where 1 = fully utilized)
 */
export const calculateHealthFactor = (currentBorrow, maxBorrow) => {
  if (maxBorrow <= 0) return 0;
  return currentBorrow / maxBorrow;
};

/**
 * Calculates the Loan-to-Value ratio.
 *
 * @param {number} currentBorrow - Current borrowed amount in USD
 * @param {number} totalCollateral - Total collateral value in USD
 * @returns {number} LTV ratio (0-1+)
 */
export const calculateLTV = (currentBorrow, totalCollateral) => {
  if (totalCollateral <= 0) return 0;
  return currentBorrow / totalCollateral;
};

/**
 * Builds a price map from token price data.
 *
 * @param {Array<{token: string, amount: number|bigint}>} tokenPrices - Price data from contract
 * @returns {Map<string, number>} Map of lowercase address to price (6 decimals)
 */
export const buildPriceMap = (tokenPrices) => {
  const priceMap = new Map();
  if (tokenPrices) {
    tokenPrices.forEach((p) => {
      priceMap.set(p.token.toLowerCase(), Number(p.amount));
    });
  }
  return priceMap;
};

/**
 * Merges original prices with simulated price overrides.
 *
 * @param {Array<{token: string, amount: number}>} originalPrices - Original price data
 * @param {Object<string, number>} simulatedPrices - Object of address to simulated price
 * @returns {Map<string, number>} Merged price map
 */
export const mergeSimulatedPrices = (originalPrices, simulatedPrices) => {
  const priceMap = buildPriceMap(originalPrices);

  // Override with simulated prices
  Object.keys(simulatedPrices).forEach((addr) => {
    priceMap.set(addr, simulatedPrices[addr]);
  });

  return priceMap;
};
