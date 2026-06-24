import { Contract, type AbstractProvider } from 'ethers';

const MULTICALL3_ABI = [
    'function aggregate3(tuple(address target, bool allowFailure, bytes callData)[] calls) ' +
    'view returns (tuple(bool success, bytes returnData)[] returnData)',
] as const;

export interface MulticallConfig {
    address: string;
    requireSuccess?: boolean;
}

export interface EncodedReadCall<T = unknown> {
    target: string;
    method: string;
    callData: string;
    decode: (returnData: string) => T;
}

export async function executeMulticall<T>(
    provider: AbstractProvider,
    multicallAddress: string,
    calls: EncodedReadCall<T>[],
    requireSuccess = true,
): Promise<T[]> {
    if (calls.length === 0) return [];

    const contract = new Contract(multicallAddress, MULTICALL3_ABI, provider);

    const batch = calls.map(c => ({
        target:        c.target,
        allowFailure:  true,
        callData:      c.callData,
    }));

    const rawResults: Array<{ success: boolean; returnData: string }> =
        await (contract.aggregate3)(batch);

    return rawResults.map((r, i) => {
        const c = calls[i];
        if (!r.success && requireSuccess) {
            throw new Error(
                `Multicall3 call failed — method="${c.method}" target=${c.target}`,
            );
        }
        return c.decode(r.returnData);
    });
}
