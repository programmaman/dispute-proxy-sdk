import { matchesTopic, type EvmLog } from './common/index.js';
import type { AbiCodec, Hex } from './common/AbiCodec.js';
import { EVENT_TOPICS } from './abi.js';
import type {
    DisputeCreatedEvent,
    CrowdfundableDisputeDeployedEvent,
    ProviderDisputeCreatedEvent,
    RulingIssuedEvent,
    DisputeEvidenceEvent,
} from './types.js';

const DISPUTE_CREATED = 'DisputeCreated(bytes32,address,address)';
const CROWDFUNDABLE_DISPUTE_DEPLOYED = 'CrowdfundableDisputeDeployed(bytes32,address,address)';
const PROVIDER_DISPUTE_CREATED = 'DisputeCreated(address,uint256)';
const RULING_ISSUED = 'RulingIssued(uint256,uint256)';
const EVIDENCE = 'Evidence(address,uint256,address,string)';

export const TOPIC_DISPUTE_CREATED = EVENT_TOPICS.DisputeCreated;
export const TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED = EVENT_TOPICS.CrowdfundableDisputeDeployed;
export const TOPIC_PROVIDER_DISPUTE_CREATED = EVENT_TOPICS.ProviderDisputeCreated;
export const TOPIC_RULING_ISSUED = EVENT_TOPICS.RulingIssued;
export const TOPIC_EVIDENCE = EVENT_TOPICS.Evidence;

export const DisputeTopics = {
    DISPUTE_CREATED: TOPIC_DISPUTE_CREATED,
    CROWDFUNDABLE_DISPUTE_DEPLOYED: TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED,
    PROVIDER_DISPUTE_CREATED: TOPIC_PROVIDER_DISPUTE_CREATED,
    RULING_ISSUED: TOPIC_RULING_ISSUED,
    EVIDENCE: TOPIC_EVIDENCE,
} as const;

export class DisputeEvents {
    constructor(private readonly codec: AbiCodec) {}

    tryDecodeDisputeCreated(log: EvmLog): DisputeCreatedEvent | undefined {
        if (!matchesTopic(log, TOPIC_DISPUTE_CREATED)) return undefined;
        const event = this.codec.decodeEvent(DISPUTE_CREATED, log.topics as Hex[], log.data as Hex);
        return {
            disputeId: event.id as string,
            instance: event.instance as string,
            owner: event.owner as string,
            logAddress: log.address,
            transactionHash: log.transactionHash,
        };
    }

    tryDecodeCrowdfundableDisputeDeployed(log: EvmLog): CrowdfundableDisputeDeployedEvent | undefined {
        if (!matchesTopic(log, TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED)) return undefined;
        const event = this.codec.decodeEvent(CROWDFUNDABLE_DISPUTE_DEPLOYED, log.topics as Hex[], log.data as Hex);
        return {
            disputeId: event.id as string,
            instance: event.instance as string,
            owner: event.owner as string,
            logAddress: log.address,
            transactionHash: log.transactionHash,
        };
    }

    tryDecodeProviderDisputeCreated(log: EvmLog): ProviderDisputeCreatedEvent | undefined {
        if (!matchesTopic(log, TOPIC_PROVIDER_DISPUTE_CREATED)) return undefined;
        const event = this.codec.decodeEvent(PROVIDER_DISPUTE_CREATED, log.topics as Hex[], log.data as Hex);
        return {
            owner: event.owner as string,
            providerDisputeId: event.providerDisputeId as bigint,
            logAddress: log.address,
            transactionHash: log.transactionHash,
        };
    }

    tryDecodeRulingIssued(log: EvmLog): RulingIssuedEvent | undefined {
        if (!matchesTopic(log, TOPIC_RULING_ISSUED)) return undefined;
        const event = this.codec.decodeEvent(RULING_ISSUED, log.topics as Hex[], log.data as Hex);
        return {
            providerDisputeId: event.providerDisputeId as bigint,
            ruling: event.ruling as bigint,
            logAddress: log.address,
            transactionHash: log.transactionHash,
        };
    }

    tryDecodeEvidence(log: EvmLog): DisputeEvidenceEvent | undefined {
        if (!matchesTopic(log, TOPIC_EVIDENCE)) return undefined;
        const event = this.codec.decodeEvent(EVIDENCE, log.topics as Hex[], log.data as Hex);
        return {
            arbitrator: event._arbitrator as string,
            evidenceGroupId: event._evidenceGroupId as bigint,
            party: event._party as string,
            evidenceUri: event._evidence as string,
            logAddress: log.address,
            transactionHash: log.transactionHash,
        };
    }
}
