# notamperdata Smart Contract Deployment

This directory contains the deployment script for the notamperdata smart contract.

## Prerequisites

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   - `BLOCKFROST_PROJECT_ID`: Your Blockfrost project ID from https://blockfrost.io/
   - `MNEMONIC`: Your wallet mnemonic phrase (ensure it has sufficient ADA)
   - `CARDANO_NETWORK`: Target network (Preview, Preprod, Mainnet)

3. **Build the smart contract:**
   ```bash
   cd ..
   aiken build
   cd scripts
   ```

## Deployment

Deploy to Preview network (default):
```bash
npm run deploy
```

Deploy to specific networks:
```bash
npm run deploy:preview
npm run deploy:preprod
npm run deploy:mainnet
```

## Output

After successful deployment, the contract details will be saved to `deployment-output.json`:

```json
{
  "contractAddress": "addr_test1...",
  "validatorHash": "a2492486...",
  "deploymentTxHash": "abc123...",
  "network": "Preview",
  "timestamp": "2025-01-XX..."
}
```

## Required ADA

Ensure your wallet has at least **6 ADA** for deployment:
- 5 ADA for contract initialization
- ~1 ADA for transaction fees

## Troubleshooting

- **"plutus.json not found"**: Run `aiken build` in the parent directory
- **"Insufficient funds"**: Add more ADA to your wallet
- **"Invalid project ID"**: Verify your Blockfrost project ID