# Advanced

Power-user features not covered in the happy path.

## Using the transaction builder directly

The `DisputeTxBuilder` is the stateless core. It encodes calldata from typed parameters and returns a `PreparedTx`. Use it directly if you don't need the high-level `Disputes` facade.

```ts
import { DisputeTxBuilder, buildArbitratorExtraData } from '@rakelabs/disputes-sdk';

const builder = new DisputeTxBuilder();

const cfg = { chainId: 11155111, factoryAddress: '0x...' };

// Create a standard dispute
const tx = builder.createDispute(cfg, {
  callerWallet:          '0xUSER...',
  disputeId:             '0x' + '22'.repeat(32),
  arbitratorExtraData:   buildArbitratorExtraData(0, 3),
  metaEvidenceUri:       'ipfs://QmMeta',
  numberOfRulingOptions: 3n,
  creationFee:           0n,
  arbFee:                3n,
});

// Submit evidence
const evidenceTx = builder.submitEvidence(cfg, {
  callerWallet:   '0xUSER...',
  disputeAddress: '0xDISP...',
  evidenceUri:    'ipfs://QmEvidence',
});

// Appeal
const appealTx = builder.appeal(cfg, {
  callerWallet:       '0xUSER...',
  disputeAddress:     '0xDISP...',
  arbitratorExtraData: '0x',
  appealFeeWei:       100000000000000000n,
});
```

### Builder methods

| Method | Description |
|--------|-------------|
| `createDispute(cfg, params)` | Standard dispute create tx. |
| `createCrowdfundableDispute(cfg, params)` | Crowdfundable dispute create tx. |
| `submitEvidence(cfg, params)` | Submit evidence to arbitrator. |
| `amendMetaEvidence(cfg, params)` | Correct meta-evidence URI (owner-only). |
| `appeal(cfg, params)` | Appeal a ruling. |
| `rescueEth(cfg, params)` | Rescue trapped ETH after ruling. |

With pinned implementation:

```ts
const tx = builder.createDispute(cfg, {
  ...params,
  impl: '0xPINNED_IMPL_ADDRESS',
});
```

## Using the reader directly

`DisputeReader` performs raw `eth_call` reads. Use it when you don't want the `Disputes` facade.

```ts
import { DisputeReader } from '@rakelabs/disputes-sdk';
import { JsonRpcProvider } from 'ethers';

const reader = new DisputeReader(new JsonRpcProvider('...'));

const config = await reader.readFactory('0xFACTORY...');
const info   = await reader.readDispute('0xDISPUTE...');
const cost   = await reader.estimateCost('0xFACTORY...', extraData);
const addr   = await reader.predictDisputeAddress('0xFACTORY...', req, undefined, callerAddr);
```

## Factory enumeration

List all registered dispute implementations:

```ts
const dCount = await disputes.factory.disputeImplCount();
for (let i = 0; i < dCount; i++) {
  // No implAt reader yet. Read via raw call:
  const raw = await provider.call({
    to: factoryAddress,
    data: iface.encodeFunctionData('disputeImplementationAt', [i]),
  });
}
```

## Event log filtering

Use `DisputeEvents` to decode raw EVM logs:

```ts
import { DisputeEvents, TOPIC_DISPUTE_CREATED } from '@rakelabs/disputes-sdk';

const events = new DisputeEvents();

const rawLogs = await provider.getLogs({
  address:   factoryAddress,
  topics:    [TOPIC_DISPUTE_CREATED],
  fromBlock: 0,
  toBlock:   'latest',
});

for (const log of rawLogs) {
  const decoded = events.tryDecodeDisputeCreated({
    address: log.address,
    topics: log.topics as string[],
    data: log.data,
    transactionHash: log.transactionHash,
  });
  if (decoded) {
    console.log(`Dispute ${decoded.disputeId} → ${decoded.instance}`);
  }
}
```

## Evidence timeline

The `getEvidenceTimeline` method enriches each evidence event with the block timestamp, making it easy to show submission times in a UI:

```ts
const timeline = await dispute.getEvidenceTimeline(0, 'latest');

for (const ev of timeline) {
  console.log(`${ev.submittedAt.toLocaleString()}`);
  console.log(`  Party:  ${ev.party}`);
  console.log(`  URI:    ${ev.evidenceUri}`);
  console.log(`  Block:  ${ev.blockNumber}`);
}
```

## PreparedTx previews

Every transaction includes a `preview` field with a structured fee breakdown and human-readable labels. Use it for wallet confirmation screens:

```ts
const { tx } = await disputes.factory.prepareCreateDispute(params);

console.log(tx.preview);
// {
//   action: 'Create Dispute',
//   signer: 'owner',
//   description: 'Deploy a new dispute contract and submit to Kleros arbitration.',
//   valueWei: '3',
//   fees: {
//     token: '0x0000…0000',
//     items: [
//       { label: 'Creation fee', amountWei: '0' },
//       { label: 'Arbitration fee', amountWei: '3' },
//     ],
//     totalFeeWei: '3',
//   },
//   details: {
//     'Dispute ID': '0x…',
//     'Ruling options': '3',
//     'Meta evidence': 'ipfs://…',
//   },
// }
```

## ID generation

Generate globally unique on-chain dispute IDs:

```ts
import { IdGenerator } from '@rakelabs/disputes-sdk';

// Random bytes32:
const id = IdGenerator.generateOnChainIdHex();
// → '0x7f83…a4b1'

// Human-friendly IDs for internal tracking:
const friendly = IdGenerator.generateFriendlyId('DISP-', 12);
// → 'DISP-8xK2mPq9RfTv'
```
