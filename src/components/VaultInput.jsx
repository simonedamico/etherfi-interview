import React, { useState } from 'react';
import './VaultInput.css';

const VaultInput = ({ onAddressSubmit, isLoading }) => {
    const [address, setAddress] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!address) {
            setError('Please enter an address');
            return;
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
            setError('Invalid Ethereum address format');
            return;
        }
        setError('');
        onAddressSubmit(address);
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
                <button
                    type="button"
                    className="demo-btn"
                    onClick={() => {
                        setAddress('0x3f07a5603665033B04AD0eD4ebc0419F982d9F94');
                        setError('');
                    }}
                >
                    Do you want to try a demo vault? Click here
                </button>
                <button type="submit" className="submit-btn" disabled={isLoading}>
                    {isLoading ? 'Loading...' : 'Analyze Vault'}
                </button>
            </form>
        </div>
    );
};

export default VaultInput;
