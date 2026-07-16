# API Reference

Compact reference for the public Disputes npm surface.

## Main Exports

```ts
import {
  Disputes,
  Dispute,
  DisputeTxBuilder,
  DisputeReader,
  DisputeEvents,
  DisputeTopics,
  DisputeState,
  DisputeType,
  buildArbitratorExtraData,
  parseArbitratorExtraData,
  extraData,
  MainnetCourts,
  decodeDisputeError,
  IdGenerator,
} from '@rakelabs/disputes-sdk';
```

## State Enums

```ts
enum DisputeState {
  PENDING = 0,
  RULED = 1,
}

enum DisputeType {
  STANDARD = 0,
  CROWDFUNDABLE = 1,
}
```

## Arbitrator Extra Data

```ts
const encoded = buildArbitratorExtraData(MainnetCourts.HumanityCourt, 3);
const decoded = parseArbitratorExtraData(encoded);
```

| Helper | Purpose |
| --- | --- |
| `buildArbitratorExtraData(courtId, minJurors)` | Encode Kleros court routing. |
| `parseArbitratorExtraData(hex)` | Decode court ID and juror count. |
| `extraData.generalCourt()` | Convenience extraData for general court defaults. |
| `extraData.humanityCourt(minJurors)` | Convenience extraData for Humanity Court. |
| `MainnetCourts` | Named court IDs. |

## Top-Level SDK

| Method | Purpose |
| --- | --- |
| `Disputes.fromProvider(provider, walletAddress?, multicall?)` | Detect chain and default factory from provider. |
| `Disputes.forChain(chainId, provider, walletAddress?, impl?)` | Use the canonical factory address for a specific chain ID. |
| `new Disputes(config)` | Use explicit factory, chain, multicall, and implementation config. |
| `disputes.dispute(address)` | Return a bound dispute handle. No network call. |

## SDK Config

```ts
interface DisputeSdkConfig {
  chainId: number;
  factoryAddress: string;
  provider: AbstractProvider;
  walletAddress?: string;
  multicall?: { address: string };
  impl?: { address: string; name: string };
}
```

## Factory Reads

| Method | Returns |
| --- | --- |
| `factory.readConfig()` | `FactoryInfo` |
| `factory.creationFee()` | `bigint` |
| `factory.estimateCost(arbitratorExtraData)` | `{ creationFee, arbitrationCost, total }` |
| `factory.disputeImplCount()` | `number` |
| `factory.crowdfundableDisputeImplCount()` | `number` |
| `factory.listImplementations()` | Standard implementations |
| `factory.listCrowdfundableImplementations()` | Crowdfundable implementations |
| `factory.predictAddress(req, caller?)` | Predicted clone address |
| `factory.getLogs(from?, to?)` | `DisputeCreatedEvent[]` |
| `factory.getCrowdfundableLogs(from?, to?)` | `CrowdfundableDisputeDeployedEvent[]` |
| `factory.getLogsByOwner(owner, from?, to?)` | Standard and crowdfundable creation events |

## Factory Writes

| Method | Description | Who signs |
| --- | --- | --- |
| `factory.prepareCreateDispute(params)` | Estimate fees and build standard dispute transaction. | Owner |
| `factory.prepareCreateCrowdfundableDispute(params)` | Estimate fees and build crowdfundable dispute transaction. | Owner |
| `factory.createDispute(params)` | Build standard dispute transaction when you already know fees. | Owner |
| `factory.createCrowdfundableDispute(params)` | Build crowdfundable dispute transaction when you already know fees. | Owner |

### Prepare Create Params

```ts
interface PrepareCreateDisputeParams {
  disputeId?: string;
  arbitratorExtraData: string;
  metaEvidenceUri: string;
  numberOfRulingOptions: bigint;
}
```

### Prepare Result

```ts
type PrepareCreateResult = {
  tx: PreparedTx;
  disputeId: string;
  creationFee: bigint;
  arbitrationCost: bigint;
  totalValue: bigint;
};
```

## Dispute Reads

