import type {
    AppealPeriod,
    DisputeInfo,
    DisputeState,
} from '../types.js';

/**
 * Shared callable read API used by both the unbound reader and a bound dispute.
 * `DisputeArgs` is either `[disputeAddress]` or `[]` when the address is already bound.
 */
export interface DisputeReadable<
    DisputeArgs extends [] | [disputeAddress: string],
> {
    (...args: DisputeArgs): Promise<DisputeInfo>;
    state(...args: DisputeArgs): Promise<DisputeState>;
    owner(...args: DisputeArgs): Promise<string>;
    arbitrator(...args: DisputeArgs): Promise<string>;
    arbitratorExtraData(...args: DisputeArgs): Promise<string>;
    providerDisputeId(...args: DisputeArgs): Promise<bigint>;
    numberOfRulingOptions(...args: DisputeArgs): Promise<bigint>;
    ruling(...args: DisputeArgs): Promise<bigint>;
    isRuled(...args: DisputeArgs): Promise<boolean>;
    evidenceSubmitted(...args: DisputeArgs): Promise<boolean>;
    arbitrationCost(...args: DisputeArgs): Promise<bigint>;
    appealCost(...args: DisputeArgs): Promise<bigint>;
    appealPeriod(...args: DisputeArgs): Promise<AppealPeriod>;
}
