import { useState } from 'react';
import PropTypes from 'prop-types';
import { DEMO_VAULT_ADDRESS } from '../config';
import { ETH_ADDRESS_REGEX } from '../utils/constants';
import './VaultInput.css';

/**
 * VaultInput Component
 *
 * Input form for entering an Ether.fi Safe vault address.
 * Includes validation and a demo button for quick testing.
 */
const VaultInput = ({ onAddressSubmit, isLoading }) => {
  const [address, setAddress] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!address) {
      setError('Please enter an address');
      return;
    }

    if (!ETH_ADDRESS_REGEX.test(address)) {
      setError('Invalid Ethereum address format');
      return;
    }

    setError('');
    onAddressSubmit(address);
  };

  const handleDemoClick = () => {
    setAddress(DEMO_VAULT_ADDRESS);
    setError('');
  };

  return (
    <div className="vault-input-container">
      <h2 className="title">Check your LTV & Risk</h2>
      <form onSubmit={handleSubmit} className="input-form">
        <div className="input-wrapper">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter Vault Address (0x...)"
            className={`address-input ${error ? 'error' : ''}`}
            disabled={isLoading}
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="button" className="demo-btn" onClick={handleDemoClick}>
          Do you want to try a demo vault? Click here
        </button>
        <button type="submit" className="submit-btn" disabled={isLoading}>
          {isLoading ? 'Loading...' : 'Analyze Vault'}
        </button>
      </form>
    </div>
  );
};

VaultInput.propTypes = {
  onAddressSubmit: PropTypes.func.isRequired,
  isLoading: PropTypes.bool,
};

VaultInput.defaultProps = {
  isLoading: false,
};

export default VaultInput;
