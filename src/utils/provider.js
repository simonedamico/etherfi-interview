/**
 * Ethereum Provider Singleton
 *
 * Provides a single shared RPC provider instance to avoid
 * creating multiple connections across the application.
 */

import { ethers } from 'ethers';
import { NETWORK } from '../config';

let providerInstance = null;

/**
 * Gets the shared JSON-RPC provider instance.
 * Creates the provider lazily on first call.
 *
 * @returns {ethers.JsonRpcProvider} The shared provider instance
 */
export const getProvider = () => {
  if (!providerInstance) {
    providerInstance = new ethers.JsonRpcProvider(NETWORK.rpcUrl);
  }
  return providerInstance;
};

/**
 * Resets the provider instance.
 * Useful for testing or when switching networks.
 */
export const resetProvider = () => {
  providerInstance = null;
};
