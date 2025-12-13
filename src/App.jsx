import React, { useState } from 'react';
import { ethers } from 'ethers';
import VaultInput from './components/VaultInput';
import RiskVisualizer from './components/RiskVisualizer';
import TokenList from './components/TokenList';
import { fetchSafeData, fetchTokensMetadataBatch, calculateVaultMetrics } from './utils/api';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vaultAddress, setVaultAddress] = useState('');

  const [simulatedPrices, setSimulatedPrices] = useState({});
  const [metadataMap, setMetadataMap] = useState(new Map());

  // Derived simulation data
  const simulationData = React.useMemo(() => {
    if (!data) return null;

    // Initialize prices if not set yet (first load)
    const currentPrices = { ...simulatedPrices };
    let initialPricesSet = false;

    // Check if we need to initialize prices from data
    if (Object.keys(currentPrices).length === 0 && data.tokenPrices && data.tokenPrices.length > 0) {
      data.tokenPrices.forEach(p => {
        const addr = p.token.toLowerCase();
        if (currentPrices[addr] === undefined) {
          currentPrices[addr] = Number(p.amount); // 6 decimals
          initialPricesSet = true;
        }
      });
    }

    // If we just initialized, we should probably update state, but for this render loop 
    // we can use the local `currentPrices` map.
    // However, calling setState inside memo is bad.
    // Better pattern: useEffect to sync data.tokenPrices to simulatedPrices on data load.

    // Let's assume simulatedPrices is populated via useEffect below.
    // If empty, fall back to data.tokenPrices map for calculation to avoid flash of zero
    const effectivePrices = new Map();
    // Default to data prices
    if (data.tokenPrices) {
      data.tokenPrices.forEach(p => {
        effectivePrices.set(p.token.toLowerCase(), Number(p.amount));
      });
    }
    // Override with simulation
    Object.keys(simulatedPrices).forEach(addr => {
      effectivePrices.set(addr, simulatedPrices[addr]);
    });

    // Recalculate metrics
    // We need metadata for this. If not ready, return original data or partial
    // data.collateralBalances is [{token, amount}]
    const collateralTokens = data.collateralBalances.map(t => ({ token: t.token, amount: t.amount }));
    if (collateralTokens.length > 0 && metadataMap.size > 0) {
      try {
        const { maxBorrow, totalCollateral } = calculateVaultMetrics(collateralTokens, effectivePrices, metadataMap);

        // Reconstruct data object with new metrics AND new prices array for TokenLists
        // We need to update the price array passed to TokenList so it shows the simulated price

        const newPrices = [];
        effectivePrices.forEach((val, key) => {
          newPrices.push({ token: key, amount: val });
        });

        return {
          ...data,
          maxBorrow,
          totalCollateral,
          tokenPrices: newPrices
        };

      } catch (e) {
        console.warn("Calculation error", e);
        return data;
      }
    }

    return data;
  }, [data, simulatedPrices, metadataMap]);


  const handleAddressSubmit = async (address) => {
    setLoading(true);
    setError(null);
    setData(null);
    setSimulatedPrices({}); // Reset simulation
    setVaultAddress(address);

    try {
      // 1. Fetch main data
      const result = await fetchSafeData(address);

      // 2. Fetch metadata (needed for calc)
      const provider = new ethers.JsonRpcProvider('https://rpc.scroll.io');
      const collateralTokens = result.collateralBalances.map(t => ({ token: t.token, amount: t.amount }));
      const meta = await fetchTokensMetadataBatch(collateralTokens, provider);
      setMetadataMap(meta); // Save metadata

      // 3. Init prices
      const initialPrices = {};
      result.tokenPrices.forEach(p => {
        initialPrices[p.token.toLowerCase()] = Number(p.amount);
      });
      setSimulatedPrices(initialPrices);

      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePriceChange = (tokenAddress, newPriceUSD) => {
    // newPriceUSD is float (e.g. 3000.50). We store as 6 decimals integer.
    const scaledPrice = Math.floor(newPriceUSD * 1e6);
    setSimulatedPrices(prev => ({
      ...prev,
      [tokenAddress.toLowerCase()]: scaledPrice
    }));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Ether.fi Vault Risk Analyzer</h1>
        <p className="subtitle">Visualize your LTV and Liquidation Threshold on Scroll</p>
      </header>

      <main className="app-content">
        <VaultInput onAddressSubmit={handleAddressSubmit} isLoading={loading} />

        {error && (
          <div className="error-banner">
            {error}
          </div>
        )}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Fetching on-chain data...</p>
          </div>
        )}

        {!loading && simulationData && (
          <div className="results-container">
            <div className="address-badge">
              Vault: {vaultAddress.substring(0, 6)}...{vaultAddress.substring(38)}
            </div>
            <RiskVisualizer data={simulationData} />
            <div className="assets-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%' }}>
              <TokenList
                tokens={simulationData.collateralBalances}
                prices={simulationData.tokenPrices}
                title="Collateral Assets"
                configType="collateral"
                onPriceChange={handlePriceChange}
              />
              <TokenList
                tokens={simulationData.borrows}
                prices={simulationData.tokenPrices}
                title="Borrowed Assets"
                configType="borrow"
              />
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Data provided by Ether.fi CashLens on Scroll Network</p>
      </footer>
    </div>
  );
}

export default App;