| Method | Returns |
| --- | --- |
| `dispute.read()` | `DisputeInfo` |
| `dispute.read.state()` | `DisputeState` |
| `dispute.read.owner()` | Owner address |
| `dispute.read.arbitrator()` | Arbitrator address |
| `dispute.read.arbitratorExtraData()` | Arbitrator extra data |
| `dispute.read.providerDisputeId()` | Provider dispute ID |
| `dispute.read.numberOfRulingOptions()` | Number of ruling options |
| `dispute.read.ruling()` | Current ruling |
| `dispute.read.isRuled()` | `boolean` |
| `dispute.read.evidenceSubmitted()` | `boolean` |
| `dispute.read.arbitrationCost()` | Current Kleros arbitration fee |
| `dispute.read.appealCost()` | Current appeal fee |
| `dispute.read.appealPeriod()` | `AppealPeriod` |
| `dispute.arbitrationCost()` | Current Kleros arbitration fee |
| `dispute.appealCost()` | Current appeal fee |
| `dispute.appealPeriod()` | `AppealPeriod` |
| `dispute.getLogs(from?, to?)` | Decoded dispute clone events |
| `dispute.getEvidenceTimeline(from?, to?)` | Evidence events with block timestamps |

## Direct Reader

`DisputeReader` exposes the same read surface with a dispute address argument:

| Method | Returns |
| --- | --- |
| `reader.readDispute(address)` | `DisputeInfo` |
| `reader.readDispute.state(address)` | `DisputeState` |
| `reader.readDispute.owner(address)` | Owner address |
| `reader.readDispute.arbitrator(address)` | Arbitrator address |
| `reader.readDispute.arbitratorExtraData(address)` | Arbitrator extra data |
| `reader.readDispute.providerDisputeId(address)` | Provider dispute ID |
| `reader.readDispute.numberOfRulingOptions(address)` | Number of ruling options |
| `reader.readDispute.ruling(address)` | Current ruling |
| `reader.readDispute.isRuled(address)` | `boolean` |
| `reader.readDispute.evidenceSubmitted(address)` | `boolean` |
| `reader.readDispute.arbitrationCost(address)` | Current Kleros arbitration fee |
| `reader.readDispute.appealCost(address)` | Current appeal fee |
| `reader.readDispute.appealPeriod(address)` | `AppealPeriod` |

## Dispute Writes

| Method | Description |
| --- | --- |
| `dispute.submitEvidence(uri)` | Submit evidence URI. |
| `dispute.amendMetaEvidence(newUri)` | Owner-only meta-evidence update before evidence is submitted. |
| `dispute.appeal(extraData, feeWei)` | Build appeal transaction with caller-supplied fee. |
| `dispute.rescueEth()` | Rescue trapped ETH after ruling. |

## DisputeInfo

```ts
interface DisputeInfo {
  disputeAddress: string;
  state: DisputeState;
  owner: string;
  arbitrator: string;
  arbitratorExtraData: string;
  providerDisputeId: bigint;
  numberOfRulingOptions: bigint;
  ruling: bigint;
  isRuled: boolean;
  evidenceSubmitted: boolean;
}

interface AppealPeriod {
  start: bigint;
  end: bigint;
}
```

## PreparedTx

```ts
interface PreparedTx {
  to: string;
  data: string;
  value: string;
  chainId: number;
  signerHint?: string;
  preview?: SigningPreview;
}
```

Send with ethers v6:

```ts
await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: BigInt(tx.value),
});
```

## Events

Factory events:

```ts
type DisputeCreatedEvent = {
  disputeId: string;
  instance: string;
  owner: string;
  logAddress: string;
  transactionHash?: string;
};

type CrowdfundableDisputeDeployedEvent = {
  disputeId: string;
  instance: string;
  owner: string;
  logAddress: string;
  transactionHash?: string;
};
```

Clone events:

```ts
type ProviderDisputeCreatedEvent = {
  owner: string;
  providerDisputeId: bigint;
  logAddress: string;
  transactionHash?: string;
};

type RulingIssuedEvent = {
  providerDisputeId: bigint;
  ruling: bigint;
  logAddress: string;
  transactionHash?: string;
};

type DisputeEvidenceEvent = {
  party: string;
  evidenceGroupId: bigint;
  arbitrator: string;
  evidenceUri: string;
  logAddress: string;
  transactionHash?: string;
};
```

## Common Mistakes

| Mistake | Fix |
| --- | --- |
| Passing `tx.value` directly to ethers v6. | Use `BigInt(tx.value)`. |
| Treating `disputeId` as the contract address. | Store `instance` from the factory creation event. |
| Building `arbitratorExtraData` manually. | Use `buildArbitratorExtraData()` or `extraData`. |
| Assuming evidence submission is owner-only. | Anyone can submit evidence while the contract allows it. |
| Amending meta-evidence after evidence exists. | Amend before evidence is submitted, or create a new dispute/policy version. |
| Scanning from block `0` in production on every page load. | Persist indexed cursors or query bounded block ranges. |
