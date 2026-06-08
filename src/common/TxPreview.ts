export interface FeeLineItem {
    label: string;
    amountWei: string;
    token: string;
}

export interface FeeBreakdown {
    token: string;
    items: FeeLineItem[];
    totalFeeWei: string;
}

export interface SigningPreview {
    action: string;
    signer: string;
    description: string;
    valueWei?: string;
    token?: string;
    tokenAmountWei?: string;
    fees?: FeeBreakdown;
    details?: Record<string, string>;
}

export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export function buildFeeBreakdown(
    token: string,
    entries: ReadonlyArray<[label: string, amountWei: bigint]>,
): FeeBreakdown {
    const items: FeeLineItem[] = entries.map(([label, amountWei]) => ({
        label,
        amountWei: amountWei.toString(),
        token,
    }));
    const total = entries.reduce((acc, [, v]) => acc + v, 0n);
    return { token, items, totalFeeWei: total.toString() };
}

export function formatUnixSec(unixSec: bigint): string {
    const d = new Date(Number(unixSec) * 1000);
    const iso = d.toISOString().replace(/\.\d{3}Z$/, 'Z');
    const now = Date.now();
    const diffMs = Number(unixSec) * 1000 - now;
    if (diffMs < 0) return `${iso} (past)`;
    const days = Math.floor(diffMs / 86400000);
    if (days > 365) { const years = Math.floor(days / 365); return `${iso} (in ~${years} year${years !== 1 ? 's' : ''})`; }
    if (days > 30) { const months = Math.floor(days / 30); return `${iso} (in ~${months} month${months !== 1 ? 's' : ''})`; }
    if (days > 0) return `${iso} (in ${days} day${days !== 1 ? 's' : ''})`;
    const hours = Math.floor(diffMs / 3600000);
    if (hours > 0) return `${iso} (in ${hours} hour${hours !== 1 ? 's' : ''})`;
    const mins = Math.floor(diffMs / 60000);
    return `${iso} (in ${mins} minute${mins !== 1 ? 's' : ''})`;
}
