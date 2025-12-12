import React, { useState } from 'react';
import VaultInput from './components/VaultInput';
import RiskVisualizer from './components/RiskVisualizer';
import { fetchSafeData } from './utils/api';
import './App.css';

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [vaultAddress, setVaultAddress] = useState('');

  const handleAddressSubmit = async (address) => {
    setLoading(true);
    setError(null);
    setData(null);
    setVaultAddress(address);

    try {
      const result = await fetchSafeData(address);
      setData(result);
    } catch (err) {
      setError(err.message);
      // Optional: fallback to mock for demo if requested? 
      // For now, strict error handling is better for trust.
    } finally {
      setLoading(false);
    }
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

        {!loading && data && (
          <div className="results-container">
            <div className="address-badge">
              Vault: {vaultAddress.substring(0, 6)}...{vaultAddress.substring(38)}
            </div>
            <RiskVisualizer data={data} />
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
