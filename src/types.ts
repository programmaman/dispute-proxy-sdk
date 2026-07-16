/**
 * Represents the current status of a dispute.
 */
export enum DisputeState {
    PENDING = 0,
    RULED = 1,
}


export enum DisputeType {
    STANDARD = 0,
    CROWDFUNDABLE = 1,
}

/** Appeal window for a dispute. `end == 0n` means no ruling has been issued yet. */
export interface AppealPeriod {
    start: bigint;
    end: bigint;
}

// ─── Reader result types ───────────────────────────────────────────────────────

/** Snapshot of DisputeFactory on-chain config. */
export interface FactoryInfo {
    factoryAddress: string;
    defaultDisputeImpl: string;
    defaultDisputeImplName: string;
    defaultCrowdfundableDisputeImpl: string;
    defaultCrowdfundableDisputeImplName: string;
    arbitrator: string;
    creationFee: bigint;
    feeRecipient: string;
    defaultsProvider: string;
    owner: string;
    pendingOwner: string;
}

/**
 * Snapshot of all on-chain state for a deployed Dispute clone.
 */
export interface DisputeInfo {
    disputeAddress: string;
    state: DisputeState;
    owner: string;
    arbitrator: string;
    arbitratorExtraData: string;
    providerDisputeId: bigint;
    numberOfRulingOptions: bigint;
    ruling: bigint;
    isRuled: boolean;
    evidenceSubmitted: boolean;
}

/**
 * A structured ruling result with label mapping.
 */
export interface RulingResult {
    /** The numeric ruling from on-chain. */
    number: bigint;
    /** True when a ruling has been issued. */
    isRuled: boolean;
}

/**
 * Cost estimate result — multicall-free, two parallel calls.
 */
export interface CostEstimate {
    creationFee: bigint;
    arbitrationCost: bigint;
    total: bigint;
}

/**
 * Evidence entry enriched with block timestamp.
 */
export interface EnrichedEvidenceEvent {
    party: string;
    evidenceGroupId: bigint;
    arbitrator: string;
    evidenceUri: string;
    /** Block timestamp as Date (from block metadata). */
    submittedAt: Date;
    blockNumber: number;
    transactionHash: string | undefined;
}

// ─── Event types ──────────────────────────────────────────────────────────────

/** Decoded DisputeFactory.DisputeCreated event. */
export interface DisputeCreatedEvent {
    disputeId: string; // bytes32 hex
    instance: string;
    owner: string;
    logAddress: string;
    transactionHash: string | undefined;
}

/** Decoded DisputeFactory.CrowdfundableDisputeDeployed event. */
export interface CrowdfundableDisputeDeployedEvent {
    disputeId: string;
    instance: string;
    owner: string;
    logAddress: string;
    transactionHash: string | undefined;
}

/** Decoded Dispute.RulingIssued event. */
export interface RulingIssuedEvent {
    providerDisputeId: bigint;
    ruling: bigint;
    logAddress: string;
    transactionHash: string | undefined;
}

/** Decoded Dispute.DisputeCreated event (clone-level — sets providerDisputeId). */
export interface ProviderDisputeCreatedEvent {
    owner: string;
    providerDisputeId: bigint;
    logAddress: string;
    transactionHash: string | undefined;
}

/** Decoded IEvidence.Evidence event emitted by a dispute clone. */
export interface DisputeEvidenceEvent {
    party: string;
    evidenceGroupId: bigint;
    arbitrator: string;
    evidenceUri: string;
    logAddress: string;
    transactionHash: string | undefined;
}

/** Union of all dispute event types. */
export type DisputeEvent =
    | DisputeCreatedEvent
    | CrowdfundableDisputeDeployedEvent
    | ProviderDisputeCreatedEvent
    | RulingIssuedEvent
    | DisputeEvidenceEvent;

/** A registered dispute implementation entry. */
export interface DisputeImplementationInfo {
    address: string;
    name: string;
}

// ─── Prepare helper types ────────────────────────────────────────────────────

export interface CreateDisputeParams {
    /** bytes32 as 0x-prefixed hex — use IdGenerator.generateOnChainIdHex() */
    disputeId: string;
    arbitratorExtraData: string;
    metaEvidenceUri: string;
    numberOfRulingOptions: bigint;
}

export interface EstimateCostParams {
    arbitratorExtraData: string;
    numberOfRulingOptions: bigint;
}

export interface PrepareCreateResult {
    tx: import('./common/PreparedTx.js').PreparedTx;
    disputeId: string;
    creationFee: bigint;
    arbitrationCost: bigint;
    /** Total ETH value = creationFee + arbitrationCost. */
    totalValue: bigint;
}

export type { EvmLog } from './common/LogUtils.js';
