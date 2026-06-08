import { id as ethersId } from 'ethers';
import { matchesTopic, type EvmLog } from './common/index.js';
import type {
    DisputeCreatedEvent,
    CrowdfundableDisputeDeployedEvent,
    ProviderDisputeCreatedEvent,
    RulingIssuedEvent,
    DisputeEvidenceEvent,
} from './types.js';
import { DisputeFactory__factory, Dispute__factory } from '../generated/typechain/index.js';

const factoryIface = DisputeFactory__factory.createInterface();
const disputeIface = Dispute__factory.createInterface();

// ─── Event topics ─────────────────────────────────────────────────────────────

export const TOPIC_DISPUTE_CREATED                 = ethersId('DisputeCreated(bytes32,address,address)');
export const TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED  = ethersId('CrowdfundableDisputeDeployed(bytes32,address,address)');
export const TOPIC_PROVIDER_DISPUTE_CREATED        = ethersId('DisputeCreated(address,uint256)');
export const TOPIC_RULING_ISSUED                   = ethersId('RulingIssued(uint256,uint256)');
export const TOPIC_EVIDENCE                        = ethersId('Evidence(address,uint256,address,string)');

export const DisputeTopics = {
    DISPUTE_CREATED:                TOPIC_DISPUTE_CREATED,
    CROWDFUNDABLE_DISPUTE_DEPLOYED: TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED,
    PROVIDER_DISPUTE_CREATED:       TOPIC_PROVIDER_DISPUTE_CREATED,
    RULING_ISSUED:                  TOPIC_RULING_ISSUED,
    EVIDENCE:                       TOPIC_EVIDENCE,
} as const;

/**
 * Stateless log decoder for DisputeFactory and Dispute events.
 */
export class DisputeEvents {

    // ─── Factory events ───────────────────────────────────────────────────────

    tryDecodeDisputeCreated(log: EvmLog): DisputeCreatedEvent | undefined {
        if (!matchesTopic(log, TOPIC_DISPUTE_CREATED)) return undefined;
        const parsed = factoryIface.parseLog({ topics: log.topics as string[], data: log.data })!;
        return {
            disputeId:       parsed.args.id       as string,
            instance:        parsed.args.instance as string,
            owner:           parsed.args.owner    as string,
            logAddress:      log.address,
            transactionHash: log.transactionHash,
        };
    }

    tryDecodeCrowdfundableDisputeDeployed(log: EvmLog): CrowdfundableDisputeDeployedEvent | undefined {
        if (!matchesTopic(log, TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED)) return undefined;
        const parsed = factoryIface.parseLog({ topics: log.topics as string[], data: log.data })!;
        return {
            disputeId:       parsed.args.id       as string,
            instance:        parsed.args.instance as string,
            owner:           parsed.args.owner    as string,
            logAddress:      log.address,
            transactionHash: log.transactionHash,
        };
    }

    // ─── Clone events ─────────────────────────────────────────────────────────

    tryDecodeProviderDisputeCreated(log: EvmLog): ProviderDisputeCreatedEvent | undefined {
        if (!matchesTopic(log, TOPIC_PROVIDER_DISPUTE_CREATED)) return undefined;
        const parsed = disputeIface.parseLog({ topics: log.topics as string[], data: log.data })!;
        return {
            owner:           parsed.args.owner            as string,
            providerDisputeId: parsed.args.providerDisputeId as bigint,
            logAddress:      log.address,
            transactionHash: log.transactionHash,
        };
    }

    tryDecodeRulingIssued(log: EvmLog): RulingIssuedEvent | undefined {
        if (!matchesTopic(log, TOPIC_RULING_ISSUED)) return undefined;
        const parsed = disputeIface.parseLog({ topics: log.topics as string[], data: log.data })!;
        return {
            providerDisputeId: parsed.args.providerDisputeId as bigint,
            ruling:            parsed.args.ruling            as bigint,
            logAddress:        log.address,
            transactionHash:   log.transactionHash,
        };
    }

    tryDecodeEvidence(log: EvmLog): DisputeEvidenceEvent | undefined {
        if (!matchesTopic(log, TOPIC_EVIDENCE)) return undefined;
        const parsed = disputeIface.parseLog({ topics: log.topics as string[], data: log.data })!;
        return {
            arbitrator:       parsed.args._arbitrator      as string,
            evidenceGroupId:  parsed.args._evidenceGroupID as bigint,
            party:            parsed.args._party           as string,
            evidenceUri:      parsed.args._evidence        as string,
            logAddress:       log.address,
            transactionHash:  log.transactionHash,
        };
    }
}
