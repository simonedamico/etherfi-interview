import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ethers } from 'ethers';
import { fetchTokensMetadataBatch, fetchTokenLTVsBatch } from '../utils/api';
import { getProvider } from '../utils/provider';
import { PRICE_MULTIPLIER, DEFAULT_BORROW_APY } from '../utils/constants';
import './TokenList.css';

/**
 * PriceInput Component
 *
 * Inline editable price input for simulating price changes.
 * Uses a key prop to reset when initialValue changes from parent.
 */
const PriceInput = ({ initialValue, onSave }) => {
  // Format the initial value for display
  const formattedInitial = initialValue?.toFixed(2) || '0.00';
  const [value, setValue] = useState(formattedInitial);
  const [lastInitial, setLastInitial] = useState(initialValue);

  // Reset value when initialValue changes (controlled update from parent)
  if (initialValue !== lastInitial) {
    setLastInitial(initialValue);
    setValue(formattedInitial);
  }

  const handleCommit = () => {
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onSave(num);
    } else {
      setValue(formattedInitial);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.target.blur();
    }
  };

  return (
    <div className="price-edit-container">
      <span className="currency-symbol">$</span>
      <input
        type="text"
        className="price-input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleCommit}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
};

PriceInput.propTypes = {
  initialValue: PropTypes.number,
  onSave: PropTypes.func.isRequired,
};

PriceInput.defaultProps = {
  initialValue: 0,
};

/**
 * TokenList Component
 *
 * Displays a list of tokens (collateral or borrowed) with their
 * amounts, prices, and values. Collateral tokens show editable prices.
 */
const TokenList = ({
  tokens,
  prices,
  title = 'Collateral Assets',
  configType = 'collateral',
  onPriceChange,
}) => {
  const [enrichedTokens, setEnrichedTokens] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadMetadata = async () => {
      if (!tokens || tokens.length === 0) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const provider = getProvider();

      try {
        // Create price map (prices are 6 decimals USD)
        const priceMap = {};
        if (prices) {
          prices.forEach((p) => {
            priceMap[p.token.toLowerCase()] = Number(p.amount) / PRICE_MULTIPLIER;
          });
        }

        // Fetch metadata and LTVs (if collateral)
        const promises = [fetchTokensMetadataBatch(tokens, provider)];
        if (configType === 'collateral') {
          promises.push(fetchTokenLTVsBatch(tokens));
        }

        const [metadataMap, ltvMap] = await Promise.all(promises);

        const results = tokens.map((t) => {
          const tokenAddress = t.token || t[0];
          const amount = t.amount || t[1];

          const metadata = metadataMap.get(tokenAddress.toLowerCase()) || {
            symbol: 'UNKNOWN',
            decimals: 18,
          };

          let ltv = 0;
          if (configType === 'collateral' && ltvMap) {
            const config = ltvMap.get(tokenAddress.toLowerCase()) || { ltv: 0 };
            ltv = config.ltv;
          }

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
            totalValue,
          };
        });

        setEnrichedTokens(results);
      } catch (err) {
        console.error('Failed to load token metadata', err);
      } finally {
        setLoading(false);
      }
    };

    loadMetadata();
  }, [tokens, prices, configType]);

  if (!tokens || tokens.length === 0) return null;

  if (loading) {
    return (
      <div className="token-list-container">
        <h3 className="token-list-header">{title}</h3>
        <div className="loading-tokens">Loading token details...</div>
      </div>
    );
  }

  /**
   * Gets the token logo URL from TrustWallet assets.
   */
  const getTokenLogoUrl = (tokenAddress, symbol) => {
    try {
      const checksumAddress = ethers.getAddress(tokenAddress);
      return `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/scroll/assets/${checksumAddress}/logo.png`;
    } catch {
      return `https://ui-avatars.com/api/?name=${symbol}&background=random`;
    }
  };

  return (
    <div className="token-list-container">
      <h3 className="token-list-header">
        {title}
        {configType === 'collateral' && (
          <div className="tooltip-container">
            <span className="tooltip-icon">?</span>
            <div className="tooltip-content">
              You can edit the price of collateral tokens to simulate the impact of price changes
              on your max borrow and liquidation risk.
            </div>
          </div>
        )}
      </h3>
      <div className="token-list">
        {enrichedTokens.map((token, idx) => (
          <div className="token-row" key={`${token.token}-${idx}`}>
            <div className="token-info">
              <img
                src={getTokenLogoUrl(token.token, token.symbol)}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${token.symbol}&background=random`;
                }}
                alt={token.symbol}
                className="token-icon"
              />
              <div className="token-details">
                <span className="token-symbol">
                  {token.symbol}
                  {configType === 'collateral' && token.ltv > 0 && (
                    <span className="token-ltv"> @ {token.ltv}% LTV</span>
                  )}
                  {configType === 'borrow' && (
                    <span className="token-ltv"> @ {DEFAULT_BORROW_APY}% APY</span>
                  )}
                </span>
                {configType === 'collateral' && onPriceChange ? (
                  <PriceInput
                    initialValue={token.unitPrice}
                    onSave={(val) => onPriceChange(token.token, val)}
                  />
                ) : (
                  <span className="token-unit-price">
                    $
                    {token.unitPrice.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                )}
              </div>
            </div>
            <div className="token-values">
              <span className="token-amount">
                {Number(token.formattedAmount).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                {token.symbol}
              </span>
              <span className="token-total-value">
                $
                {token.totalValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

TokenList.propTypes = {
  tokens: PropTypes.arrayOf(
    PropTypes.shape({
      token: PropTypes.string,
      amount: PropTypes.oneOfType([PropTypes.number, PropTypes.bigint, PropTypes.string]),
    })
  ),
  prices: PropTypes.arrayOf(
    PropTypes.shape({
      token: PropTypes.string,
      amount: PropTypes.oneOfType([PropTypes.number, PropTypes.bigint]),
    })
  ),
  title: PropTypes.string,
  configType: PropTypes.oneOf(['collateral', 'borrow']),
  onPriceChange: PropTypes.func,
};

TokenList.defaultProps = {
  tokens: [],
  prices: [],
  title: 'Collateral Assets',
  configType: 'collateral',
  onPriceChange: null,
};

export default TokenList;
