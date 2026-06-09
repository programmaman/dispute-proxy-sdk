# @rakelabs/disputes-sdk

Build Kleros arbitration into your application.

## What is this?

`@rakelabs/disputes-sdk` is a JavaScript / TypeScript library for creating disputes, submitting evidence, and reading rulings from the Kleros arbitration system.

A dispute is a question that Kleros jurors will answer.

Examples:

* An escrow dispute between a buyer and seller.
* A payment dispute.
* A registry challenge.
* A moderation appeal.
* Any workflow that needs an independent ruling.

The SDK creates transaction requests but never signs or sends them.

Your application prepares the transaction, the user's wallet signs it, and the blockchain executes it.

```text
Your App
    ↓
Disputes SDK
    ↓
Prepared Transaction
    ↓
User Wallet
    ↓
Blockchain
```

The SDK never stores private keys and never takes custody of user funds.

## Installation

```bash
npm install @rakelabs/disputes-sdk ethers
```

> Requires ethers v6.

## How disputes work

Every dispute is deployed as its own smart contract.

A dispute contains:

* A question for jurors to answer.
* A set of ruling options.
* Evidence submitted by participants.
* The final ruling from Kleros.

### States

The dispute moves from PENDING to RULED.

## Evidence

Evidence submission is open by default.

Any address can submit evidence while a dispute is pending.

Each evidence record stores:

* The submitting address.
* The evidence URI.
* The submission time.

If your application needs restricted evidence submission, you can request such an implementation and it will be added to the SDK.

## Quick Start

```ts
import { Disputes } from '@rakelabs/disputes-sdk';
import { BrowserProvider } from 'ethers';

const provider = new BrowserProvider(window.ethereum);
await provider.send('eth_requestAccounts', []);
const signer = await provider.getSigner();
const walletAddress = await signer.getAddress();

// One line. Chain and factory address are auto-detected.
const disputes = await Disputes.fromProvider(provider, walletAddress);
```

## Creating a dispute

First choose which Kleros court should hear the dispute.

```ts
import { extraData } from '@rakelabs/disputes-sdk';

// Pick a court by name. This builds the encoded hex for you.
const data = extraData.humanityCourt(3);   // Court 23, 3 jurors
// const data = extraData.generalCourt();  // Court 0, default 3 jurors
```

Estimate the cost:

```ts
const cost = await disputes.factory.estimateCost(extraData);

console.log(cost.total);
```

