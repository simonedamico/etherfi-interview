import { ethers } from 'ethers';
import { CashLensABI, ERC20ABI } from './abi.js';

const LENS_ADDRESS = '0x7DA874f3BacA1A8F0af27E5ceE1b8C66A772F84E';
const RPC_URL = 'https://rpc.scroll.io';

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
