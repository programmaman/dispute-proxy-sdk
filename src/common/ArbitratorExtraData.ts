/**
 * Build a 0x-prefixed hex string encoding `(subcourtID, minJurors)`
 * for use as Kleros Liquid arbitrator extraData.
 *
 * @param subcourtId  Kleros Liquid court ID (0 = General Court)
 * @param minJurors   Minimum number of jurors (default 3)
 * @returns 0x-prefixed 128-char hex string (64 bytes)
 */
export function buildArbitratorExtraData(
    subcourtId: number | bigint,
    minJurors: number | bigint = 3,
): string {
    const courtHex = BigInt(subcourtId).toString(16).padStart(64, '0');
    const jurorHex = BigInt(minJurors).toString(16).padStart(64, '0');
    return `0x${courtHex}${jurorHex}`;
}

/**
 * Decode a 0x-prefixed arbitrator extraData hex string back into
 * `{ subcourtId, minJurors }`.
 *
 * @param extraData  0x-prefixed 128+ char hex string
 * @returns `{ subcourtId, minJurors }` as bigint values
 *
 * @example
 *   parseArbitratorExtraData("0x0000…00000000…0003")
 *   // => { subcourtId: 0n, minJurors: 3n }
 */
export function parseArbitratorExtraData(extraData: string): {
    subcourtId: bigint;
    minJurors: bigint;
} {
    const hex = extraData.startsWith('0x') || extraData.startsWith('0X')
        ? extraData.slice(2)
        : extraData;
    if (hex.length < 128) {
        throw new Error(
            `extraData too short: got ${hex.length} hex chars, expected at least 128`,
        );
    }
    return {
        subcourtId: BigInt('0x' + hex.slice(0, 64)),
        minJurors: BigInt('0x' + hex.slice(64, 128)),
    };
}
