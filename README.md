# @rakelabs/disputes-sdk

Build Kleros-facing dispute workflows from a TypeScript app. The SDK prepares unsigned transactions for dispute creation, evidence submission, meta-evidence amendments, appeals, and event decoding; your user's wallet remains responsible for signing and broadcasting.

The SDK never holds private keys and never takes custody of funds.

```text
Your app -> Disputes SDK -> unsigned transaction -> user wallet -> blockchain
```

## Install

```bash
npm install @rakelabs/disputes-sdk ethers
```

Requirements:

- Node.js 20+
- ethers v6
- an EIP-1193 wallet provider, JSON-RPC provider, or compatible ethers provider

## What You Build With It

Use this package when your application needs a standalone Kleros dispute contract:

- choose Kleros court parameters with `extraData`,
- publish or reference a MetaEvidence URI,
- create a dispute with a fixed number of ruling options,
- submit evidence documents,
- read dispute state, evidence timelines, rulings, and events,
- prepare appeal transactions when the ruling can be appealed.

If your product is specifically escrow or payment oriented, start with `@rakelabs/klescrow-sdk` or `@rakelabs/dpayments-sdk`. Use this package when you need direct dispute primitives.

## Quick Start

```ts
import { BrowserProvider } from 'ethers';
import { Disputes, extraData } from '@rakelabs/disputes-sdk';

const provider = new BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);

const signer = await provider.getSigner();
const walletAddress = await signer.getAddress();

const disputes = await Disputes.fromProvider(provider, walletAddress);

const arbitratorExtraData = extraData.generalCourt();
const estimate = await disputes.factory.estimateCost(arbitratorExtraData);

console.log('Total dispute cost:', estimate.total.toString());

const { tx, disputeId } = await disputes.factory.prepareCreateDispute({
  arbitratorExtraData,
  metaEvidenceUri: 'ipfs://QmYourMetaEvidenceDocument',
  numberOfRulingOptions: 2n,
});

console.log(tx.preview);

const response = await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: BigInt(tx.value),
});
await response.wait();

const created = (await disputes.factory.getLogs(0, 'latest'))
  .find((event) => event.disputeId === disputeId);

if (!created) {
  throw new Error('Dispute creation event was not found');
}

const dispute = disputes.dispute(created.instance);
```

## MetaEvidence and Evidence

Kleros workflows usually have two document layers:

- MetaEvidence describes the dispute category, question, policy, and ruling options.
- Evidence describes the proof submitted for one specific dispute.

Use `@rakelabs/evidence-publisher` to build and publish both document types to IPFS, then pass the returned `ipfs://...` URIs into this SDK.

## Common Flows

### Read State

```ts
const info = await dispute.read();

console.log(info.state);
console.log(info.owner);
console.log(info.providerDisputeId);
console.log(info.numberOfRulingOptions);
```

### Submit Evidence

```ts
const evidenceTx = dispute.submitEvidence('ipfs://QmYourEvidenceDocument');
console.log(evidenceTx.preview);

await signer.sendTransaction({
  to: evidenceTx.to,
  data: evidenceTx.data,
  value: BigInt(evidenceTx.value),
});
```

### Read Evidence Timeline

```ts
const timeline = await dispute.getEvidenceTimeline(0, 'latest');

for (const event of timeline) {
  console.log(event.submittedAt, event.party, event.evidenceUri);
}
```

### Appeal

```ts
const [appealFeeWei, appealPeriod] = await Promise.all([
  dispute.appealCost(),
  dispute.appealPeriod(),
]);

if (appealPeriod.end === 0n) {
  throw new Error('No appeal window is currently open');
}

const appealTx = dispute.appeal('0x', appealFeeWei);
await signer.sendTransaction({
  to: appealTx.to,
  data: appealTx.data,
  value: BigInt(appealTx.value),
});
```

## Arbitrator Extra Data

Kleros uses `extraData` to select the court and minimum juror count.

```ts
import {
  buildArbitratorExtraData,
  parseArbitratorExtraData,
  extraData,
} from '@rakelabs/disputes-sdk';

const encoded = buildArbitratorExtraData(0, 3);
const generalCourt = extraData.generalCourt();
const decoded = parseArbitratorExtraData(encoded);

console.log(generalCourt, decoded.subcourtId, decoded.minJurors);
```

## Errors

Use `decodeDisputeError` to turn raw revert data into a readable contract error.

```ts
import { decodeDisputeError } from '@rakelabs/disputes-sdk';

try {
  await signer.sendTransaction({
    to: tx.to,
    data: tx.data,
    value: BigInt(tx.value),
  });
} catch (err) {
  const decoded = decodeDisputeError(err);
  if (decoded && 'error' in decoded) {
    console.error(decoded.error, decoded.args);
  }
}
```

## Documentation

| Document | Use it for |
| --- | --- |
| [docs/reference.md](docs/reference.md) | API reference, types, actions, events, and common mistakes |
| [docs/error-decoder.md](docs/error-decoder.md) | Revert decoding details |
| [docs/advanced.md](docs/advanced.md) | Reader, transaction builder, multicall, and implementation selection |
| [docs/on-chain.md](docs/on-chain.md) | Contract-level behavior and event model |

## Safety Notes

- Always show `tx.preview` before requesting a signature.
- Store the dispute contract address after creation; it is the canonical on-chain handle.
- Publish durable MetaEvidence and Evidence URIs before submitting them on-chain.
- Check chain IDs, court parameters, ruling options, and contract addresses before sending transactions.
- This software interacts with autonomous contracts. Users transact at their own risk.
