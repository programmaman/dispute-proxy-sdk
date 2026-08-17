# Changelog

All notable public changes to `@rakelabs/disputes-sdk` are documented here.

## Unreleased

## 0.2.1

### Changed

- Updated the direct `@noble/hashes` dependency to 2.3.0 and migrated Keccak imports to its v2 ESM subpath.

## 0.2.0

### Breaking

- Decoupled the SDK from Ethers and Viem runtime APIs and dependencies; integrations now supply provider-specific adapters.
- Replaced the generic RPC request boundary with explicit `call`, `getLogs`, `getChainId`, and `getBlock` operations.

### Changed

- Updated dispute reads, event queries, and multicall flows to use the explicit RPC operations.
- Kept provider-specific transaction submission and revert handling in the integration adapters.

## 0.1.4

### Added

- Added convenient individual read methods for dispute status, rulings, evidence, and appeals.

### Maintenance

- Added automated release validation and npm provenance publishing.

## 0.1.3

- Initial public npm release of the dispute and Kleros workflow SDK.
