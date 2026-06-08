import type { AbstractProvider } from 'ethers';
import type { PreparedTx } from './common/PreparedTx.js';
import type {
    FactoryInfo,
    CostEstimate,
    DisputeImplementationInfo,
    DisputeCreatedEvent,
    CrowdfundableDisputeDeployedEvent,
    CreateDisputeParams,
    PrepareCreateResult,
} from './types.js';
import type { DisputesConfig, CreateDisputeParams as TxParams, CreateCrowdfundableDisputeParams } from './DisputeTxBuilder.js';
import { DisputeTxBuilder } from './DisputeTxBuilder.js';
import { DisputeReader } from './DisputeReader.js';
import { DisputeEvents, TOPIC_DISPUTE_CREATED, TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED } from './DisputeEvents.js';
import { Dispute } from './Dispute.js';
import { requireAddress, IdGenerator } from './common/index.js';
import type { MulticallConfig } from './multicall.js';
import { getFactoryAddress, listDeployments } from './deployments.js';

export interface DisputeSdkConfig {
    chainId: number;
    factoryAddress: string;
    provider: AbstractProvider;
    walletAddress?: string;
    multicall?: MulticallConfig;
    impl?: { address: string; name: string };
}

// ─── FactoryHandle ─────────────────────────────────────────────────────────────

export class FactoryHandle {
    constructor(
        private readonly cfg:          DisputesConfig,
        private readonly reader:       DisputeReader,
        private readonly builder:      DisputeTxBuilder,
        private readonly decoder:      DisputeEvents,
        private readonly provider:     AbstractProvider,
        private readonly walletAddress?: string,
        private readonly impl?:        string,
    ) {}

    // ─── Reads ─────────────────────────────────────────────────────────────

    readConfig(): Promise<FactoryInfo> {
        return this.reader.readFactory(this.cfg.factoryAddress);
    }

    creationFee(): Promise<bigint> {
        return this.reader.readCreationFee(this.cfg.factoryAddress);
    }

    /**
     * Quotes the total cost for creating a dispute: creationFee + arbitrationCost.
     */
    estimateCost(arbitratorExtraData: string): Promise<CostEstimate> {
        return this.reader.estimateCost(this.cfg.factoryAddress, arbitratorExtraData);
    }

    /** Number of registered standard dispute implementations. */
    disputeImplCount(): Promise<number> {
        return this.reader.readDisputeImplCount(this.cfg.factoryAddress);
    }

    /** Number of registered crowdfundable dispute implementations. */
    crowdfundableDisputeImplCount(): Promise<number> {
        return this.reader.readCrowdfundableDisputeImplCount(this.cfg.factoryAddress);
    }

    async listImplementations(): Promise<DisputeImplementationInfo[]> {
        const count = await this.reader.readDisputeImplCount(this.cfg.factoryAddress);
        return Promise.all(
            Array.from({ length: count }, (_, i) =>
                this.reader.readDisputeImplAt(this.cfg.factoryAddress, i)),
        );
    }

    async listCrowdfundableImplementations(): Promise<DisputeImplementationInfo[]> {
        const count = await this.reader.readCrowdfundableDisputeImplCount(this.cfg.factoryAddress);
        return Promise.all(
            Array.from({ length: count }, (_, i) =>
                this.reader.readCrowdfundableImplAt(this.cfg.factoryAddress, i)),
        );
    }

    predictAddress(
        req: { id: string; arbitratorExtraData: string; numberOfRulingOptions: bigint; metaEvidenceUri: string },
        caller?: string,
    ): Promise<string> {
        return this.reader.predictDisputeAddress(this.cfg.factoryAddress, req, this.impl, caller);
    }

    // ─── Writes ────────────────────────────────────────────────────────────

    createDispute(p: Omit<TxParams, 'callerWallet'>, wallet?: string): PreparedTx {
        return this.builder.createDispute(this.cfg, {
            ...p,
            callerWallet: this.resolveWallet(wallet),
            impl: this.impl,
        });
    }

    createCrowdfundableDispute(p: Omit<CreateCrowdfundableDisputeParams, 'callerWallet'>, wallet?: string): PreparedTx {
        return this.builder.createCrowdfundableDispute(this.cfg, {
            ...p,
            callerWallet: this.resolveWallet(wallet),
            impl: this.impl,
        });
    }

    // ─── Prepare helpers ──────────────────────────────────────────────────────