> **Building the meta-evidence document?** Consider using [`@rakelabs/evidence-publisher`](https://www.npmjs.com/package/@rakelabs/evidence-publisher). It handles ERC-1497 evidence construction, IPFS publication, and remote pinning. If you're using Kleros' own SDKs, they may also have tooling for this.

Prepare the transaction:

```ts
const { tx } = await disputes.factory.prepareCreateDispute({
  arbitratorExtraData: extraData,
  metaEvidenceUri: 'ipfs://QmYourMetaEvidence',
  numberOfRulingOptions: 3n
});

console.log('Create dispute preview:', tx.preview);
```

Send it with the user's wallet:

```ts
const response = await signer.sendTransaction({
  to: tx.to,
  data: tx.data,
  value: BigInt(tx.value)
});

await response.wait();
```

## Finding the dispute contract

The dispute contract address is the most important identifier.

Applications should store the dispute contract address and use it when reconnecting to existing disputes.

You can:

* Predict the address before deployment.
* Read it from the transaction receipt.
* Read it from the `DisputeCreated` event.

```ts
const dispute = disputes.dispute(contractAddress);
```

## Reading dispute state

```ts
const info = await dispute.read();

console.log(info.state);
console.log(info.owner);
console.log(info.providerDisputeId);
console.log(info.numberOfRulingOptions);
```

## Submitting evidence

> **Building the evidence document?** Consider using [`@rakelabs/evidence-publisher`](https://www.npmjs.com/package/@rakelabs/evidence-publisher). It handles ERC-1497 evidence construction, IPFS publication, and remote pinning. If you're using Kleros' own SDKs, they may also have tooling for this.

```ts
const tx = dispute.submitEvidence(
  'ipfs://QmYourEvidenceDocument'
);

await signer.sendTransaction(tx);
```

## Reading evidence

```ts
const timeline = await dispute.getEvidenceTimeline(
  0,
  'latest'
);

for (const item of timeline) {
  console.log(
    item.submittedAt,
    item.submitter,
    item.evidenceUri
  );
}
```

## Prepared Transactions

All state-changing SDK methods return a `PreparedTx`. Each one includes a `preview` field with a human-readable summary -- show it to users before they sign so they know exactly what they are approving.

```ts
const { tx } = await disputes.factory.prepareCreateDispute(params);
console.log(tx.preview);
// {
//   action: 'Create Dispute',
//   description: 'Deploy a new dispute contract...',
//   fees: { totalFeeWei: '16200000000000000', items: [...] },
//   details: { 'Dispute ID': '0x...', 'Ruling options': '3' },
// }
```

Examples: prepareCreateDispute(...), submitEvidence(...), appeal(...), amendMetaEvidence(...)

The SDK only builds transaction requests.

Your application is responsible for sending them using a wallet, signer, relayer, or account abstraction system.

## Dispute IDs

Dispute IDs are application-level identifiers.

You can provide your own IDs:

* UUIDs
* Order IDs
* Escrow IDs
* Payment IDs
* Internal database IDs

The factory includes a UUID generator for convenience.

The dispute contract address is still the canonical on-chain identifier and should be stored by your application.

## Arbitrator Extra Data

Kleros uses `extraData` to decide:

* Which court hears the dispute.
* The minimum number of jurors.

```ts
import {
  buildArbitratorExtraData,
  parseArbitratorExtraData
} from '@rakelabs/disputes-sdk';

const extraData =
  buildArbitratorExtraData(0, 3);

const decoded =
  parseArbitratorExtraData(extraData);

console.log(decoded.subcourtId);
console.log(decoded.minJurors);
```

## Events

The SDK includes helpers for decoding dispute events.

```ts
import {
  DisputeEvents,
  TOPIC_DISPUTE_CREATED
} from '@rakelabs/disputes-sdk';

const events = new DisputeEvents();

const decoded =
  events.tryDecodeDisputeCreated(rawLog);
```

## Using the Evidence SDK

Evidence is usually stored as an ERC-1497 document.

The companion package helps create and publish evidence documents.

```ts
import {
  createEvidencePublisher
} from '@rakelabs/evidence-sdk';

const publisher =
  await createEvidencePublisher({
    /* config */
  });

const { uri } = await publisher.publish({
  name: 'Evidence',
  description: 'Screenshots and logs',
  fileUris: []
});

await signer.sendTransaction(
  dispute.submitEvidence(uri)
);
```

## Decoding revert errors

When a transaction reverts on-chain, `decodeDisputeError` turns the raw hex into a readable error name.

```ts
import { decodeDisputeError } from '@rakelabs/disputes-sdk';

try {
  await signer.sendTransaction({ ...tx, value: BigInt(tx.value) });
} catch (err) {
  const decoded = decodeDisputeError(err);
  if (decoded && 'error' in decoded) {
    showToast(`Transaction reverted: ${decoded.error}`);
  }
}
```

Full reference: [docs/error-decoder.md](docs/error-decoder.md).

## Further Reading

| Document          | Description                           |
| ----------------- | ------------------------------------- |
| docs/reference.md | API reference and examples            |
| docs/error-decoder.md | `decodeDisputeError` reference    |
| docs/advanced.md  | Advanced usage and factory operations |

## Smart Contract Disclosure

**This software deploys autonomous, immutable contracts. The author has zero administrative control over your balance or deployed contract. Every transaction includes a human-readable preview -- check it before signing to verify exactly what you are approving. Please be careful when transacting with others. Users interact with this software entirely at their own risk.**