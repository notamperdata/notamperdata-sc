# NoTamperData Smart Contract Documentation

## Overview

The NoTamperData smart contract (`NoTamperData_registry`) provides blockchain-based verification for Google Forms responses through immutable hash storage on the Cardano blockchain. The contract leverages Cardano's metadata capabilities and UTxO model to create verifiable proof of form response integrity while maintaining cost efficiency and extensibility for enterprise features.

## Contract Architecture

### Validator Implementation

The `NoTamperData_registry` validator is implemented in Aiken and provides the foundation for blockchain-based form response verification:

```aiken
validator NoTamperData_registry {
  spend(
    _datum: Option<Data>,
    _redeemer: Data,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    // UTxO structure for hash storage with off-chain validation
    True
  }

  else(_) {
    // Reject any other validator usage
    False
  }
}
```

### Design Principles

**UTxO-Based Storage**: Each hash storage operation creates a dedicated UTxO containing approximately 2 ADA, providing decentralized storage while maintaining transaction integrity and enabling concurrent operations.

**Metadata Integration**: Hash data is stored using Cardano's native metadata feature (label 8434), providing immutable on-chain storage with efficient query capabilities through Blockfrost API.

**Extensibility Framework**: The contract architecture supports future enhancements including advanced validation logic, authorization mechanisms, and enterprise features without breaking existing functionality.

**Cost Optimization**: Transaction structure optimized for minimal fees while maintaining security and verification capabilities.

## Transaction Structure

### Hash Storage Transaction

**Input Requirements:**
- Platform wallet UTxO with sufficient ADA for transaction fees and contract output
- Valid transaction signature from authorized wallet

**Output Distribution:**
- New contract UTxO: 2,000,000 lovelace (2 ADA)
- Change output: Remaining ADA returned to platform wallet
- Transaction fee: Approximately 175,000 lovelace (0.175 ADA)

**Metadata Schema (Label 8434):**
```json
{
  "8434": {
    "hash": "sha256_hash_64_characters",
    "form_id": "google_forms_form_identifier",
    "response_id": "unique_response_identifier", 
    "timestamp": "unix_timestamp_milliseconds",
    "version": "protocol_version_string"
  }
}
```

### Verification Queries

**Process**: Read-only blockchain queries using Blockfrost API
**Target**: Metadata transactions with label 8434
**Response**: Hash existence confirmation, transaction details, and complete metadata
**Cost**: Free (no transaction required)

## Off-Chain Implementation

### Hash Storage Function

```typescript
async function storeHash(hash: string, metadata: FormMetadata): Promise<string> {
  const tx = await lucid
    .newTx()
    .payToContract(contractAddress, { inline: Data.void() }, { lovelace: 2000000n })
    .addMetadata(8434, {
      hash: hash,
      form_id: metadata.formId,
      response_id: metadata.responseId,
      timestamp: Date.now(),
      version: "1.0"
    })
    .complete();

  return await tx.sign().complete().submit();
}
```

### Hash Verification Function

```typescript
async function verifyHash(hash: string): Promise<VerificationResult> {
  const response = await fetch(
    `${BLOCKFROST_URL}/metadata/txs/labels/8434`,
    { headers: { project_id: BLOCKFROST_PROJECT_ID }}
  );
  
  const transactions = await response.json();
  const match = transactions.find(tx => 
    tx.json_metadata["8434"]?.hash === hash
  );
  
  return {
    verified: !!match,
    transactionHash: match?.tx_hash,
    metadata: match?.json_metadata["8434"],
    blockHeight: match?.block_height,
    blockTime: match?.block_time
  };
}
```

## API Integration

### Storage Endpoint

**Endpoint**: `POST /api/storehash`

**Request Body:**
```json
{
  "hash": "64-character SHA-256 hash",
  "metadata": {
    "formId": "google_forms_id",
    "responseId": "unique_response_id"
  }
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "cardano_transaction_hash",
  "contractAddress": "deployed_contract_address",
  "cost": "2.175 ADA"
}
```

### Verification Endpoint

**Endpoint**: `POST /api/verify`

**Request Body:**
```json
{
  "hash": "64-character SHA-256 hash"
}
```

**Response:**
```json
{
  "verified": true,
  "transactionHash": "blockchain_transaction_hash",
  "metadata": {
    "hash": "original_hash",
    "form_id": "form_identifier",
    "response_id": "response_identifier",
    "timestamp": 1234567890123,
    "version": "1.0"
  },
  "blockHeight": 12345678,
  "blockTime": 1234567890
}
```

## Configuration Requirements

### Environment Variables

```bash
# Blockfrost API Configuration
BLOCKFROST_PROJECT_ID=your_blockfrost_project_id
BLOCKFROST_URL=https://cardano-preview.blockfrost.io/api/v0

# Platform Wallet Configuration  
PLATFORM_WALLET_KEY=your_private_key_hex
PLATFORM_WALLET_ADDRESS=your_wallet_address

# Contract Deployment
CONTRACT_ADDRESS=deployed_contract_address
LUCID_NETWORK=Preview  # or Mainnet
```

