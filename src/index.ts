// ─── Main entry points ─────────────────────────────────────────────────────
export { Disputes, FactoryHandle } from './Disputes.js';
export type { DisputesFromRpcOptions, DisputeSdkConfig } from './Disputes.js';

// ─── Bound Dispute handle ──────────────────────────────────────────────────
export { Dispute } from './Dispute.js';

// ─── Transaction builder ───────────────────────────────────────────────────
export { DisputeTxBuilder } from './DisputeTxBuilder.js';
export type {
    DisputesConfig,
    CreateDisputeParams,
    CreateCrowdfundableDisputeParams,
    DisputeActionParams,
    SubmitEvidenceParams,
    AmendMetaEvidenceParams,
    AppealParams,
} from './DisputeTxBuilder.js';

// ─── Reader ────────────────────────────────────────────────────────────────
export { DisputeReader } from './DisputeReader.js';

// ─── Events ────────────────────────────────────────────────────────────────
export {
    DisputeEvents,
    DisputeTopics,
    TOPIC_DISPUTE_CREATED,
    TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED,
    TOPIC_PROVIDER_DISPUTE_CREATED,
    TOPIC_RULING_ISSUED,
    TOPIC_EVIDENCE,
} from './DisputeEvents.js';

// ─── Types ─────────────────────────────────────────────────────────────────
export { DisputeState, DisputeType } from './types.js';
export type {
    FactoryInfo,
    AppealPeriod,
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

// ─── Common ─────────────────────────────────────────────────────────────────
export type { PreparedTx } from './common/PreparedTx.js';
export type {
    BlockInfo,
    CallRequest,
    LogFilter,
    ReadBlockReference,
    ReadBlockTag,
    RpcClient,
} from './common/RpcClient.js';
export type { AbiCodec, DecodedError, DecodedEvent, Hex } from './common/AbiCodec.js';
export type { SigningPreview, FeeBreakdown, FeeLineItem } from './common/TxPreview.js';
export {
    IdGenerator,
    requireAddress,
    uuidToBytes32Hex,
    bytes32HexToUuid,
    ZERO_ADDRESS,
    buildFeeBreakdown,
    formatUnixSec,
} from './common/index.js';

// ─── Multicall ─────────────────────────────────────────────────────────────
export type { MulticallConfig } from './multicall.js';

// ─── Arbitrator extraData ──────────────────────────────────────────────────
export { buildArbitratorExtraData, parseArbitratorExtraData } from './common/ArbitratorExtraData.js';
export { MainnetCourts } from './common/KlerosCourts.js';
export { extraData } from './common/extraData.js';

// ─── Deployments ────────────────────────────────────────────────────────────
export * as DisputeDeployments from './deployments.js';
export {
    FACTORY_ADDRESS,
    SUPPORTED_CHAIN_IDS,
    isSupportedChainId,
    requireSupportedChainId,
    getFactoryAddress,
    listDeployments,
} from './deployments.js';

// ─── Canonical ABI ──────────────────────────────────────────────────────────
export { ABI, EVENT_TOPICS } from './abi.js';
