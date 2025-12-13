import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { fetchTokensMetadataBatch, fetchTokenLTVsBatch } from '../utils/api';
import './TokenList.css';

const TokenList = ({ tokens, prices, title = "Collateral Assets" }) => {
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
                // Create price map (prices are 6 decimals USD)
                const priceMap = {};
                if (prices) {
                    prices.forEach(p => {
                        priceMap[p.token.toLowerCase()] = Number(p.amount) / 1e6;
                    });
                }

                // Fetch metadata and LTVs in parallel
                const [metadataMap, ltvMap] = await Promise.all([
                    fetchTokensMetadataBatch(tokens, provider),
                    fetchTokenLTVsBatch(tokens, provider)
                ]);

                const results = tokens.map((t) => {
                    const tokenAddress = t.token || t[0]; // Handle named or positional
                    const amount = t.amount || t[1];

                    const metadata = metadataMap.get(tokenAddress.toLowerCase()) || { symbol: 'UNKNOWN', decimals: 18 };
                    const config = ltvMap.get(tokenAddress.toLowerCase()) || { ltv: 0 };
                    const ltv = config.ltv;
                    const formattedAmount = ethers.formatUnits(amount, metadata.decimals);
                    const unitPrice = priceMap[tokenAddress.toLowerCase()] || 0;
                    const totalValue = Number(formattedAmount) * unitPrice;

                    return {
                        token: tokenAddress,
                        amount: amount,
                        symbol: metadata.symbol,
                        decimals: metadata.decimals,
                        ltv,
                        formattedAmount,
                        unitPrice,
                        totalValue
                    };
                });

                setEnrichedTokens(results);
            } catch (err) {
                console.error("Failed to load token metadata", err);
            } finally {
                setLoading(false);
            }
        };

        loadMetadata();
    }, [tokens, prices]);

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
                            <div className="token-details">
                                <span className="token-symbol">
                                    {token.symbol}
                                    {token.ltv > 0 && <span className="token-ltv"> @ {token.ltv}% LTV</span>}
                                </span>
                                <span className="token-unit-price">${token.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                        <div className="token-values">
                            <span className="token-amount">
                                {Number(token.formattedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {token.symbol}
                            </span>
                            <span className="token-total-value">
                                ${token.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TokenList;
