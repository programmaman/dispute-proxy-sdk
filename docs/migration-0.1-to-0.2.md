# Migrating from 0.1.x to 0.2.0

Disputes 0.2.0 is provider-agnostic. The SDK core no longer requires Ethers or
Viem and instead accepts an application-owned `RpcClient` and `AbiCodec`.

```bash
npm install @rakelabs/disputes-sdk @rakelabs/ethers-adapter ethers
# or
npm install @rakelabs/disputes-sdk @rakelabs/viem-adapter viem
```

Replace provider-based construction with
`Disputes.fromRpc(rpcClient, { codec, walletAddress })`. The SDK continues to
return unsigned `PreparedTx` values; your signer or wallet remains responsible
for signing and broadcasting them.

Use `codec.decodeError(rawData)` for raw revert bytes and the selected adapter's
`decodeEthersError` or `decodeViemError` helper for wrapped provider errors.

The 0.1.x documentation remains available in the corresponding Git tags.
