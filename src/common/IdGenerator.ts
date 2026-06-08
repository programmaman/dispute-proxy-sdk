/**
 * A globally distributed unique ID generator.
 * Uses the Web Crypto API (`globalThis.crypto`) which is available in Node 18+, all modern browsers,
 * and Cloudflare Workers — no Node-specific imports needed.
 */
export class IdGenerator {
    private static readonly BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

    public static generateOnChainIdHex(): string {
        const bytes = new Uint8Array(32);
        globalThis.crypto.getRandomValues(bytes);
        return '0x' + Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
    }

    public static generateOnChainIdBytes(): Uint8Array {
        const bytes = new Uint8Array(32);
        globalThis.crypto.getRandomValues(bytes);
        return bytes;
    }

    public static generateFriendlyId(prefix: string = "", length: number = 16): string {
        const bytes = new Uint8Array(length);
        globalThis.crypto.getRandomValues(bytes);
        let result = prefix;
        for (let i = 0; i < length; i++) {
            result += IdGenerator.BASE62[bytes[i] % IdGenerator.BASE62.length];
        }
        return result;
    }
}
