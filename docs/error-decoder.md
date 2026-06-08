# Error Decoder

When a transaction reverts on-chain, the wallet throws an error containing raw hex revert data. `decodeDisputeError` turns that into a readable error name and structured arguments.

## Return type

```ts
type DecodedRevert =
  | { error: string; args: Record<string, unknown> }
  | { raw: string }
  | null;
```

## Usage

```ts
import { decodeDisputeError } from '@rakelabs/disputes-sdk';

try {
  await signer.sendTransaction({ ...tx, value: BigInt(tx.value) });
} catch (err) {
  const decoded = decodeDisputeError(err);

  if (decoded && 'error' in decoded) {
    console.error(`Reverted: ${decoded.error}`, decoded.args);
  } else if (decoded && 'raw' in decoded) {
    console.warn('Unknown revert:', decoded.raw.slice(0, 14) + '...');
  } else {
    console.error('Transaction failed:', err);
  }
}
```

## Multi-SDK consumers

```ts
import { decodeDisputeError } from '@rakelabs/disputes-sdk';
import { decodeKlescrowError } from '@rakelabs/klescrow-sdk';
import { decodeDPaymentError } from '@rakelabs/dpayments-sdk';

const decoded = decodeKlescrowError(err)
            ?? decodeDPaymentError(err)
            ?? decodeDisputeError(err);
```
