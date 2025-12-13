/**
 * API Utilities
 *
 * Functions for fetching on-chain data from the Ether.fi CashLens contract
 * and ERC20 token metadata via multicall.
 */

import { ethers } from 'ethers';
import { CashLensABI, ERC20ABI, MulticallABI } from './abi.js';
import { CONTRACTS, LTV_CONFIG } from '../config';
import { getProvider } from './provider.js';
import {
  PRICE_MULTIPLIER,
  DEFAULT_TOKEN_DECIMALS,
  CONTRACT_ERRORS,
  ERROR_MESSAGES,
} from './constants.js';
import { calculateVaultMetrics } from './calculations.js';

// Re-export for backward compatibility
export { LTV_CONFIG };
export { calculateVaultMetrics };

/**
 * Fetches vault data from the CashLens contract.
 *
 * @param {string} address - The vault/Safe address to query
 * @returns {Promise<Object>} Vault data including collateral, borrows, prices, and metrics
 * @throws {Error} User-friendly error message on failure
 */
export const fetchSafeData = async (address) => {
  try {
    const provider = getProvider();
    const contract = new ethers.Contract(CONTRACTS.CASH_LENS, CashLensABI, provider);

    // Fetch vault data (second arg is debtServiceTokenPreference, empty for view)
    const rawData = await contract.getSafeCashData(address, []);

    // Convert to plain object to avoid Ethers Result spread issues
    const data = {
      collateralBalances: rawData.collateralBalances.map((t) => ({
        token: t.token,
        amount: t.amount,
      })),
      borrows: rawData.borrows.map((t) => ({
        token: t.token,
        amount: t.amount,
      })),
      tokenPrices: rawData.tokenPrices.map((t) => ({
        token: t.token,
        amount: t.amount,
      })),
      maxBorrow: rawData.maxBorrow,
    };

    // Copy additional properties if they exist
    ['totalCollateral', 'totalBorrow', 'healthFactor'].forEach((key) => {
      if (rawData[key] !== undefined) data[key] = rawData[key];
    });

    // Recalculate metrics using hardcoded LTV values
    if (data.collateralBalances.length > 0) {
      try {
        const metadataMap = await fetchTokensMetadataBatch(data.collateralBalances, provider);

        const priceMap = new Map();
        data.tokenPrices.forEach((p) => {
          priceMap.set(p.token.toLowerCase(), Number(p.amount));
        });

        const metrics = calculateVaultMetrics(data.collateralBalances, priceMap, metadataMap);

        data.maxBorrow = metrics.maxBorrow;
        if (data.totalCollateral !== undefined || metrics.totalCollateral > 0) {
          data.totalCollateral = metrics.totalCollateral;
        }
      } catch (calcError) {
        console.warn('Error recalculating max borrow:', calcError);
        // Fallback to original data.maxBorrow
      }
    }

    return data;
  } catch (error) {
    console.error('Fetch Error:', error);

    if (error.code === 'CALL_EXCEPTION') {
      if (error.data === CONTRACT_ERRORS.INVALID_SAFE) {
        throw new Error(ERROR_MESSAGES.INVALID_SAFE);
      }
      throw new Error(ERROR_MESSAGES.FETCH_FAILED);
    }
    throw new Error(error.message || ERROR_MESSAGES.UNKNOWN);
  }
};

/**
 * Fetches metadata for a single token.
 *
 * @param {string} tokenAddress - Token contract address
 * @param {ethers.JsonRpcProvider} provider - Ethers provider
 * @returns {Promise<{symbol: string, decimals: number}>} Token metadata
 */
export const fetchTokenMetadata = async (tokenAddress, provider) => {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
    const [symbol, decimals] = await Promise.all([
      contract.symbol().catch(() => 'UNKNOWN'),
      contract.decimals().catch(() => DEFAULT_TOKEN_DECIMALS),
    ]);
    return { symbol, decimals: Number(decimals) };
  } catch (error) {
    console.warn(`Failed to fetch metadata for ${tokenAddress}`, error);
    return { symbol: 'UNKNOWN', decimals: DEFAULT_TOKEN_DECIMALS };
  }
};

/**
 * Fetches metadata (symbol and decimals) for multiple tokens in a single RPC call.
 *
 * @param {Array<{token: string}>} tokens - Array of token objects with address
 * @param {ethers.JsonRpcProvider} [provider] - Optional provider (uses singleton if not provided)
 * @returns {Promise<Map<string, {symbol: string, decimals: number}>>} Token metadata map
 */
export const fetchTokensMetadataBatch = async (tokens, provider) => {
  if (!tokens || tokens.length === 0) {
    return new Map();
  }

  const rpcProvider = provider || getProvider();
  const multicallContract = new ethers.Contract(
    CONTRACTS.MULTICALL3,
    MulticallABI,
    rpcProvider
  );
  const erc20Interface = new ethers.Interface(ERC20ABI);

  // Prepare calls for symbol() and decimals() for each token
  const calls = [];
  const tokenAddresses = tokens.map((t) => t.token || t[0]);

  for (const tokenAddress of tokenAddresses) {
    calls.push({
      target: tokenAddress,
      callData: erc20Interface.encodeFunctionData('symbol'),
    });
    calls.push({
      target: tokenAddress,
      callData: erc20Interface.encodeFunctionData('decimals'),
    });
  }

  try {
    const results = await multicallContract.tryAggregate.staticCall(false, calls);
    const metadataMap = new Map();

    for (let i = 0; i < tokenAddresses.length; i++) {
      const symbolResult = results[i * 2];
      const decimalsResult = results[i * 2 + 1];

      let symbol = 'UNKNOWN';
      let decimals = DEFAULT_TOKEN_DECIMALS;

      if (symbolResult.success) {
        try {
          symbol = erc20Interface.decodeFunctionResult('symbol', symbolResult.returnData)[0];
        } catch {
          console.warn(`Could not decode symbol for ${tokenAddresses[i]}`);
        }
      }

      if (decimalsResult.success) {
        try {
          decimals = Number(
            erc20Interface.decodeFunctionResult('decimals', decimalsResult.returnData)[0]
          );
        } catch {
          console.warn(`Could not decode decimals for ${tokenAddresses[i]}`);
        }
      }

      metadataMap.set(tokenAddresses[i].toLowerCase(), { symbol, decimals });
    }

    return metadataMap;
  } catch (error) {
    console.error('Multicall failed:', error);
    return new Map();
  }
};

/**
 * Fetches LTV percentages for multiple tokens.
 * Uses hardcoded values from Ether.fi documentation.
 *
 * @param {Array<{token: string}>} tokens - Array of token objects
 * @returns {Promise<Map<string, {ltv: number, liquidationThreshold: number, liquidationBonus: number}>>}
 */
export const fetchTokenLTVsBatch = async (tokens) => {
  if (!tokens || tokens.length === 0) return new Map();

  const configMap = new Map();

  tokens.forEach((t) => {
    const tokenAddress = (t.token || t[0]).toLowerCase();

    if (LTV_CONFIG[tokenAddress] !== undefined) {
      configMap.set(tokenAddress, {
        ltv: LTV_CONFIG[tokenAddress],
        liquidationThreshold: 0,
        liquidationBonus: 0,
      });
    } else {
      configMap.set(tokenAddress, { ltv: 0, liquidationThreshold: 0, liquidationBonus: 0 });
    }
  });

  return configMap;
};
