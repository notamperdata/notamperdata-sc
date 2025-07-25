// scripts/src/deploy-notamperdata.ts
import * as fs from 'fs';
import * as path from 'path';
import { 
  Lucid, 
  Blockfrost, 
  SpendingValidator, 
  TxHash,
  LucidEvolution
} from '@lucid-evolution/lucid';
import { validatorToAddress } from '@lucid-evolution/utils';
import { Network } from '@lucid-evolution/core-types';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Configuration interface
interface Config {
  blockfrostProjectId: string;
  network: 'Preview' | 'Preprod' | 'Mainnet';
  mnemonic: string;
  blockfrostUrl: string;
}

// Deployment output interface
interface DeploymentOutput {
  contractAddress: string;
  validatorHash: string;
  deploymentTxHash: string;
  network: string;
  timestamp: string;
}

function loadConfig(): Config {
  const network = (process.env.CARDANO_NETWORK as 'Preview' | 'Preprod' | 'Mainnet') || 'Preview';
  
  const networkUrls = {
    Preview: 'https://cardano-preview.blockfrost.io/api/v0',
    Preprod: 'https://cardano-preprod.blockfrost.io/api/v0',
    Mainnet: 'https://cardano-mainnet.blockfrost.io/api/v0'
  };

  // Validate required environment variables
  if (!process.env.BLOCKFROST_PROJECT_ID) {
    throw new Error('BLOCKFROST_PROJECT_ID environment variable is required');
  }
  if (!process.env.MNEMONIC) {
    throw new Error('MNEMONIC environment variable is required');
  }

  return {
    blockfrostProjectId: process.env.BLOCKFROST_PROJECT_ID,
    network,
    mnemonic: process.env.MNEMONIC,
    blockfrostUrl: networkUrls[network]
  };
}

// Load compiled validators from plutus.json
function loadValidators() {
  const plutusJsonPath = path.join(process.cwd(), '..', 'plutus.json');
  
  if (!fs.existsSync(plutusJsonPath)) {
    throw new Error(`plutus.json not found. Please run 'aiken build' first.`);
  }
  
  const plutusJson = JSON.parse(fs.readFileSync(plutusJsonPath, 'utf8'));
  
  const spendValidator = plutusJson.validators.find(
    (v: any) => v.title === 'notamperdata_registry.notamperdata_registry.spend'
  );
  
  if (!spendValidator) {
    throw new Error('notamperdata registry spend validator not found in plutus.json');
  }
  
  return {
    compiledCode: spendValidator.compiledCode,
    hash: spendValidator.hash
  };
}

// Map config network to lucid network
function configNetworkToLucidNetwork(configNetwork: 'Preview' | 'Preprod' | 'Mainnet'): Network {
  switch (configNetwork) {
    case 'Preview':
      return 'Preview';
    case 'Preprod':
      return 'Preprod';
    case 'Mainnet':
      return 'Mainnet';
    default:
      throw new Error(`Unsupported network: ${configNetwork}`);
  }
}

// Initialize Lucid with Blockfrost provider
async function initLucid(config: Config): Promise<LucidEvolution> {
  const network = configNetworkToLucidNetwork(config.network);
  
  const lucid = await Lucid(
    new Blockfrost(
      config.blockfrostUrl,
      config.blockfrostProjectId
    ),
    network
  );
  
  // Use the correct method to select wallet from mnemonic
  lucid.selectWallet.fromSeed(config.mnemonic);
  
  return lucid;
}

// Create a validator from compiled code
function createValidator(compiledCode: string): SpendingValidator {
  return {
    type: 'PlutusV2',
    script: compiledCode
  };
}

// Wait for transaction confirmation
async function waitForTx(lucid: LucidEvolution, txHash: TxHash): Promise<void> {
  await lucid.awaitTx(txHash);
  console.log(`✅ Transaction confirmed: ${txHash}`);
}

// Save deployment output to file
function saveDeploymentOutput(output: DeploymentOutput): void {
  const outputPath = path.join(process.cwd(), 'deployment-output.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Deployment output saved to: deployment-output.json`);
}

// Main deployment function
async function deploynotamperdataRegistry(): Promise<DeploymentOutput> {
  try {
    console.log('🚀 Starting notamperdata Registry deployment...');
    
    // Load configuration and validators
    const config = loadConfig();
    const validators = loadValidators();
    
    console.log(`📡 Network: ${config.network}`);
    
    // Initialize Lucid
    const lucid = await initLucid(config);
    const notamperdataValidator = createValidator(validators.compiledCode);
    
    // Get network from config - this is the fix for the original error
    const network = configNetworkToLucidNetwork(config.network);
    
    // Use the validatorToAddress function with the correct parameters
    const contractAddress = validatorToAddress(
      network,
      notamperdataValidator as SpendingValidator
    );
    
    console.log(`📋 Contract Address: ${contractAddress}`);
    
    // Create deployment transaction
    const tx = lucid
      .newTx()
      .pay.ToAddress(
        contractAddress,
        { lovelace: BigInt(5000000) }  // Use BigInt() function instead of n suffix
      );
    
    // Complete and sign the transaction
    const signedTx = await tx.complete().then(txComplete => 
      txComplete.sign.withWallet().complete()
    );
    
    // Submit the transaction
    const deploymentTxHash = await signedTx.submit();
    
    console.log(`📤 Transaction submitted: ${deploymentTxHash}`);
    
    // Wait for confirmation
    await waitForTx(lucid, deploymentTxHash);
    
    // Create deployment output
    const deploymentOutput: DeploymentOutput = {
      contractAddress,
      validatorHash: validators.hash,
      deploymentTxHash,
      network: config.network,
      timestamp: new Date().toISOString()
    };
    
    // Save deployment output
    saveDeploymentOutput(deploymentOutput);
    
    console.log('🎉 Deployment completed successfully!');
    
    return deploymentOutput;
    
  } catch (error) {
    console.error('❌ Deployment failed:', error);
    throw error;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
notamperdata Smart Contract Deployment Script

Usage:
  npm run deploy

Environment Variables Required:
  BLOCKFROST_PROJECT_ID       Your Blockfrost project ID
  MNEMONIC                   Wallet mnemonic phrase  
  CARDANO_NETWORK            Network (Preview, Preprod, Mainnet) - defaults to Preview

Example:
  BLOCKFROST_PROJECT_ID=your_id MNEMONIC="your mnemonic" npm run deploy
    `);
    return;
  }
  
  try {
    await deploynotamperdataRegistry();
  } catch (error) {
    console.error('💥 Deployment failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { deploynotamperdataRegistry, DeploymentOutput };