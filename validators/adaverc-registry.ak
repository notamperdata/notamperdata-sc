// validators/notamperdata_registry.ak
use cardano/transaction.{OutputReference, Transaction}
use mocktail.{complete, mocktail_tx}
use mocktail/virgin_output_reference.{mock_utxo_ref}

/// notamperdata Registry validator
/// 
/// This minimal validator provides the foundation for blockchain-based form response verification.
/// Currently operates in MVP mode by allowing all transactions, with hash data stored using 
/// Cardano's metadata feature which is sufficient for MVP requirements and optimal for cost efficiency.
/// 
/// The validator is designed for extensibility - future versions can add on-chain validation logic
/// for enhanced verification while maintaining backward compatibility.
/// 
/// The MVP design keeps transaction costs minimal while providing immutable hash storage on-chain. that transactions contain the required metadata
/// label (8434) for blockchain-based form response verification.
/// notamperdata registry validator for hash storage transactions
validator notamperdata_registry {
  spend(
    _datum: Option<Data>,
    _redeemer: Data,
    _own_ref: OutputReference,
    _tx: Transaction,
  ) {
    // Metadata validation will be handled off-chain
    // The smart contract provides UTxO structure for hash storage
    True
  }

  else(_) {
    // Any other use of this validator should fail
    False
  }
}

// Test that the validator allows all spend transactions
test notamperdata_registry_allows_spend() {
  // Create a mock transaction
  let tx = mocktail_tx() |> complete()
  // Create a mock UTxO reference
  let utxo_ref = mock_utxo_ref(0, 0)
  // Test the validator - should return True for any spend
  let result = notamperdata_registry.spend(None, Void, utxo_ref, tx)
  // Assert that the validator allows the transaction
  result == True
}

// Test that other purposes return False
test notamperdata_registry_rejects_other_purposes() {
  // Test the else clause - should return False
  let result = notamperdata_registry.else(Void)
  // Assert that other purposes are rejected
  result == False
}
