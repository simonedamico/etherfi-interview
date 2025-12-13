import { ethers } from 'ethers';
import { CashLensABI, ERC20ABI, MulticallABI, DebtManagerABI } from './abi.js';

const LENS_ADDRESS = '0x7DA874f3BacA1A8F0af27E5ceE1b8C66A772F84E';
const RPC_URL = 'https://rpc.scroll.io';
const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';
const DEBT_MANAGER_ADDRESS = '0x8f9d2Cd33551CE06dD0564Ba147513F715c2F4a0';

export const LTV_CONFIG = {
    '0x5300000000000000000000000000000000000004': 55, // wETH
    '0xd83e3d560ba6f05094d9d8b3eb8aaea571d1864e': 45, // wHYPE
    '0x06efdbff2a14a7c8e15944d1f4a48f9f95f663a4': 90, // USDC
    '0xf55bec9cafdbe8730f096aa55dad6d22d44099df': 90, // USDT
    '0xd29687c813d741e2f938f4ac377128810e217b1b': 20, // SCR
    '0x056a5fa5da84ceb7f93d36e545c5905607d8bd81': 20, // ETHFI
    '0x657e8c867d8b37dcc18fa4caead9c45eb088c642': 52, // eBTC
    '0x939778d83b46b456224a33fb59630b11dec56663': 80, // eUSD
    '0x01f0a31698c4d065659b9bdc21b3610292a1c506': 55, // weETH
    '0xa519afbc91986c0e7501d7e34968fee51cd901ac': 40, // beHYPE
    '0xf0bb20865277abd641a307ece5ee04e79073416c': 50, // LiquidETH
    '0x5f46d540b6ed704c3c8789105f30e075aa900726': 50, // LiquidBTC
    '0x08c6f91e2b681faf5e17227f2a44c307b3c1364c': 80, // LiquidUSD
};

export const calculateVaultMetrics = (collateralTokens, priceMap, metadataMap) => {
    let calculatedMaxBorrowUSD = 0;
    let calculatedTotalCollateralUSD = 0;

    collateralTokens.forEach(t => {
        const tokenAddr = (t.token || t[0]).toLowerCase();
        const amount = t.amount || t[1]; // BigInt or uint256
        const decimals = metadataMap.get(tokenAddr)?.decimals || 18;
        const price = priceMap.get(tokenAddr) || 0;
        const ltv = LTV_CONFIG[tokenAddr] || 0; // Use hardcoded LTV

        // Formula: (amount / 10^dec) * (price / 10^6) * (ltv / 100)
        // We can do this in float for display precision
        const amountFloat = Number(ethers.formatUnits(amount, decimals));
        const priceFloat = price / 1e6;
        const valueUSD = amountFloat * priceFloat;
        const borrowPower = valueUSD * (ltv / 100);

        calculatedMaxBorrowUSD += borrowPower;
        calculatedTotalCollateralUSD += valueUSD;
    });

    return {
        maxBorrow: BigInt(Math.floor(calculatedMaxBorrowUSD * 1e6)),
        totalCollateral: BigInt(Math.floor(calculatedTotalCollateralUSD * 1e6))
    };
};

export const fetchSafeData = async (address) => {
    try {
        // 1. Setup Provider
        // Use a robust public RPC or fallback
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // 2. Setup Contract
        const contract = new ethers.Contract(LENS_ADDRESS, CashLensABI, provider);

        // 3. Call getSafeCashData
        // Second argument is debtServiceTokenPreference, empty array for view
        const rawData = await contract.getSafeCashData(address, []);

        // Convert to plain object to avoid Ethers Result spread issues
        // We need to know the structure of SafeCashData from ABI or just map what we use.
        // Based on usage: collateralBalances, borrows, tokenPrices, maxBorrow, totalCollateralValue (maybe?), totalBorrowedValue?
        // Let's assume the keys are available on the Result object.
        const data = {
            collateralBalances: rawData.collateralBalances.map(t => ({ token: t.token, amount: t.amount })),
            borrows: rawData.borrows.map(t => ({ token: t.token, amount: t.amount })),
            tokenPrices: rawData.tokenPrices.map(t => ({ token: t.token, amount: t.amount })),
            maxBorrow: rawData.maxBorrow,
            // We might need these if RiskVisualizer uses them:
            // Check RiskVisualizer props usage. It likely uses totalBorrow/totalCollateral.
            // If rawData doesn't have them explicitly named, we might need index access.
            // Ethers Result usually allows access by name if ABI has names.
            // Let's copy all enumerable properties just in case, or rely on specific ones.
        };

        // Attempt to copy other named properties if they exist
        ['totalCollateral', 'totalBorrow', 'healthFactor'].forEach(key => {
            if (rawData[key] !== undefined) data[key] = rawData[key];
        });

        // --- Recalculate Max Borrow based on Hardcoded LTVs ---
        try {
            // Extract tokens needed for calculation
            const collateralTokens = data.collateralBalances;

            if (collateralTokens.length > 0) {
                // Fetch decimals
                const metadataMap = await fetchTokensMetadataBatch(collateralTokens, provider);

                // Build price map
                const priceMap = new Map();
                data.tokenPrices.forEach(p => {
                    priceMap.set(p.token.toLowerCase(), Number(p.amount));
                });

                const metrics = calculateVaultMetrics(collateralTokens, priceMap, metadataMap);

                // Override data.maxBorrow 
                data.maxBorrow = metrics.maxBorrow;

                // Also update totalCollateral if we want consistency
                if (data.totalCollateral !== undefined || metrics.totalCollateral > 0) {
                    data.totalCollateral = metrics.totalCollateral;
                }
            }
        } catch (calcError) {
            console.warn("Error recalculating max borrow:", calcError);
            // Fallback to original data.maxBorrow if calc fails
        }

        return data;
    } catch (error) {
        console.error("Fetch Error:", error);
        // Parse error for user friendly message
        if (error.code === 'CALL_EXCEPTION') {
            if (error.data === '0x34d0b499') {
                throw new Error("This address is not a valid Ether.fi Safe.");
            }
            throw new Error("Could not fetch vault data. Ensure address is a valid Safe on Scroll.");
        }
        throw new Error(error.message || "Unknown error fetching data.");
    }
};

