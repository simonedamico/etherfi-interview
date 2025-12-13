/**
 * Application Configuration
 *
 * Centralized configuration for the Ether.fi Cash Risk Visualizer.
 * All hardcoded values, contract addresses, and network settings are defined here
 * for easy maintenance and environment-specific overrides.
 */

// Network Configuration
export const NETWORK = {
  name: 'Scroll',
  chainId: 534352,
  rpcUrl: 'https://rpc.scroll.io',
};

// Contract Addresses (Scroll Network)
export const CONTRACTS = {
  CASH_LENS: '0x7DA874f3BacA1A8F0af27E5ceE1b8C66A772F84E',
  MULTICALL3: '0xcA11bde05977b3631167028862bE2a173976CA11',
  DEBT_MANAGER: '0x8f9d2Cd33551CE06dD0564Ba147513F715c2F4a0',
};

// Demo vault address for quick testing
export const DEMO_VAULT_ADDRESS = '0x3f07a5603665033B04AD0eD4ebc0419F982d9F94';

/**
 * Loan-to-Value (LTV) Configuration by Token Address
 *
 * These values represent the maximum percentage of collateral value
 * that can be borrowed against each token. Values are from Ether.fi documentation.
 *
 * Example: 55% LTV means you can borrow up to $55 for every $100 of collateral
 */
export const LTV_CONFIG = {
  // Native/Wrapped ETH
  '0x5300000000000000000000000000000000000004': 55, // wETH

  // Stablecoins (highest LTV)
  '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4': 90, // USDC
  '0xf55bec9cafdbe8730f096aa55dad6d22d44099df': 90, // USDT

  // Ether.fi Native Tokens
  '0x01f0a31698c4d065659b9bdc21b3610292a1c506': 55, // weETH
  '0x939778d83b46b456224a33fb59630b11dec56663': 80, // eUSD
  '0x657e8c867d8b37dcc18fa4caead9c45eb088c642': 52, // eBTC
  '0x056a5fa5da84ceb7f93d36e545c5905607d8bd81': 20, // ETHFI

  // Liquid Tokens
  '0xf0bb20865277abd641a307ece5ee04e79073416c': 50, // LiquidETH
  '0x5f46d540b6ed704c3c8789105f30e075aa900726': 50, // LiquidBTC
  '0x08c6f91e2b681faf5e17227f2a44c307b3c1364c': 80, // LiquidUSD

  // Partner Tokens
  '0xd83e3d560ba6f05094d9d8b3eb8aaea571d1864e': 45, // wHYPE
  '0xa519afbc91986c0e7501d7e34968fee51cd901ac': 40, // beHYPE
  '0xd29687c813d741e2f938f4ac377128810e217b1b': 20, // SCR
};

// Risk Thresholds for UI coloring
export const RISK_THRESHOLDS = {
  WARNING: 0.6,  // 60% - Yellow warning
  DANGER: 0.8,   // 80% - Red danger
  CRITICAL: 0.9, // 90% - Show alert banner
};
