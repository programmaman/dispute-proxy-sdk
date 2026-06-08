/**
 * Known contract addresses for DisputeFactory deployments.
 */

/** Ethereum Mainnet deployment. */
export const MAINNET = '0xd61221AD7331d0233c50925BbFeF0ef1C891D647';

const KNOWN_DEPLOYMENTS: ReadonlyMap<number, string> = new Map([
    [1, MAINNET],
]);

export function getFactoryAddress(chainId: number): string | undefined {
    return KNOWN_DEPLOYMENTS.get(chainId);
}

export function listDeployments(): ReadonlyArray<{ chainId: number; factoryAddress: string }> {
    return Array.from(KNOWN_DEPLOYMENTS.entries())
        .map(([chainId, factoryAddress]) => ({ chainId, factoryAddress }));
}