### Network Configuration

**Testnet Deployment**: Cardano Preview network for development and testing
**Mainnet Deployment**: Cardano mainnet for production operations
**API Provider**: Blockfrost for blockchain queries and transaction submission

## Cost Analysis

### Transaction Costs

**Hash Storage**: 2.175 ADA per hash
- Network transaction fee: ~0.175 ADA
- Contract UTxO lock: 2.000 ADA
- Script execution: ~0.005 ADA

**Hash Verification**: Free
- Read-only blockchain queries
- No transaction submission required
- Unlimited verification attempts

### Optimization Strategies

**UTxO Pooling**: Maintain multiple contract UTxOs for concurrent transaction processing
**UTxO Cycling**: Implement UTxO consumption and recreation cycles to reduce locked ADA
**Batch Processing**: Group multiple hash storage operations for cost efficiency
**Network Optimization**: Strategic timing of transactions during low-fee periods

## Security Considerations

### Cryptographic Security

**Hash Algorithm**: SHA-256 provides 256-bit cryptographic security
**Deterministic Hashing**: Consistent hash generation ensures reliable verification
**Immutable Storage**: Blockchain storage prevents hash tampering or deletion

### Access Control

**Platform Wallet**: Centralized transaction signing for cost control and security
**API Authentication**: Secure endpoints prevent unauthorized hash submissions
**Rate Limiting**: Transaction throttling prevents abuse and manages costs

### Privacy Protection

**Hash-Only Storage**: Original form data never stored on blockchain
**Metadata Minimization**: Only essential verification data included in transactions
**Google Integration**: Form responses remain within Google's secure infrastructure

## Integration Points

### Google Forms Add-on Integration

**Trigger System**: Automatic hash generation on form submission
**Secure Communication**: HTTPS API calls with authentication
**Error Handling**: Retry logic and failure recovery mechanisms
**User Interface**: Configuration and status monitoring within Google Forms

### External Application Integration

**API Gateway**: RESTful endpoints for hash storage and verification
**Dashboard Interface**: Real-time status monitoring and form management
**Blockchain Service**: Automated transaction creation and submission
**User Management**: Account registration and API key management

## Testing Framework

### Unit Tests

```typescript
// Test hash storage functionality
test('should store hash successfully', async () => {
  const hash = generateTestHash();
  const metadata = createTestMetadata();
  const txHash = await storeHash(hash, metadata);
  expect(txHash).toBeDefined();
});

// Test verification functionality  
test('should verify stored hash', async () => {
  const hash = generateTestHash();
  await storeHash(hash, createTestMetadata());
  const result = await verifyHash(hash);
  expect(result.verified).toBe(true);
});
```

### Integration Tests

**End-to-End Verification**: Complete workflow from hash generation to blockchain verification
**API Testing**: Comprehensive endpoint testing with various input scenarios
**Error Handling**: Network failure recovery and invalid input handling
**Performance Testing**: Transaction throughput and response time optimization

## Deployment Guide

### Contract Deployment

1. **Compile Contract**: Build Aiken validator to Plutus script
2. **Generate Address**: Create contract address from compiled script
3. **Fund Wallet**: Ensure platform wallet has sufficient ADA
4. **Deploy Script**: Submit reference script transaction to blockchain
5. **Verify Deployment**: Confirm contract address accessibility

### Application Deployment

1. **Environment Setup**: Configure environment variables and API keys
2. **Database Migration**: Initialize user and transaction tracking databases
3. **API Deployment**: Deploy REST endpoints with proper security configuration
4. **Frontend Deployment**: Deploy dashboard interface with blockchain integration
5. **Monitoring Setup**: Implement logging and performance monitoring

## Future Enhancements

### Smart Contract Evolution

**Enhanced Validation**: On-chain hash format and duplicate prevention
**Authorization Logic**: Multi-signature and role-based access control
**Batch Operations**: Multiple hash storage in single transaction
**Governance Features**: Upgradeable contract with community governance

### Protocol Extensions

**Multi-Platform Support**: Integration with additional form platforms
**Enterprise Features**: Advanced analytics and compliance reporting
**Performance Optimization**: Layer 2 solutions for cost reduction
**Interoperability**: Cross-chain verification capabilities

## Support and Maintenance

### Monitoring

**Transaction Monitoring**: Real-time tracking of hash storage operations
**Cost Analysis**: Ongoing fee optimization and budget management
**Performance Metrics**: Response time and throughput monitoring
**Error Tracking**: Comprehensive logging and alert systems

### Upgrades

**Contract Versioning**: Backward-compatible contract improvements
**API Evolution**: RESTful endpoint enhancements and new features
**Security Updates**: Regular security assessments and improvements
**Feature Rollouts**: Gradual deployment of new functionality

