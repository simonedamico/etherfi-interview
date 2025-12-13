# Ether.fi Cash Risk Visualizer

A React application designed to help users visualize and simulate risk metrics for Ether.fi Cash vaults on the Scroll network.

**Live Application:** [https://simonedamico.github.io/etherfi-interview](https://simonedamico.github.io/etherfi-interview)

## Features

- **Vault Analysis**: Fetch and display live on-chain data for any Cash Vault address.
- **Risk Visualization**: View your current Debt, Max Borrowable amount, and Liquidation Health Factor in an interactive gauge.
- **Price Simulation**: Edit the price of underlying collateral assets to simulate different market conditions (e.g., "What if ETH drops 50%?") and instantly see how it affects your liquidation risk.

## Developer Quickstart

### Prerequisites

- Node.js (v18 or higher recommended)
- npm (Node Package Manager)

### Installation

1. Clone the repository and navigate to the project directory:
   ```bash
   cd etherfi-interview
   ```

2. Install the necessary dependencies:
   ```bash
   npm install
   ```

### Running Locally

To start the local development server:

```bash
npm run dev
```

Open your browser and navigate to `http://localhost:5173` to verify the application is running.

### Building for Production

To create an optimized build for deployment:

```bash
npm run build
```

The production-ready assets will be output to the `dist` folder.