    /**
     * Estimates cost, then builds the createDispute transaction.
     *
     * ```ts
     * const { tx, totalValue } = await disputes.factory.prepareCreateDispute({
     *   disputeId: '0x...',  // auto-generated if omitted
     *   arbitratorExtraData: '0x...',
     *   metaEvidenceUri: 'ipfs://...',
     *   numberOfRulingOptions: 3n,
     * });
     * ```
     */
    async prepareCreateDispute(
        params: {
            disputeId?: string;
            arbitratorExtraData: string;
            metaEvidenceUri: string;
            numberOfRulingOptions: bigint;
        },
        wallet?: string,
    ): Promise<PrepareCreateResult> {
        const cost = await this.reader.estimateCost(this.cfg.factoryAddress, params.arbitratorExtraData);
        const disputeId = params.disputeId ?? IdGenerator.generateOnChainIdHex();
        const tx = this.builder.createDispute(this.cfg, {
            callerWallet:          this.resolveWallet(wallet),
            disputeId,
            arbitratorExtraData:   params.arbitratorExtraData,
            metaEvidenceUri:       params.metaEvidenceUri,
            numberOfRulingOptions: params.numberOfRulingOptions,
            creationFee:           cost.creationFee,
            arbFee:                cost.arbitrationCost,
            impl:                  this.impl,
        });
        return { tx, disputeId, creationFee: cost.creationFee, arbitrationCost: cost.arbitrationCost, totalValue: cost.total };
    }

    /**
     * Same as prepareCreateDispute but uses createCrowdfundableDispute.
     */
    async prepareCreateCrowdfundableDispute(
        params: {
            disputeId?: string;
            arbitratorExtraData: string;
            metaEvidenceUri: string;
            numberOfRulingOptions: bigint;
        },
        wallet?: string,
    ): Promise<PrepareCreateResult> {
        const cost = await this.reader.estimateCost(this.cfg.factoryAddress, params.arbitratorExtraData);
        const disputeId = params.disputeId ?? IdGenerator.generateOnChainIdHex();
        const tx = this.builder.createCrowdfundableDispute(this.cfg, {
            callerWallet:          this.resolveWallet(wallet),
            disputeId,
            arbitratorExtraData:   params.arbitratorExtraData,
            metaEvidenceUri:       params.metaEvidenceUri,
            numberOfRulingOptions: params.numberOfRulingOptions,
            creationFee:           cost.creationFee,
            arbFee:                cost.arbitrationCost,
            impl:                  this.impl,
        });
        return { tx, disputeId, creationFee: cost.creationFee, arbitrationCost: cost.arbitrationCost, totalValue: cost.total };
    }

    // ─── Event history ─────────────────────────────────────────────────────

    /** Fetches all DisputeCreated events from the factory. */
    async getLogs(
        fromBlock: number | 'earliest' = 0,
        toBlock:   number | 'latest'   = 'latest',
    ): Promise<DisputeCreatedEvent[]> {
        const rawLogs = await this.provider.getLogs({
            address:   this.cfg.factoryAddress,
            topics:    [TOPIC_DISPUTE_CREATED],
            fromBlock,
            toBlock,
        });
        return rawLogs.flatMap(log => {
            const evmLog = { address: log.address, topics: log.topics, data: log.data, transactionHash: log.transactionHash };
            const decoded = this.decoder.tryDecodeDisputeCreated(evmLog);
            return decoded ? [decoded] : [];
        });
    }

    /** Fetches all CrowdfundableDisputeDeployed events from the factory. */
    async getCrowdfundableLogs(
        fromBlock: number | 'earliest' = 0,
        toBlock:   number | 'latest'   = 'latest',
    ): Promise<CrowdfundableDisputeDeployedEvent[]> {
        const rawLogs = await this.provider.getLogs({
            address:   this.cfg.factoryAddress,
            topics:    [TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED],
            fromBlock,
            toBlock,
        });
        return rawLogs.flatMap(log => {
            const evmLog = { address: log.address, topics: log.topics, data: log.data, transactionHash: log.transactionHash };
            const decoded = this.decoder.tryDecodeCrowdfundableDisputeDeployed(evmLog);
            return decoded ? [decoded] : [];
        });
    }