export const fetchTokenMetadata = async (tokenAddress, provider) => {
    try {
        const contract = new ethers.Contract(tokenAddress, ERC20ABI, provider);
        const [symbol, decimals] = await Promise.all([
            contract.symbol().catch(() => 'UNKNOWN'),
            contract.decimals().catch(() => 18)
        ]);
        return { symbol, decimals: Number(decimals) };
    } catch (error) {
        console.warn(`Failed to fetch metadata for ${tokenAddress}`, error);
        return { symbol: 'UNKNOWN', decimals: 18 };
    }
};

/**
 * Fetches metadata (symbol and decimals) for multiple tokens in a single RPC call.
 * @param {Array<{token: string}>} tokens - Array of token objects with a `token` address field.
 * @param {ethers.JsonRpcProvider} provider - An ethers provider.
 * @returns {Promise<Map<string, {symbol: string, decimals: number}>>} - A map of token address to metadata.
 */
export const fetchTokensMetadataBatch = async (tokens, provider) => {
    if (!tokens || tokens.length === 0) {
        return new Map();
    }

    const multicallContract = new ethers.Contract(MULTICALL_ADDRESS, MulticallABI, provider);
    const erc20Interface = new ethers.Interface(ERC20ABI);

    // Prepare calls for symbol() and decimals() for each token
    const calls = [];
    const tokenAddresses = tokens.map(t => t.token || t[0]);

    for (const tokenAddress of tokenAddresses) {
        calls.push({
            target: tokenAddress,
            callData: erc20Interface.encodeFunctionData('symbol')
        });
        calls.push({
            target: tokenAddress,
            callData: erc20Interface.encodeFunctionData('decimals')
        });
    }

    try {
        // requireSuccess = false, so we get results even if some calls fail
        const results = await multicallContract.tryAggregate.staticCall(false, calls);

        const metadataMap = new Map();

        for (let i = 0; i < tokenAddresses.length; i++) {
            const symbolResult = results[i * 2];
            const decimalsResult = results[i * 2 + 1];

            let symbol = 'UNKNOWN';
            let decimals = 18;

            if (symbolResult.success) {
                try {
                    symbol = erc20Interface.decodeFunctionResult('symbol', symbolResult.returnData)[0];
                } catch (e) {
                    // Some tokens may not return a standard string for symbol
                    console.warn(`Could not decode symbol for ${tokenAddresses[i]}`);
                }
            }

            if (decimalsResult.success) {
                try {
                    decimals = Number(erc20Interface.decodeFunctionResult('decimals', decimalsResult.returnData)[0]);
                } catch (e) {
                    console.warn(`Could not decode decimals for ${tokenAddresses[i]}`);
                }
            }

            metadataMap.set(tokenAddresses[i].toLowerCase(), { symbol, decimals });
        }

        return metadataMap;
    } catch (error) {
        console.error("Multicall failed:", error);
        // Fallback: return empty map, caller should handle gracefully
        return new Map();
    }
};

/**
 * Fetches LTV percentages for multiple tokens.
 * Uses hardcoded values from Ether.fi documentation as primary source.
 * @param {Array<{token: string}>} tokens
 * @param {ethers.JsonRpcProvider} provider
 * @returns {Promise<Map<string, {ltv: number, liquidationThreshold: number, liquidationBonus: number}>>}
 */
export const fetchTokenLTVsBatch = async (tokens, provider) => {
    if (!tokens || tokens.length === 0) return new Map();

    const configMap = new Map();

    tokens.forEach(t => {
        const tokenAddress = (t.token || t[0]).toLowerCase();

        // Use hardcoded LTV if available
        if (LTV_CONFIG[tokenAddress] !== undefined) {
            configMap.set(tokenAddress, {
                ltv: LTV_CONFIG[tokenAddress],
                liquidationThreshold: 0, // Not strictly needed for this display task
                liquidationBonus: 0
            });
        } else {
            configMap.set(tokenAddress, { ltv: 0, liquidationThreshold: 0, liquidationBonus: 0 });
        }
    });

    return configMap;
};
