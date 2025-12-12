import { ethers } from 'ethers';
import { CashLensABI } from '../src/utils/abi.js';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://rpc.scroll.io');
    const lensAddress = '0x7DA874f3BacA1A8F0af27E5ceE1b8C66A772F84E';
    const contract = new ethers.Contract(lensAddress, CashLensABI, provider);

    // Using the user's address first
    const address = '0x3f07a5603665033B04AD0eD4ebc0419F982d9F94';

    try {
        console.log("Fetching data for", address);
        const data = await contract.getSafeCashData(address, []);

        console.log("--- Token Prices ---");
        if (data.tokenPrices && data.tokenPrices.length > 0) {
            data.tokenPrices.forEach((tp) => {
                console.log(`Token: ${tp.token}, Price Amount: ${tp.amount.toString()}`);
            });
        } else {
            console.log("No token prices returned for this Safe.");
        }

        console.log("--- Collateral ---");
        // Check if maybe we can find a populated safe if this is empty
    } catch (e) {
        console.error(e);
    }
}

main();
