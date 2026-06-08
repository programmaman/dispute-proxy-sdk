export interface EvmLog {
    address: string;
    topics: readonly string[];
    data: string;
    transactionHash?: string;
}

export function matchesTopic(log: EvmLog, topic0: string): boolean {
    return log.topics.length > 0 &&
        log.topics[0].toLowerCase() === topic0.toLowerCase();
}

export function decodeIndexedAddress(topic: string): string {
    const hex = stripHex(topic);
    if (hex.length !== 64) throw new Error('indexed address topic must be 32 bytes');
    return '0x' + hex.slice(24);
}

export function decodeIndexedBytes32(topic: string): string {
    const hex = stripHex(topic);
    if (hex.length !== 64) throw new Error('indexed bytes32 topic must be 32 bytes');
    return '0x' + hex;
}

export function decodeIndexedUint256(topic: string): bigint {
    const hex = stripHex(topic);
    if (hex.length !== 64) throw new Error('indexed uint256 topic must be 32 bytes');
    return BigInt('0x' + hex);
}

function stripHex(value: string): string {
    return value.startsWith('0x') || value.startsWith('0X')
        ? value.slice(2).toLowerCase()
        : value.toLowerCase();
}
