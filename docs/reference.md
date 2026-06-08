# Reference

Cheat sheet for every action, type, and common mistake.

## States

```ts
enum DisputeState { PENDING, RULED }
enum DisputeType { STANDARD, CROWDFUNDABLE }
```

## Arbitrator extraData

```ts
import { buildArbitratorExtraData, parseArbitratorExtraData, MainnetCourts } from '@rakelabs/disputes-sdk';
```

| Function | Returns | Description |
|----------|---------|-------------|
| `buildArbitratorExtraData(courtId, minJurors)` | `string` (0x hex) | Encode Kleros Liquid court routing. |
| `parseArbitratorExtraData(hex)` | `{ subcourtId: bigint, minJurors: bigint }` | Decode back. |

Use `MainnetCourts` for self-documenting court IDs:

```ts
buildArbitratorExtraData(MainnetCourts.HumanityCourt, 3);
// instead of
buildArbitratorExtraData(23, 3);
```



## Factory actions

| Method | Description | Who signs |
|--------|-------------|:---------:|
| `factory.readConfig()` | Read factory config (arbitrator, fee, impls, etc.). | N/A (read) |
| `factory.estimateCost(extraData)` | Quote creation fee + arbitration cost. | N/A (read) |
| `factory.creationFee()` | Read the factory's flat creation fee. | N/A (read) |
| `factory.disputeImplCount()` | Number of registered dispute implementations. | N/A (read) |
| `factory.crowdfundableDisputeImplCount()` | Number of registered crowdfundable implementations. | N/A (read) |
| `factory.listImplementations()` | All registered standard dispute implementations. | N/A (read) |
| `factory.listCrowdfundableImplementations()` | All registered crowdfundable dispute implementations. | N/A (read) |
| `factory.predictAddress(req, caller)` | Predict clone address before creating. | N/A (read) |
| `factory.createDispute(params)` | Build create dispute tx (you supply fee amounts). | Creator |
| `factory.prepareCreateDispute(params)` | Estimate cost + build create tx in one call. | Creator |
| `factory.createCrowdfundableDispute(params)` | Build create crowdfundable dispute tx. | Creator |
| `factory.prepareCreateCrowdfundableDispute(params)` | Estimate cost + build create crowdfundable tx. | Creator |
| `factory.getLogs(from, to)` | Fetch DisputeCreated events from factory. | N/A (read) |
| `factory.getCrowdfundableLogs(from, to)` | Fetch CrowdfundableDisputeDeployed events. | N/A (read) |
| `factory.getLogsByOwner(owner, from, to)` | Fetch events by owner address (both types). | N/A (read) |

### CreateDispute params

```ts
{
  disputeId:             string;   // bytes32 hex (auto-generated if omitted in prepare*)
  arbitratorExtraData:   string;   // 0x-prefixed hex from buildArbitratorExtraData()
  metaEvidenceUri:       string;   // IPFS link or other URI
  numberOfRulingOptions: bigint;   // e.g. 2n = binary (for/against), 3n = with abstain
  creationFee:           bigint;   // factory creation fee (read from chain)
  arbFee:                bigint;   // Kleros arbitration fee (read from chain)
}
```

### FactoryInfo fields

```ts
{
  factoryAddress:                     string;
  defaultDisputeImpl:                 string;
  defaultDisputeImplName:             string;
  defaultCrowdfundableDisputeImpl:    string;
  defaultCrowdfundableDisputeImplName: string;
  arbitrator:         string;
  creationFee:        bigint;
  feeRecipient:       string;
  defaultsProvider:   string;
  owner:              string;
  pendingOwner:       string;
}
```

## SDK config

```ts
interface DisputeSdkConfig {
  chainId:         number;
  factoryAddress:  string;
  provider:        AbstractProvider;
  walletAddress?:  string;
  multicall?:      MulticallConfig;   // optional Multicall3 batching
  impl?:           { address: string; name: string };
}
```

## Dispute reads

| Method | Returns |
|--------|---------|
| `dispute.read()` | `DisputeInfo`, all on-chain state |
| `dispute.arbitrationCost()` | `bigint`, current Kleros arbitration fee in wei |
| `dispute.appealCost()` | `bigint`, current appeal fee |
| `dispute.appealPeriod()` | `{ start: bigint, end: bigint }`, appeal window |
| `dispute.getLogs(fromBlock, toBlock)` | `DisputeEvent[]`, all clone events |
| `dispute.getEvidenceTimeline(fromBlock, toBlock)` | `EnrichedEvidenceEvent[]`, evidence with block timestamps |

### DisputeInfo fields

```ts
{
  disputeAddress:        string;
  state:                 DisputeState;
  owner:                 string;
  arbitrator:            string;
  arbitratorExtraData:   string;       // raw hex
  providerDisputeId:     bigint;       // Kleros internal dispute ID
  numberOfRulingOptions: bigint;
  ruling:                bigint;
  isRuled:               boolean;
  evidenceSubmitted:     boolean;
}
```

## Dispute writes

| Method | Description |
|--------|-------------|
| `dispute.submitEvidence(uri)` | Submit evidence to the arbitrator. |
| `dispute.amendMetaEvidence(newUri)` | Update the meta-evidence URI. |
| `dispute.appeal(extraData, feeWei)` | Appeal the current ruling. |
| `dispute.rescueEth()` | Rescue trapped ETH after ruling. |

## Event topics

```ts
import { DisputeTopics } from '@rakelabs/disputes-sdk';
```
| `TOPIC_EVIDENCE` | `Evidence(address,uint256,address,string)` (clone) |

## Decoded event shapes

```ts
// Factory events
type DisputeCreatedEvent = { disputeId, instance, owner, logAddress, transactionHash }
type CrowdfundableDisputeDeployedEvent = { disputeId, instance, owner, logAddress, transactionHash }

// Clone events
type ProviderDisputeCreatedEvent = { owner, providerDisputeId, logAddress, transactionHash }
type RulingIssuedEvent = { providerDisputeId, ruling, logAddress, transactionHash }
type DisputeEvidenceEvent = { arbitrator, evidenceGroupId, party, evidenceUri, logAddress, transactionHash }

// Enriched evidence
type EnrichedEvidenceEvent = {
  party, evidenceGroupId, arbitrator, evidenceUri,
  submittedAt: Date, blockNumber: number, transactionHash?: string,
}
```

## PreparedTx shape

Every write method returns a `PreparedTx`:

```ts
{
  to:         string;   // contract address
  data:       string;   // calldata (0x-prefixed)
  value:      string;   // ETH in wei (decimal string)
  chainId:    number;
  signerHint?: string;  // human-readable action label
  preview?:   SigningPreview;  // structured fee breakdown for wallet UI
}
```

## Common mistakes

| Mistake | Fix |
|---------|-----|
| Forgot to pass `value` when sending the tx. | Include `value: BigInt(tx.value)` in the `sendTransaction` call. |
| Used `predictAddress` without the `caller` arg. | Pass the deployer's address as `caller` so the salt matches. |
| Tried `appealCost` or `appealPeriod` on a non-disputed dispute. | Check the dispute state first. |
| Submitting the wrong `arbitratorExtraData`. | Use `buildArbitratorExtraData(courtId, minJurors)`. Never construct the hex manually. |
| Assuming `submitEvidence` is owner-only. | Anyone can submit evidence. `amendMetaEvidence` is owner-only. |
