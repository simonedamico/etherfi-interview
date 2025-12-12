import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { fetchTokenMetadata } from '../utils/api';
import './TokenList.css';

const TokenList = ({ tokens, title = "Collateral Assets" }) => {
    const [enrichedTokens, setEnrichedTokens] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMetadata = async () => {
            if (!tokens || tokens.length === 0) {
                setLoading(false);
                return;
            }

            setLoading(true);
            const provider = new ethers.JsonRpcProvider('https://rpc.scroll.io');

            try {
                const results = await Promise.all(
                    tokens.map(async (t) => {
                        const tokenAddress = t.token || t[0]; // Handle named or positional
                        const amount = t.amount || t[1];

                        const { symbol, decimals } = await fetchTokenMetadata(tokenAddress, provider);
                        return {
                            token: tokenAddress,
                            amount: amount,
                            symbol,
                            decimals,
                            formattedAmount: ethers.formatUnits(amount, decimals)
                        };
                    })
                );
                // Filter out tokens with 0 balance if desired, or keep all.
                // Usually collateral tokens show up if they are enabled, but we might only want to show positive balances?
                // The task says "list all the collateral tokens", presumably the ones in `collateralBalances` struct in the response.
                setEnrichedTokens(results);
            } catch (err) {
                console.error("Failed to load token metadata", err);
            } finally {
                setLoading(false);
            }
        };

        loadMetadata();
    }, [tokens]);

    if (!tokens || tokens.length === 0) return null;

    if (loading) {
        return (
            <div className="token-list-container">
                <h3 className="token-list-header">{title}</h3>
                <div className="loading-tokens">Loading token details...</div>
            </div>
        );
    }

    return (
        <div className="token-list-container">
            <h3 className="token-list-header">{title}</h3>
            <div className="token-list">
                {enrichedTokens.map((token, idx) => (
                    <div className="token-row" key={`${token.token}-${idx}`}>
                        <div className="token-info">
                            <img
                                src={(() => {
                                    try {
                                        return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/assets/${ethers.getAddress(token.token)}/logo.png`;
                                    } catch (e) {
                                        return `https://ui-avatars.com/api/?name=${token.symbol}&background=random`;
                                    }
                                })()}
                                onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random`
                                }}
                                alt={token.symbol}
                                className="token-icon"
                            />
                            <span className="token-symbol">{token.symbol}</span>
                        </div>
                        <span className="token-amount">
                            {Number(token.formattedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TokenList;
