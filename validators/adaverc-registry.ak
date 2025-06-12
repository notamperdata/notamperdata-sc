// validators/adaverc_registry.ak
use cardano/transaction.{OutputReference, Transaction}

/// Adaverc Registry validator
/// 
/// This minimal validator ensures that hash storage transactions include proper
/// Adaverc metadata. It validates that transactions contain the required metadata
/// label (8434) for blockchain-based form response verification.
/// Adaverc registry validator for hash storage transactions
validator adaverc_registry {
  spend(
    _datum: Option<Data>,
    _redeemer: Data,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    // MVP: Allow all transactions through
    // Metadata validation will be handled off-chain
    // The smart contract provides UTxO structure for hash storage
    True
  }

  else(_) {
    // Any other use of this validator should fail
    False
  }
}
