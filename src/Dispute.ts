import type { AbstractProvider } from 'ethers';
import type { PreparedTx } from './common/index.js';
import type {
    EnrichedEvidenceEvent,
    DisputeEvent,
} from './types.js';
import type { DisputesConfig } from './DisputeTxBuilder.js';
import type { DisputeReadable } from './internal/DisputeReadable.js';
import { DisputeReader } from './DisputeReader.js';
import { DisputeTxBuilder } from './DisputeTxBuilder.js';
import { DisputeEvents, TOPIC_EVIDENCE } from './DisputeEvents.js';

/**
 * A handle bound to a specific deployed Dispute clone.
 *
 * Obtained via `Disputes.dispute(address)` — construction is free (no network call).
 *
 * Read methods are async (eth_call). Write methods return unsigned PreparedTx.
 */
export class Dispute {
    readonly read: DisputeReadable<[]>;

    constructor(
        /** On-chain address of this Dispute clone. */
        readonly address: string,
        private readonly cfg:      DisputesConfig,
        private readonly reader:   DisputeReader,
        private readonly builder:  DisputeTxBuilder,
        private readonly decoder:  DisputeEvents,
        private readonly provider: AbstractProvider,
        private readonly walletAddress?: string,
    ) {
        this.read = Object.assign(
            () => this.reader.readDispute(this.address),
            {
                state: () => this.reader.readDispute.state(this.address),
                owner: () => this.reader.readDispute.owner(this.address),
                arbitrator: () => this.reader.readDispute.arbitrator(this.address),
                arbitratorExtraData: () =>
                    this.reader.readDispute.arbitratorExtraData(this.address),
                providerDisputeId: () =>
                    this.reader.readDispute.providerDisputeId(this.address),
                numberOfRulingOptions: () =>
                    this.reader.readDispute.numberOfRulingOptions(this.address),
                ruling: () => this.reader.readDispute.ruling(this.address),
                isRuled: () => this.reader.readDispute.isRuled(this.address),
                evidenceSubmitted: () =>
                    this.reader.readDispute.evidenceSubmitted(this.address),
                arbitrationCost: () =>
                    this.reader.readDispute.arbitrationCost(this.address),
                appealCost: () => this.reader.readDispute.appealCost(this.address),
                appealPeriod: () =>
                    this.reader.readDispute.appealPeriod(this.address),
            },
        );
    }

    // ─── Reads ────────────────────────────────────────────────────────────────

    /** Current Kleros arbitration cost in wei. */
    arbitrationCost(): Promise<bigint> {
        return this.reader.readArbitrationCost(this.address);
    }

    /** Current Kleros appeal cost in wei. Throws if already ruled. */
    appealCost(): Promise<bigint> {
        return this.reader.readAppealCost(this.address);
    }

    /** Current appeal window. */
    appealPeriod(): Promise<{ start: bigint; end: bigint }> {
        return this.reader.readAppealPeriod(this.address);
    }

    // ─── Lifecycle writes ─────────────────────────────────────────────────────

    /** Submit an evidence URI to Kleros arbitration. */
    submitEvidence(evidenceUri: string, wallet?: string): PreparedTx {
        return this.builder.submitEvidence(this.cfg, {
            callerWallet:  this.resolveWallet(wallet),
            disputeAddress: this.address,
            evidenceUri,
        });
    }

    /** Amend the meta-evidence URI (before any evidence is submitted). */
    amendMetaEvidence(newUri: string, wallet?: string): PreparedTx {
        return this.builder.amendMetaEvidence(this.cfg, {
            callerWallet:  this.resolveWallet(wallet),
            disputeAddress: this.address,
            newUri,
        });
    }

    /** Appeal a Kleros ruling. */
    appeal(arbitratorExtraData: string, appealFeeWei: bigint, wallet?: string): PreparedTx {
        return this.builder.appeal(this.cfg, {
            callerWallet:       this.resolveWallet(wallet),
            disputeAddress:     this.address,
            arbitratorExtraData,
            appealFeeWei,
        });
    }

    /** Rescue trapped ETH after the dispute has been ruled on. */
    rescueEth(wallet?: string): PreparedTx {
        return this.builder.rescueEth(this.cfg, {
            callerWallet:  this.resolveWallet(wallet),
            disputeAddress: this.address,
        });
    }

    // ─── Event history ─────────────────────────────────────────────────────────

    /**
     * Fetches all events emitted by this dispute clone.
     */
    async getLogs(
        fromBlock: number | 'earliest' = 0,
        toBlock:   number | 'latest'   = 'latest',
    ): Promise<DisputeEvent[]> {
        const rawLogs = await this.provider.getLogs({
            address:  this.address,
            fromBlock,
            toBlock,
        });

        return rawLogs.flatMap(log => {
            const evmLog = { address: log.address, topics: log.topics, data: log.data, transactionHash: log.transactionHash };
            const decoded = this.decoder.tryDecodeProviderDisputeCreated(evmLog)
                ?? this.decoder.tryDecodeRulingIssued(evmLog)
                ?? this.decoder.tryDecodeEvidence(evmLog);
            return decoded ? [decoded] : [];
        });
    }

    /**
     * Fetches all Evidence events enriched with block timestamps.
     *
     * This is the bank-friendly interface — each entry includes the
     * block timestamp so you can prove submission timing.
     */
    async getEvidenceTimeline(
        fromBlock: number | 'earliest' = 0,
        toBlock:   number | 'latest'   = 'latest',
    ): Promise<EnrichedEvidenceEvent[]> {
        const rawLogs = await this.provider.getLogs({
            address:  this.address,
            topics:   [TOPIC_EVIDENCE],
            fromBlock,
            toBlock,
        });

        // Fetch block metadata for each log to get timestamps
        const blockNumbers = [...new Set(rawLogs.map(l => l.blockNumber))];
        const blocks = await Promise.all(
            blockNumbers.map(bn => this.provider.getBlock(bn)),
        );
        const blockMap = new Map<number, number>();
        for (const block of blocks) {
            if (block) blockMap.set(block.number, block.timestamp);
        }

        return rawLogs.flatMap(log => {
            const evmLog = { address: log.address, topics: log.topics, data: log.data, transactionHash: log.transactionHash };
            const decoded = this.decoder.tryDecodeEvidence(evmLog);
            if (!decoded) return [];
            const ts = blockMap.get(log.blockNumber) ?? 0;
            return [{
                ...decoded,
                submittedAt: new Date(Number(ts) * 1000),
                blockNumber: log.blockNumber,
            }];
        });
    }

    // ─── Internals ─────────────────────────────────────────────────────────

    private resolveWallet(override?: string): string {
        const w = override ?? this.walletAddress;
        if (!w) throw new Error(
            'walletAddress is required — pass it to new Disputes({ walletAddress }) or as the last argument to this method.',
        );
        return w;
    }
}
