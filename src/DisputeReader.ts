import { Interface, AbstractProvider, ZeroAddress } from 'ethers';
import { requireAddress } from './common/index.js';
import {
    type FactoryInfo,
    type DisputeInfo,
    type CostEstimate,
    type DisputeImplementationInfo,
    DisputeState,
    type AppealPeriod,
} from './types.js';
import { type MulticallConfig, type EncodedReadCall, executeMulticall } from './multicall.js';
import { DisputeFactory__factory, Dispute__factory } from '../generated/typechain/index.js';
import type { DisputeReadable } from './internal/DisputeReadable.js';

const FACTORY_IFACE = DisputeFactory__factory.createInterface() as unknown as Interface;
const DISPUTE_IFACE = Dispute__factory.createInterface() as unknown as Interface;

export class DisputeReader {
    private readonly _multicall?: MulticallConfig;
    readonly readDispute: DisputeReadable<[disputeAddress: string]>;

    constructor(
        private readonly provider: AbstractProvider,
        multicallConfig?: MulticallConfig,
    ) {
        this._multicall = multicallConfig;
        this.readDispute = Object.assign(
            (disputeAddress: string) => this._readDisputeSnapshot(disputeAddress),
            {
                state: (disputeAddress: string) => this._readDisputeState(disputeAddress),
                owner: (disputeAddress: string) =>
                    this._readDisputeString(disputeAddress, 'owner'),
                arbitrator: (disputeAddress: string) =>
                    this._readDisputeString(disputeAddress, 'arbitrator'),
                arbitratorExtraData: (disputeAddress: string) =>
                    this._readDisputeString(disputeAddress, 'arbitratorExtraData'),
                providerDisputeId: (disputeAddress: string) =>
                    this._readDisputeBigInt(disputeAddress, 'providerDisputeId'),
                numberOfRulingOptions: (disputeAddress: string) =>
                    this._readDisputeBigInt(disputeAddress, 'numberOfRulingOptions'),
                ruling: (disputeAddress: string) =>
                    this._readDisputeBigInt(disputeAddress, 'ruling'),
                isRuled: (disputeAddress: string) =>
                    this._readDisputeBoolean(disputeAddress, 'isRuled'),
                evidenceSubmitted: (disputeAddress: string) =>
                    this._readDisputeBoolean(disputeAddress, 'evidenceSubmitted'),
                arbitrationCost: (disputeAddress: string) =>
                    this.readArbitrationCost(disputeAddress),
                appealCost: (disputeAddress: string) =>
                    this.readAppealCost(disputeAddress),
                appealPeriod: (disputeAddress: string) =>
                    this.readAppealPeriod(disputeAddress),
            },
        );
    }

    // ─── Factory reads ────────────────────────────────────────────────────────

