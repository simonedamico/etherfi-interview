export const CashLensABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "safe", "type": "address" },
            { "internalType": "address[]", "name": "debtServiceTokenPreference", "type": "address[]" }
        ],
        "name": "getSafeCashData",
        "outputs": [
            {
                "components": [
                    { "internalType": "enum Mode", "name": "mode", "type": "uint8" },
                    {
                        "components": [
                            { "internalType": "address", "name": "token", "type": "address" },
                            { "internalType": "uint256", "name": "amount", "type": "uint256" }
                        ],
                        "internalType": "struct IDebtManager.TokenData[]",
                        "name": "collateralBalances",
                        "type": "tuple[]"
                    },
                    {
                        "components": [
                            { "internalType": "address", "name": "token", "type": "address" },
                            { "internalType": "uint256", "name": "amount", "type": "uint256" }
                        ],
                        "internalType": "struct IDebtManager.TokenData[]",
                        "name": "borrows",
                        "type": "tuple[]"
                    },
                    {
                        "components": [
                            { "internalType": "address", "name": "token", "type": "address" },
                            { "internalType": "uint256", "name": "amount", "type": "uint256" }
                        ],
                        "internalType": "struct IDebtManager.TokenData[]",
                        "name": "tokenPrices",
                        "type": "tuple[]"
                    },
                    {
                        "components": [
                            { "internalType": "address[]", "name": "tokens", "type": "address[]" },
                            { "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" },
                            { "internalType": "address", "name": "recipient", "type": "address" },
                            { "internalType": "uint96", "name": "finalizeTime", "type": "uint96" }
                        ],
                        "internalType": "struct WithdrawalRequest",
                        "name": "withdrawalRequest",
                        "type": "tuple"
                    },
                    { "internalType": "uint256", "name": "totalCollateral", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalBorrow", "type": "uint256" },
                    { "internalType": "uint256", "name": "maxBorrow", "type": "uint256" },
                    { "internalType": "uint256", "name": "creditMaxSpend", "type": "uint256" },
                    { "internalType": "uint256", "name": "spendingLimitAllowance", "type": "uint256" },
                    { "internalType": "uint256", "name": "totalCashbackEarnedInUsd", "type": "uint256" },
                    { "internalType": "uint256", "name": "incomingModeStartTime", "type": "uint256" },
                    {
                        "components": [
                            { "internalType": "address[]", "name": "spendableTokens", "type": "address[]" },
                            { "internalType": "uint256[]", "name": "spendableAmounts", "type": "uint256[]" },
                            { "internalType": "uint256[]", "name": "amountsInUsd", "type": "uint256[]" },
                            { "internalType": "uint256", "name": "totalSpendableInUsd", "type": "uint256" }
                        ],
                        "internalType": "struct DebitModeMaxSpend",
                        "name": "debitMaxSpend",
                        "type": "tuple"
                    }
                ],
                "internalType": "struct SafeCashData",
                "name": "safeCashData",
                "type": "tuple"
            }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];

export const ERC20ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{ "name": "", "type": "string" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{ "name": "", "type": "uint8" }],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }
];

export const MulticallABI = [
    {
        "inputs": [
            { "internalType": "bool", "name": "requireSuccess", "type": "bool" },
            {
                "components": [
                    { "internalType": "address", "name": "target", "type": "address" },
                    { "internalType": "bytes", "name": "callData", "type": "bytes" }
                ],
                "internalType": "struct Multicall3.Call[]",
                "name": "calls",
                "type": "tuple[]"
            }
        ],
        "name": "tryAggregate",
        "outputs": [
            {
                "components": [
                    { "internalType": "bool", "name": "success", "type": "bool" },
                    { "internalType": "bytes", "name": "returnData", "type": "bytes" }
                ],
                "internalType": "struct Multicall3.Result[]",
                "name": "returnData",
                "type": "tuple[]"
            }
        ],
        "stateMutability": "payable",
        "type": "function"
    }
];

export const DebtManagerABI = [
    {
        "inputs": [
            { "internalType": "address", "name": "token", "type": "address" }
        ],
        "name": "collateralTokenConfig",
        "outputs": [
            { "internalType": "uint256", "name": "ltv", "type": "uint256" },
            { "internalType": "uint256", "name": "liquidationThreshold", "type": "uint256" },
            { "internalType": "uint256", "name": "liquidationBonus", "type": "uint256" }
        ],
        "stateMutability": "view",
        "type": "function"
    }
];