    /**
     * Fetches all factory events (standard + crowdfundable) for a specific owner address.
     * Owner is an indexed topic, so this is an efficient single RPC call per event type.
     */
    async getLogsByOwner(
        owner:       string,
        fromBlock:   number | 'earliest' = 0,
        toBlock:     number | 'latest'   = 'latest',
    ): Promise<Array<
        DisputeCreatedEvent & { kind: 'standard' } | CrowdfundableDisputeDeployedEvent & { kind: 'crowdfundable' }
    >> {
        const ownerTopic = '0x000000000000000000000000' + requireAddress(owner, 'owner').toLowerCase().slice(2);

        const [standardRaw, crowdfundableRaw] = await Promise.all([
            this.provider.getLogs({
                address:   this.cfg.factoryAddress,
                topics:    [TOPIC_DISPUTE_CREATED, null, null, ownerTopic],
                fromBlock,
                toBlock,
            }),
            this.provider.getLogs({
                address:   this.cfg.factoryAddress,
                topics:    [TOPIC_CROWDFUNDABLE_DISPUTE_DEPLOYED, null, null, ownerTopic],
                fromBlock,
                toBlock,
            }),
        ]);

        const toEvm = (log: (typeof standardRaw)[number]) => ({
            address: log.address, topics: log.topics, data: log.data, transactionHash: log.transactionHash,
        });

        const results: Array<DisputeCreatedEvent & { kind: 'standard' } | CrowdfundableDisputeDeployedEvent & { kind: 'crowdfundable' }> = [];
        for (const log of standardRaw) {
            const d = this.decoder.tryDecodeDisputeCreated(toEvm(log));
            if (d) results.push({ ...d, kind: 'standard' as const });
        }
        for (const log of crowdfundableRaw) {
            const d = this.decoder.tryDecodeCrowdfundableDisputeDeployed(toEvm(log));
            if (d) results.push({ ...d, kind: 'crowdfundable' as const });
        }
        return results;
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

// ─── Disputes ────────────────────────────────────────────────────────────────

/**
 * Top-level entry point for the Disputes SDK.
 */
export class Disputes {
    readonly factory: FactoryHandle;

    private readonly _reader:   DisputeReader;
    private readonly _builder:  DisputeTxBuilder;
    private readonly _events:   DisputeEvents;
    private readonly _cfg:      DisputesConfig;
    private readonly _provider: AbstractProvider;
    private readonly _wallet?:  string;
    private readonly _impl?:    string;

    constructor(config: DisputeSdkConfig) {
        requireAddress(config.factoryAddress, 'factoryAddress');
        this._cfg      = { chainId: config.chainId, factoryAddress: config.factoryAddress };
        this._provider = config.provider;
        this._reader   = new DisputeReader(config.provider, config.multicall);
        this._builder  = new DisputeTxBuilder();
        this._events   = new DisputeEvents();
        this._wallet   = config.walletAddress;
        this._impl     = config.impl ? requireAddress(config.impl.address, 'impl') : undefined;

        this.factory = new FactoryHandle(
            this._cfg, this._reader, this._builder, this._events,
            this._provider, this._wallet, this._impl,
        );
    }

    static forChain(
        chainId: number,
        provider: AbstractProvider,
        walletAddress?: string,
        impl?: { address: string; name: string },
    ): Disputes {
        const factoryAddress = getFactoryAddress(chainId);
        if (!factoryAddress) {
            const known = listDeployments().map(d => d.chainId).join(', ');
            throw new Error(
                `No default Disputes deployment known for chain ID ${chainId}. ` +
                `Known chains: ${known}.`,
            );
        }
        return new Disputes({ chainId: Number(chainId), factoryAddress, provider, walletAddress, impl });
    }

    static async fromProvider(
        provider: AbstractProvider,
        walletAddress?: string,
    ): Promise<Disputes> {
        const { chainId } = await provider.getNetwork();
        const factoryAddress = getFactoryAddress(Number(chainId));
        if (!factoryAddress) {
            const known = listDeployments().map(d => d.chainId).join(', ');
            throw new Error(
                `No default Disputes deployment known for chain ID ${chainId}. ` +
                `Known chains: ${known}.`,
            );
        }
        return new Disputes({ chainId: Number(chainId), factoryAddress, provider, walletAddress });
    }

    dispute(address: string): Dispute {
        return new Dispute(
            requireAddress(address, 'disputeAddress'),
            this._cfg, this._reader, this._builder, this._events, this._provider, this._wallet,
        );
    }
}
