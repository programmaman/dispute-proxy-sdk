// ─── Arbitrator extraData ────────────────────────────────────
export { buildArbitratorExtraData, parseArbitratorExtraData } from './common/ArbitratorExtraData.js';
export { MainnetCourts } from './common/KlerosCourts.js';
export { extraData } from './common/extraData.js';

// ─── Main entry point ────────────────────────────────────────
export { Disputes, FactoryHandle } from './Disputes.js';
export type { DisputeSdkConfig } from './Disputes.js';

// ─── Individual Dispute handle ───────────────────────────────
export { Dispute } from './Dispute.js';

// ─── Transaction builder ─────────────────────────────────────
export { DisputeTxBuilder } from './DisputeTxBuilder.js';
export type { DisputesConfig, CreateDisputeParams, CreateCrowdfundableDisputeParams, DisputeActionParams, SubmitEvidenceParams, AmendMetaEvidenceParams, AppealParams } from './DisputeTxBuilder.js';

// ─── Reader ──────────────────────────────────────────────────
export { DisputeReader } from './DisputeReader.js';

// ─── Events ──────────────────────────────────────────────────
export { DisputeEvents, DisputeTopics, TOPIC_DISPUTE_CREATED, TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED, TOPIC_PROVIDER_DISPUTE_CREATED, TOPIC_RULING_ISSUED, TOPIC_EVIDENCE } from './DisputeEvents.js';

// ─── Types & state ───────────────────────────────────────────
export { DisputeState, DisputeType } from './types.js';
export type {
    FactoryInfo,
    DisputeInfo,
    CostEstimate,
    RulingResult,
    EnrichedEvidenceEvent,
    DisputeCreatedEvent,
    CrowdfundableDisputeDeployedEvent,
    ProviderDisputeCreatedEvent,
    RulingIssuedEvent,
    DisputeEvidenceEvent,
    DisputeEvent,
    DisputeImplementationInfo,
    PrepareCreateResult,
    EvmLog,
} from './types.js';

// ─── Common utilities ────────────────────────────────────────
export type { PreparedTx } from './common/PreparedTx.js';
export type { SigningPreview, FeeBreakdown, FeeLineItem } from './common/TxPreview.js';
export { IdGenerator, requireAddress, uuidToBytes32Hex, bytes32HexToUuid, ZERO_ADDRESS, buildFeeBreakdown, formatUnixSec } from './common/index.js';

// ─── Multicall ───────────────────────────────────────────────
export type { MulticallConfig } from './multicall.js';

// ─── Error decoder ───────────────────────────────────────────
export { decodeDisputeError } from './error-decoder.js';
export type { DecodedRevert } from './error-decoder.js';

// ─── Deployments ─────────────────────────────────────────────
export { getFactoryAddress, listDeployments, MAINNET } from './deployments.js';
