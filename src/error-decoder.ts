import { Interface } from 'ethers';

export type DecodedRevert =
  | { error: string; args: Record<string, unknown> }
  | { raw: string };

const HEX_DATA_RE = /^0x(?:[0-9a-fA-F]{2})*$/;

function isHexData(value: unknown): value is string {
  return typeof value === 'string' && HEX_DATA_RE.test(value);
}

function readRevertData(value: unknown, seen: Set<object>, depth: number): string | null {
  if (value == null || depth > 8) return null;
  if (isHexData(value)) return value;

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = readRevertData(item, seen, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof value !== 'object') return null;

  const objectValue = value as Record<string, unknown>;
  if (seen.has(objectValue)) return null;
  seen.add(objectValue);

  for (const key of ['data', 'error', 'info', 'cause', 'originalError', 'response'] as const) {
    const found = readRevertData(objectValue[key], seen, depth + 1);
    if (found) return found;
  }

  return null;
}

function extractRevertData(err: unknown): string | null {
  return readRevertData(err, new Set<object>(), 0);
}

function toDecodedArgs(decoded: { fragment: { inputs: readonly { name?: string }[] }; args: readonly unknown[] }): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  decoded.fragment.inputs.forEach((input, index) => {
    const key = input.name && input.name.length > 0 ? input.name : String(index);
    args[key] = decoded.args[index];
  });
  return args;
}

const ERROR_IFACE = new Interface([
  // Clone-level errors
  'error ZeroAddress()',
  'error NotOwner()',
  'error EmptyURI()',
  'error InvalidNumberOfRulingOptions()',
  'error NotArbitrator()',
  'error AlreadyRuled()',
  'error InvalidRuling(uint256 ruling, uint256 max)',
  'error DisputeNotFound(uint256 providerDisputeId)',
  'error TransferFailed()',
  'error NotEnoughFee(uint256 sent, uint256 required)',
  'error AppealWindowNotOpen()',
  'error NotFactory()',
  'error AlreadySubmitted()',
  'error ActiveDispute()',
  // Factory-level user-facing errors
  'error InvalidDisputeId()',
  'error DisputeAlreadyExists(bytes32 id)',
]);

export function decodeDisputeError(err: unknown): DecodedRevert | null {
  const data = extractRevertData(err);
  if (!data) return null;

  try {
    const decoded = ERROR_IFACE.parseError(data);
    if (!decoded) return { raw: data };

    return {
      error: decoded.name,
      args: toDecodedArgs(decoded),
    };
  } catch {
    return { raw: data };
  }
}
