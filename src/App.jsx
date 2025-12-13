import { useState, useMemo } from 'react';
import VaultInput from './components/VaultInput';
import RiskVisualizer from './components/RiskVisualizer';
import TokenList from './components/TokenList';
import { fetchSafeData, fetchTokensMetadataBatch } from './utils/api';
import { getProvider } from './utils/provider';
import {
  calculateVaultMetrics,
  toUSDScaled,
  mergeSimulatedPrices,
} from './utils/calculations';
import './App.css';

/**
 * App Component
 *
 * Main application container that orchestrates vault data fetching,
 * price simulation, and renders the visualization components.
 */
function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vaultAddress, setVaultAddress] = useState('');

  // Simulation state
  const [simulatedPrices, setSimulatedPrices] = useState({});
  const [metadataMap, setMetadataMap] = useState(new Map());

  /**
   * Derives simulation data by recalculating metrics with current prices.
   * This memoized value updates when data, prices, or metadata changes.
   */
  const simulationData = useMemo(() => {
    if (!data) return null;

    // Merge original prices with any simulated overrides
    const effectivePrices = mergeSimulatedPrices(data.tokenPrices, simulatedPrices);

    // Recalculate metrics if we have the required data
    const collateralTokens = data.collateralBalances.map((t) => ({
      token: t.token,
      amount: t.amount,
    }));

    if (collateralTokens.length > 0 && metadataMap.size > 0) {
      try {
        const { maxBorrow, totalCollateral } = calculateVaultMetrics(
          collateralTokens,
          effectivePrices,
          metadataMap
        );

        // Convert price map back to array format for TokenList
        const newPrices = [];
        effectivePrices.forEach((val, key) => {
          newPrices.push({ token: key, amount: val });
        });

        return {
          ...data,
          maxBorrow,
          totalCollateral,
          tokenPrices: newPrices,
        };
      } catch (e) {
        console.warn('Calculation error', e);
        return data;
      }
    }

    return data;
  }, [data, simulatedPrices, metadataMap]);

  /**
   * Handles vault address submission.
   * Fetches on-chain data and initializes simulation state.
   */
  const handleAddressSubmit = async (address) => {
    setLoading(true);
    setError(null);
    setData(null);
    setSimulatedPrices({});
    setVaultAddress(address);

    try {
      // Fetch main vault data
      const result = await fetchSafeData(address);

      // Fetch metadata for calculation
      const provider = getProvider();
      const collateralTokens = result.collateralBalances.map((t) => ({
        token: t.token,
        amount: t.amount,
      }));
      const meta = await fetchTokensMetadataBatch(collateralTokens, provider);
      setMetadataMap(meta);

      // Initialize simulated prices from fetched data
      const initialPrices = {};
      result.tokenPrices.forEach((p) => {
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

  /**
   * Handles price changes from the TokenList component.
   * Updates the simulated price for the given token.
   */
  const handlePriceChange = (tokenAddress, newPriceUSD) => {
    const scaledPrice = toUSDScaled(newPriceUSD);
    setSimulatedPrices((prev) => ({
      ...prev,
      [tokenAddress.toLowerCase()]: scaledPrice,
    }));
  };

  /**
   * Formats a vault address for display (0x1234...5678).
   */
  const formatAddress = (address) => {
    if (!address) return '';
    return `${address.substring(0, 6)}...${address.substring(38)}`;
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Ether.fi Vault Risk Analyzer</h1>
        <p className="subtitle">Visualize your LTV and Liquidation Threshold on Scroll</p>
      </header>

      <main className="app-content">
        <VaultInput onAddressSubmit={handleAddressSubmit} isLoading={loading} />

        {error && <div className="error-banner">{error}</div>}

        {loading && (
          <div className="loading-indicator">
            <div className="spinner"></div>
            <p>Fetching on-chain data...</p>
          </div>
        )}

        {!loading && simulationData && (
          <div className="results-container">
            <div className="address-badge">Vault: {formatAddress(vaultAddress)}</div>
            <RiskVisualizer data={simulationData} />
            <div
              className="assets-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                gap: '2rem',
                width: '100%',
              }}
            >
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
