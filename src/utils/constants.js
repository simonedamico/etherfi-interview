/**
 * Application Constants
 *
 * Magic numbers and commonly used values extracted for clarity and maintainability.
 */

// Price decimals used by the CashLens contract (6 decimals = $1.000000)
export const PRICE_DECIMALS = 6;
export const PRICE_MULTIPLIER = 1e6;

// Default token decimals when metadata fetch fails
export const DEFAULT_TOKEN_DECIMALS = 18;

// Error codes from smart contracts
export const CONTRACT_ERRORS = {
  INVALID_SAFE: '0x34d0b499', // CashLens error for non-Safe addresses
};

// Error messages for user display
export const ERROR_MESSAGES = {
  INVALID_SAFE: 'This address is not a valid Ether.fi Safe.',
  FETCH_FAILED: 'Could not fetch vault data. Ensure address is a valid Safe on Scroll.',
  UNKNOWN: 'An unknown error occurred while fetching data.',
};

// Ethereum address validation regex
export const ETH_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;

// Default APY display for borrowed assets (for UI display only)
export const DEFAULT_BORROW_APY = 4;
