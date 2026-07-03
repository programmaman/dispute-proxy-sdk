# Advanced Guide

This guide covers direct builders, readers, implementation pinning, multicall, event indexing, crowdfundable disputes, and wallet-library adapters.

## Choose the Right Layer

| Layer | Use when |
| --- | --- |
| `Disputes` facade | You want deployment lookup, prepare helpers, bound dispute handles, and fewer manual fee steps. |
| `DisputeReader` | You only need chain reads. |
| `DisputeTxBuilder` | You already have fees and IDs and only need calldata encoding. |
| `DisputeEvents` | You are indexing raw logs yourself. |

Most apps should use:

```ts
const disputes = await Disputes.fromProvider(provider, walletAddress);
const { tx } = await disputes.factory.prepareCreateDispute(params);
const dispute = disputes.dispute('0xDISPUTE_ADDRESS');
```

## Explicit Config

```ts
const disputes = new Disputes({
  chainId: 11155111,
  factoryAddress: '0xFACTORY_ADDRESS',
  provider,
  walletAddress,
  multicall: {
    address: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },
});
```

Use explicit config for custom deployments, tests, backends, or when you need multicall and implementation pinning.

## Crowdfundable Disputes

Use the crowdfundable path when your dispute implementation supports crowd-funded appeals or related contribution flows.

```ts
const { tx, disputeId, totalValue } =
  await disputes.factory.prepareCreateCrowdfundableDispute({
    arbitratorExtraData,
    metaEvidenceUri: 'ipfs://QmMetaEvidence',
    numberOfRulingOptions: 2n,
  });

await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: BigInt(tx.value),
});
```

Factory logs for crowdfundable deployments are separate:

```ts
const logs = await disputes.factory.getCrowdfundableLogs(0, 'latest');
```

## Implementation Pinning

Factories can register multiple standard and crowdfundable dispute implementations.

```ts
const standard = await disputes.factory.listImplementations();
const crowdfundable = await disputes.factory.listCrowdfundableImplementations();
```

Pin a standard implementation in explicit config:

```ts
const pinned = new Disputes({
  chainId: 11155111,
  factoryAddress: '0xFACTORY_ADDRESS',
  provider,
  walletAddress,
  impl: standard[0],
});
```

Pinning affects create and predict calls. Existing dispute handles are bound to a deployed clone address and do not need implementation selection.

## Multicall Reads

Add Multicall3 to batch `readDispute()` and `readFactory()` internals.

```ts
const disputes = await Disputes.fromProvider(provider, walletAddress, {
  address: '0xcA11bde05977b3631167028862bE2a173976CA11',
});

const info = await disputes.dispute('0xDISPUTE_ADDRESS').read();
const config = await disputes.factory.readConfig();
```

Only configure multicall for chains where the address is deployed.

## Direct Transaction Builder

`DisputeTxBuilder` is stateless. It does not estimate fees, resolve deployments, or read chain state.

```ts
import {
  DisputeTxBuilder,
  IdGenerator,
  buildArbitratorExtraData,
} from '@rakelabs/disputes-sdk';

const builder = new DisputeTxBuilder();
const cfg = { chainId: 11155111, factoryAddress: '0xFACTORY_ADDRESS' };

const tx = builder.createDispute(cfg, {
  callerWallet: '0xOWNER_ADDRESS',
  disputeId: IdGenerator.generateOnChainIdHex(),
  arbitratorExtraData: buildArbitratorExtraData(0, 3),
  metaEvidenceUri: 'ipfs://QmMetaEvidence',
  numberOfRulingOptions: 2n,
  creationFee: 0n,
  arbFee: 1_000_000_000_000_000n,
});
```

Builder methods:

| Method | Description |
| --- | --- |
| `createDispute(cfg, params)` | Build standard dispute create transaction. |
| `createCrowdfundableDispute(cfg, params)` | Build crowdfundable dispute create transaction. |
| `submitEvidence(cfg, params)` | Build evidence submission transaction. |
| `amendMetaEvidence(cfg, params)` | Build owner-only meta-evidence amendment transaction. |
| `appeal(cfg, params)` | Build appeal transaction with supplied appeal fee. |
| `rescueEth(cfg, params)` | Build rescue transaction for trapped ETH after ruling. |

## Direct Reader

```ts
import { JsonRpcProvider } from 'ethers';
import { DisputeReader } from '@rakelabs/disputes-sdk';

const reader = new DisputeReader(new JsonRpcProvider(process.env.RPC_URL));

const factory = await reader.readFactory('0xFACTORY_ADDRESS');
const dispute = await reader.readDispute('0xDISPUTE_ADDRESS');
const cost = await reader.estimateCost('0xFACTORY_ADDRESS', arbitratorExtraData);
```

Use direct readers for dashboards, monitoring jobs, backends, and services that should never prepare transactions.

## Event Indexing

For common app history:

```ts
const byOwner = await disputes.factory.getLogsByOwner(ownerAddress);
const history = await disputes.dispute('0xDISPUTE_ADDRESS').getLogs();
const evidence = await disputes.dispute('0xDISPUTE_ADDRESS')
  .getEvidenceTimeline(0, 'latest');
```

For custom indexers:

```ts
import { DisputeEvents, DisputeTopics } from '@rakelabs/disputes-sdk';

const events = new DisputeEvents();
const rawLogs = await provider.getLogs({
  address: factoryAddress,
  topics: [DisputeTopics.DISPUTE_CREATED],
  fromBlock: 0,
  toBlock: 'latest',
});

for (const log of rawLogs) {
  const decoded = events.tryDecodeDisputeCreated({
    address: log.address,
    topics: log.topics,
    data: log.data,
    transactionHash: log.transactionHash,
  });
  if (decoded) {
    console.log(decoded.disputeId, decoded.instance);
  }
}
```

## Evidence Timeline

`getEvidenceTimeline()` enriches evidence events with block timestamps.

```ts
const timeline = await dispute.getEvidenceTimeline(0, 'latest');

for (const event of timeline) {
  console.log(event.submittedAt, event.party, event.evidenceUri);
}
```

Use this for UI timelines and audit exports. For large historical scans, prefer a real indexer and paginate block ranges.

## Wallet Library Adapters

ethers v6:

```ts
await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: BigInt(tx.value),
});
```

wagmi / viem:

```ts
await sendTransaction(config, {
  to: tx.to as `0x${string}`,
  data: tx.data as `0x${string}`,
  value: BigInt(tx.value),
});
```

Account abstraction:

```ts
await smartAccount.sendUserOperation({
  target: tx.to,
  data: tx.data,
  value: BigInt(tx.value),
});
```

## ID Generation

```ts
import { IdGenerator } from '@rakelabs/disputes-sdk';

const onChainId = IdGenerator.generateOnChainIdHex();
const displayId = IdGenerator.generateFriendlyId('DISP-', 12);
```
