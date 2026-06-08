import { getAddress } from 'ethers';

export function requireAddress(addr: string | null | undefined, name: string): string {
    if (!addr || addr.trim() === '') {
        throw new Error(`${name} must not be blank`);
    }
    const stripped = addr.startsWith('0x') || addr.startsWith('0X') ? addr.slice(2) : addr;
    if (stripped.length !== 40 || !/^[0-9a-fA-F]{40}$/.test(stripped)) {
        throw new Error(`${name} is not a valid 20-byte Ethereum address: ${addr}`);
    }
    return getAddress(addr);
}

export function uuidToBytes32Hex(uuid: string): string {
    const hex = uuid.replace(/-/g, '');
    if (hex.length !== 32 || !/^[0-9a-fA-F]{32}$/.test(hex)) {
        throw new Error(`Not a valid UUID (after stripping dashes must be 32 hex chars): ${uuid}`);
    }
    return '0x' + hex + '0'.repeat(32);
}

export function bytes32HexToUuid(bytes32Hex: string): string {
    const hex = bytes32Hex.startsWith('0x') || bytes32Hex.startsWith('0X') ? bytes32Hex.slice(2) : bytes32Hex;
    if (hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error(`Not a valid bytes32 hex (must be 64 hex chars after 0x): ${bytes32Hex}`);
    }
    const u = hex.slice(0, 32);
    return `${u.slice(0, 8)}-${u.slice(8, 12)}-${u.slice(12, 16)}-${u.slice(16, 20)}-${u.slice(20, 32)}`;
}
