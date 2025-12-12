import { ethers } from 'ethers';
import { CashLensABI } from '../src/utils/abi.js';

async function main() {
    const provider = new ethers.JsonRpcProvider('https://rpc.scroll.io');
    const lensAddress = '0x7DA874f3BacA1A8F0af27E5ceE1b8C66A772F84E';
    const contract = new ethers.Contract(lensAddress, CashLensABI, provider);

    // Example address - likely to fail if not a real Safe, but tests connection
    const checkAddress = process.argv[2] || '0x0000000000000000000000000000000000000000';
    console.log(`Checking address: ${checkAddress}...`);

    try {
        const data = await contract.getSafeCashData(checkAddress, []);
        console.log('Data fetched successfully:');
        console.log(JSON.stringify(data, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
    } catch (error) {
        console.error('Error fetching data:');
        if (error.reason) console.error('Reason:', error.reason);
        console.error(error);
    }
}

main();