    async readFactory(factoryAddress: string): Promise<FactoryInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        return this._multicall
            ? this._readFactoryViaMulticall(addr)
            : this._readFactoryDirect(addr);
    }

    private async _readFactoryDirect(addr: string): Promise<FactoryInfo> {
        const call = (method: string) =>
            this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData(method, []) });

        const [creationFeeRaw, arbitrator, feeRecipient, defaultsProvider,
               owner, pendingOwnerRaw, defaultImplRaw, defaultCdImplRaw] = await Promise.all([
            call('creationFee'), call('arbitrator'), call('feeRecipient'),
            call('defaultsProvider'), call('owner'), call('pendingOwner'),
            call('defaultDisputeImplementation'), call('defaultCrowdfundableDisputeImplementation'),
        ]);

        const [defaultImpl, defaultImplName] = FACTORY_IFACE.decodeFunctionResult('defaultDisputeImplementation', defaultImplRaw);
        const [defaultCdImpl, defaultCdImplName] = FACTORY_IFACE.decodeFunctionResult('defaultCrowdfundableDisputeImplementation', defaultCdImplRaw);
        const pendingOwner = FACTORY_IFACE.decodeFunctionResult('pendingOwner', pendingOwnerRaw)[0] as string;

        return {
            factoryAddress: addr,
            defaultDisputeImpl: defaultImpl as string,
            defaultDisputeImplName: defaultImplName as string,
            defaultCrowdfundableDisputeImpl: defaultCdImpl as string,
            defaultCrowdfundableDisputeImplName: defaultCdImplName as string,
            creationFee: FACTORY_IFACE.decodeFunctionResult('creationFee', creationFeeRaw)[0] as bigint,
            arbitrator: FACTORY_IFACE.decodeFunctionResult('arbitrator', arbitrator)[0] as string,
            feeRecipient: FACTORY_IFACE.decodeFunctionResult('feeRecipient', feeRecipient)[0] as string,
            defaultsProvider: FACTORY_IFACE.decodeFunctionResult('defaultsProvider', defaultsProvider)[0] as string,
            owner: FACTORY_IFACE.decodeFunctionResult('owner', owner)[0] as string,
            pendingOwner: pendingOwner && pendingOwner !== ZeroAddress ? pendingOwner : '',
        };
    }

    private async _readFactoryViaMulticall(addr: string): Promise<FactoryInfo> {
        const cfg   = this._multicall!;
        const iface: Interface = FACTORY_IFACE;

        const enc = (method: string, decoder?: (data: string) => unknown): EncodedReadCall => ({
            target:   addr,
            method,
            callData: iface.encodeFunctionData(method, []),
            decode:   decoder ?? ((data: string) => iface.decodeFunctionResult(method, data)[0] as unknown),
        });

        const calls: EncodedReadCall[] = [
            enc('creationFee'),
            enc('arbitrator'),
            enc('feeRecipient'),
            enc('defaultsProvider'),
            enc('owner'),
            enc('pendingOwner'),
            {
                target:   addr,
                method:   'defaultDisputeImplementation',
                callData: iface.encodeFunctionData('defaultDisputeImplementation', []),
                decode:   (data: string) => {
                    const r = iface.decodeFunctionResult('defaultDisputeImplementation', data);
                    return { impl: r[0] as string, name: r[1] as string };
                },
            },
            {
                target:   addr,
                method:   'defaultCrowdfundableDisputeImplementation',
                callData: iface.encodeFunctionData('defaultCrowdfundableDisputeImplementation', []),
                decode:   (data: string) => {
                    const r = iface.decodeFunctionResult('defaultCrowdfundableDisputeImplementation', data);
                    return { impl: r[0] as string, name: r[1] as string };
                },
            },
        ];

        const results = await executeMulticall(
            this.provider, cfg.address, calls, cfg.requireSuccess !== false,
        );

        const [creationFee, arbitrator, feeRecipient, defaultsProvider,
               owner, pendingOwnerRaw, defaultImpl, defaultCdImpl] = results;

        const di  = defaultImpl  as { impl: string; name: string };
        const cdi = defaultCdImpl as { impl: string; name: string };
        const pendingOwner = pendingOwnerRaw as string;

        return {
            factoryAddress:                          addr,
            defaultDisputeImpl:                      di.impl,
            defaultDisputeImplName:                  di.name,
            defaultCrowdfundableDisputeImpl:         cdi.impl,
            defaultCrowdfundableDisputeImplName:     cdi.name,
            creationFee:                             creationFee as bigint,
            arbitrator:                              arbitrator as string,
            feeRecipient:                            feeRecipient as string,
            defaultsProvider:                        defaultsProvider as string,
            owner:                                   owner as string,
            pendingOwner:                            pendingOwner && pendingOwner !== ZeroAddress ? pendingOwner : '',
        };
    }

    async readCreationFee(factoryAddress: string): Promise<bigint> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const raw = await this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData('creationFee', []) });
        return FACTORY_IFACE.decodeFunctionResult('creationFee', raw)[0] as bigint;
    }

    async readDisputeImplCount(factoryAddress: string): Promise<number> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const raw = await this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData('disputeImplementationCount', []) });
        return Number(FACTORY_IFACE.decodeFunctionResult('disputeImplementationCount', raw)[0]);
    }

    async readCrowdfundableDisputeImplCount(factoryAddress: string): Promise<number> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const raw = await this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData('crowdfundableDisputeImplementationCount', []) });
        return Number(FACTORY_IFACE.decodeFunctionResult('crowdfundableDisputeImplementationCount', raw)[0]);
    }

    async readDisputeImplAt(factoryAddress: string, index: number): Promise<DisputeImplementationInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        if (index < 0) throw new Error('index must be >= 0');
        const raw = await this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData('disputeImplementationAt', [index]) });
        const [impl, name] = FACTORY_IFACE.decodeFunctionResult('disputeImplementationAt', raw);
        return { address: impl as string, name: name as string };
    }

    async readCrowdfundableImplAt(factoryAddress: string, index: number): Promise<DisputeImplementationInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        if (index < 0) throw new Error('index must be >= 0');
        const raw = await this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData('crowdfundableDisputeImplementationAt', [index]) });
        const [impl, name] = FACTORY_IFACE.decodeFunctionResult('crowdfundableDisputeImplementationAt', raw);
        return { address: impl as string, name: name as string };
    }

    async predictDisputeAddress(
        factoryAddress: string,
        req: { id: string; arbitratorExtraData: string; numberOfRulingOptions: bigint; metaEvidenceUri: string },
        impl?: string,
        caller?: string,
    ): Promise<string> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const reqTuple = {
            id: req.id,
            arbitratorExtraData: req.arbitratorExtraData,
            numberOfRulingOptions: req.numberOfRulingOptions,
            metaEvidenceUri: req.metaEvidenceUri,
        };
        const fnSig = impl
            ? 'predictDisputeAddress(address,(bytes32,bytes,uint256,string))'
            : 'predictDisputeAddress((bytes32,bytes,uint256,string))';
        const args = impl ? [impl, reqTuple] : [reqTuple];
        const raw = await this.provider.call({
            to: addr,
            from: caller,
            data: FACTORY_IFACE.encodeFunctionData(fnSig, args),
        });
        return FACTORY_IFACE.decodeFunctionResult(fnSig, raw)[0] as string;
    }

    // ─── Cost estimation ──────────────────────────────────────────────────────

    /**
     * Estimates the total cost for creating a dispute.
     */
    async estimateCost(factoryAddress: string, arbitratorExtraData: string): Promise<CostEstimate> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const arbAddr = await this.readArbitratorAddress(addr);

        const arbIface = new Interface(['function arbitrationCost(bytes extraData) view returns (uint256)']);
        const [creationFeeRaw, arbCostRaw] = await Promise.all([
            this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData('creationFee', []) }),
            this.provider.call({ to: arbAddr, data: arbIface.encodeFunctionData('arbitrationCost', [arbitratorExtraData]) }),
        ]);
        const creationFee = FACTORY_IFACE.decodeFunctionResult('creationFee', creationFeeRaw)[0] as bigint;
        const arbitrationCost = arbIface.decodeFunctionResult('arbitrationCost', arbCostRaw)[0] as bigint;
        return { creationFee, arbitrationCost, total: creationFee + arbitrationCost };
    }

    private async readArbitratorAddress(factoryAddress: string): Promise<string> {
        const raw = await this.provider.call({ to: factoryAddress, data: FACTORY_IFACE.encodeFunctionData('arbitrator', []) });
        return FACTORY_IFACE.decodeFunctionResult('arbitrator', raw)[0] as string;
    }

    // ─── Dispute reads ─────────────────────────────────────────────────────────

    private async _readDisputeSnapshot(disputeAddress: string): Promise<DisputeInfo> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        return this._multicall
            ? this._readDisputeViaMulticall(addr)
            : this._readDisputeDirect(addr);
    }

    private async _readDisputeDirect(addr: string): Promise<DisputeInfo> {
        const call = (method: string) =>
            this.provider.call({ to: addr, data: DISPUTE_IFACE.encodeFunctionData(method, []) });

        const [owner, arbitrator, extraDataRaw, providerDisputeIdRaw,
               numberOfRulingOptionsRaw, rulingRaw, isRuledRaw, evidenceSubmittedRaw] =
            await Promise.all([
                call('owner'), call('arbitrator'), call('arbitratorExtraData'),
                call('providerDisputeId'), call('numberOfRulingOptions'),
                call('ruling'), call('isRuled'), call('evidenceSubmitted'),
            ]);

        const isRuled = DISPUTE_IFACE.decodeFunctionResult('isRuled', isRuledRaw)[0] as boolean;

        return {
            disputeAddress: addr,
            state: isRuled ? DisputeState.RULED : DisputeState.PENDING,
            owner: DISPUTE_IFACE.decodeFunctionResult('owner', owner)[0] as string,
            arbitrator: DISPUTE_IFACE.decodeFunctionResult('arbitrator', arbitrator)[0] as string,
            arbitratorExtraData: DISPUTE_IFACE.decodeFunctionResult('arbitratorExtraData', extraDataRaw)[0] as string,
            providerDisputeId: BigInt(DISPUTE_IFACE.decodeFunctionResult('providerDisputeId', providerDisputeIdRaw)[0] as bigint),
            numberOfRulingOptions: BigInt(DISPUTE_IFACE.decodeFunctionResult('numberOfRulingOptions', numberOfRulingOptionsRaw)[0] as bigint),
            ruling: BigInt(DISPUTE_IFACE.decodeFunctionResult('ruling', rulingRaw)[0] as bigint),
            isRuled,
            evidenceSubmitted: DISPUTE_IFACE.decodeFunctionResult('evidenceSubmitted', evidenceSubmittedRaw)[0] as boolean,
        };
    }

    private async _readDisputeViaMulticall(addr: string): Promise<DisputeInfo> {
        const cfg   = this._multicall!;
        const iface: Interface = DISPUTE_IFACE;

        const enc = (method: string): EncodedReadCall => ({
            target:   addr,
            method,
            callData: iface.encodeFunctionData(method, []),
            decode:   (data: string) => iface.decodeFunctionResult(method, data)[0] as unknown,
        });

        const calls: EncodedReadCall[] = [
            enc('owner'),
            enc('arbitrator'),
            enc('arbitratorExtraData'),
            enc('providerDisputeId'),
            enc('numberOfRulingOptions'),
            enc('ruling'),
            enc('isRuled'),
            enc('evidenceSubmitted'),
        ];

        const results = await executeMulticall(
            this.provider, cfg.address, calls, cfg.requireSuccess !== false,
        );

        const [owner, arbitrator, arbitratorExtraData, providerDisputeIdRaw,
               numberOfRulingOptionsRaw, rulingRaw, isRuledRaw, evidenceSubmittedRaw] = results;

        const providerDisputeId       = BigInt(providerDisputeIdRaw as bigint);
        const numberOfRulingOptions   = BigInt(numberOfRulingOptionsRaw as bigint);
        const ruling                  = BigInt(rulingRaw as bigint);
        const isRuled                 = isRuledRaw as boolean;
        const evidenceSubmitted       = evidenceSubmittedRaw as boolean;

        return {
            disputeAddress: addr,
            state:            isRuled ? DisputeState.RULED : DisputeState.PENDING,
            owner:            owner as string,
            arbitrator:       arbitrator as string,
            arbitratorExtraData: arbitratorExtraData as string,
            providerDisputeId,
            numberOfRulingOptions,
            ruling,
            isRuled,
            evidenceSubmitted,
        };
    }

    async readArbitrationCost(disputeAddress: string): Promise<bigint> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        const raw = await this.provider.call({ to: addr, data: DISPUTE_IFACE.encodeFunctionData('arbitrationCost', []) });
        return DISPUTE_IFACE.decodeFunctionResult('arbitrationCost', raw)[0] as bigint;
    }

    async readAppealCost(disputeAddress: string): Promise<bigint> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        const raw = await this.provider.call({ to: addr, data: DISPUTE_IFACE.encodeFunctionData('appealCost', []) });
        return DISPUTE_IFACE.decodeFunctionResult('appealCost', raw)[0] as bigint;
    }

    async readAppealPeriod(disputeAddress: string): Promise<AppealPeriod> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        const raw = await this.provider.call({ to: addr, data: DISPUTE_IFACE.encodeFunctionData('appealPeriod', []) });
        const result = DISPUTE_IFACE.decodeFunctionResult('appealPeriod', raw);
        return { start: result[0] as bigint, end: result[1] as bigint };
    }

    private async _readDisputeValue(
        disputeAddress: string,
        method: string,
    ): Promise<unknown> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        const raw = await this.provider.call({
            to: addr,
            data: DISPUTE_IFACE.encodeFunctionData(method, []),
        });
        return DISPUTE_IFACE.decodeFunctionResult(method, raw)[0];
    }

    private async _readDisputeString(
        disputeAddress: string,
        method: 'owner' | 'arbitrator' | 'arbitratorExtraData',
    ): Promise<string> {
        return await this._readDisputeValue(disputeAddress, method) as string;
    }

    private async _readDisputeBigInt(
        disputeAddress: string,
        method: 'providerDisputeId' | 'numberOfRulingOptions' | 'ruling',
    ): Promise<bigint> {
        return await this._readDisputeValue(disputeAddress, method) as bigint;
    }

    private async _readDisputeBoolean(
        disputeAddress: string,
        method: 'isRuled' | 'evidenceSubmitted',
    ): Promise<boolean> {
        return await this._readDisputeValue(disputeAddress, method) as boolean;
    }

    private async _readDisputeState(
        disputeAddress: string,
    ): Promise<DisputeState> {
        const isRuled = await this._readDisputeBoolean(disputeAddress, 'isRuled');
        return isRuled ? DisputeState.RULED : DisputeState.PENDING;
    }
}
