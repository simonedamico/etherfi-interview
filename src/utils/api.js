import { ethers } from 'ethers';
import { CashLensABI, ERC20ABI, MulticallABI } from './abi.js';

const LENS_ADDRESS = '0x7DA874f3BacA1A8F0af27E5ceE1b8C66A772F84E';
const RPC_URL = 'https://rpc.scroll.io';
const MULTICALL_ADDRESS = '0xcA11bde05977b3631167028862bE2a173976CA11';

export const fetchSafeData = async (address) => {
    try {
        // 1. Setup Provider
        // Use a robust public RPC or fallback
        const provider = new ethers.JsonRpcProvider(RPC_URL);

        // 2. Setup Contract
        const contract = new ethers.Contract(LENS_ADDRESS, CashLensABI, provider);

        // 3. Call getSafeCashData
        // Second argument is debtServiceTokenPreference, empty array for view
        const data = await contract.getSafeCashData(address, []);

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
