import { requireAddress, ZERO_ADDRESS } from './common/index.js';
import type { AbiCodec, Hex } from './common/AbiCodec.js';
import type { ReadBlockReference, RpcClient } from './common/index.js';
import { encodeRpcBlockReference, ethCall, type RpcBlockIdentifier } from './internal/rpc.js';
import {
    type FactoryInfo,
    type DisputeInfo,
    type CostEstimate,
    type DisputeImplementationInfo,
    DisputeState,
    type AppealPeriod,
} from './types.js';
import { type MulticallConfig, type EncodedReadCall, executeMulticall } from './multicall.js';
import type { DisputeReadable } from './internal/DisputeReadable.js';

export class DisputeReader {
    private readonly _multicall?: MulticallConfig;
    private readonly _rpcClient: RpcClient;
    private readonly _codec: AbiCodec;
    private readonly _readBlock: RpcBlockIdentifier;
    readonly readDispute: DisputeReadable<[disputeAddress: string]>;

    constructor(
        rpcClient: RpcClient,
        codec: AbiCodec,
        multicallConfig?: MulticallConfig,
        readBlock: ReadBlockReference = 'latest',
    ) {
        this._rpcClient = rpcClient;
        this._codec = codec;
        this._multicall = multicallConfig;
        this._readBlock = encodeRpcBlockReference(readBlock);
        this.readDispute = Object.assign(
            (disputeAddress: string) => this._readDisputeSnapshot(disputeAddress),
            {
                state: (disputeAddress: string) => this._readDisputeState(disputeAddress),
                owner: (disputeAddress: string) => this._readDisputeString(disputeAddress, 'owner'),
                arbitrator: (disputeAddress: string) => this._readDisputeString(disputeAddress, 'arbitrator'),
                arbitratorExtraData: (disputeAddress: string) => this._readDisputeString(disputeAddress, 'arbitratorExtraData'),
                providerDisputeId: (disputeAddress: string) => this._readDisputeBigInt(disputeAddress, 'providerDisputeId'),
                numberOfRulingOptions: (disputeAddress: string) => this._readDisputeBigInt(disputeAddress, 'numberOfRulingOptions'),
                ruling: (disputeAddress: string) => this._readDisputeBigInt(disputeAddress, 'ruling'),
                isRuled: (disputeAddress: string) => this._readDisputeBoolean(disputeAddress, 'isRuled'),
                evidenceSubmitted: (disputeAddress: string) => this._readDisputeBoolean(disputeAddress, 'evidenceSubmitted'),
                arbitrationCost: (disputeAddress: string) => this.readArbitrationCost(disputeAddress),
                appealCost: (disputeAddress: string) => this.readAppealCost(disputeAddress),
                appealPeriod: (disputeAddress: string) => this.readAppealPeriod(disputeAddress),
            },
        );
    }

    async readFactory(factoryAddress: string): Promise<FactoryInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        return this._multicall ? this._readFactoryViaMulticall(addr) : this._readFactoryDirect(addr);
    }

    private async _readFactoryDirect(addr: string): Promise<FactoryInfo> {
        const call = (method: string) => this._call({ to: addr, data: this._codec.encode(`${method}()`) });
        const [creationFeeRaw, arbitratorRaw, feeRecipientRaw, defaultsProviderRaw,
            ownerRaw, pendingOwnerRaw, defaultImplRaw, defaultCdImplRaw] = await Promise.all([
            call('creationFee'), call('arbitrator'), call('feeRecipient'), call('defaultsProvider'),
            call('owner'), call('pendingOwner'), call('defaultDisputeImplementation'),
            call('defaultCrowdfundableDisputeImplementation'),
        ]);
        const [defaultImpl, defaultImplName] = this._codec.decode('defaultDisputeImplementation()', defaultImplRaw);
        const [defaultCdImpl, defaultCdImplName] = this._codec.decode('defaultCrowdfundableDisputeImplementation()', defaultCdImplRaw);
        const pendingOwner = this._codec.decode('pendingOwner()', pendingOwnerRaw)[0] as string;
        return {
            factoryAddress: addr,
            defaultDisputeImpl: defaultImpl as string,
            defaultDisputeImplName: defaultImplName as string,
            defaultCrowdfundableDisputeImpl: defaultCdImpl as string,
            defaultCrowdfundableDisputeImplName: defaultCdImplName as string,
            creationFee: this._codec.decode('creationFee()', creationFeeRaw)[0] as bigint,
            arbitrator: this._codec.decode('arbitrator()', arbitratorRaw)[0] as string,
            feeRecipient: this._codec.decode('feeRecipient()', feeRecipientRaw)[0] as string,
            defaultsProvider: this._codec.decode('defaultsProvider()', defaultsProviderRaw)[0] as string,
            owner: this._codec.decode('owner()', ownerRaw)[0] as string,
            pendingOwner: pendingOwner && pendingOwner !== ZERO_ADDRESS ? pendingOwner : '',
        };
    }

    private async _readFactoryViaMulticall(addr: string): Promise<FactoryInfo> {
        const config = this._multicall!;
        const encode = <T = unknown>(method: string, decode?: (data: Hex) => T): EncodedReadCall<T> => ({
            target: addr,
            method,
            callData: this._codec.encode(`${method}()`),
            decode: decode ?? (data => this._codec.decode(`${method}()`, data)[0] as T),
        });
        const calls: EncodedReadCall[] = [
            encode('creationFee'), encode('arbitrator'), encode('feeRecipient'), encode('defaultsProvider'),
            encode('owner'), encode('pendingOwner'),
            encode('defaultDisputeImplementation', data => {
                const [impl, name] = this._codec.decode('defaultDisputeImplementation()', data);
                return { impl: impl as string, name: name as string };
            }),
            encode('defaultCrowdfundableDisputeImplementation', data => {
                const [impl, name] = this._codec.decode('defaultCrowdfundableDisputeImplementation()', data);
                return { impl: impl as string, name: name as string };
            }),
        ];
        const values = await executeMulticall(this._rpcClient, this._codec, config.address, calls, this._readBlock);
        const di = values[6] as { impl: string; name: string };
        const cdi = values[7] as { impl: string; name: string };
        const pendingOwner = values[5] as string;
        return {
            factoryAddress: addr,
            defaultDisputeImpl: di.impl,
            defaultDisputeImplName: di.name,
            defaultCrowdfundableDisputeImpl: cdi.impl,
            defaultCrowdfundableDisputeImplName: cdi.name,
            creationFee: values[0] as bigint,
            arbitrator: values[1] as string,
            feeRecipient: values[2] as string,
            defaultsProvider: values[3] as string,
            owner: values[4] as string,
            pendingOwner: pendingOwner && pendingOwner !== ZERO_ADDRESS ? pendingOwner : '',
        };
    }

    async readCreationFee(factoryAddress: string): Promise<bigint> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        return this._codec.decode('creationFee()', await this._call({ to: addr, data: this._codec.encode('creationFee()') }))[0] as bigint;
    }

    async readDisputeImplCount(factoryAddress: string): Promise<number> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        return Number(this._codec.decode('disputeImplementationCount()', await this._call({ to: addr, data: this._codec.encode('disputeImplementationCount()') }))[0]);
    }

    async readCrowdfundableDisputeImplCount(factoryAddress: string): Promise<number> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        return Number(this._codec.decode('crowdfundableDisputeImplementationCount()', await this._call({ to: addr, data: this._codec.encode('crowdfundableDisputeImplementationCount()') }))[0]);
    }

    async readDisputeImplAt(factoryAddress: string, index: number): Promise<DisputeImplementationInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        if (index < 0) throw new Error('index must be >= 0');
        const raw = await this._call({ to: addr, data: this._codec.encode('disputeImplementationAt(uint256)', [index]) });
        const [impl, name] = this._codec.decode('disputeImplementationAt(uint256)', raw);
        return { address: impl as string, name: name as string };
    }

    async readCrowdfundableImplAt(factoryAddress: string, index: number): Promise<DisputeImplementationInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        if (index < 0) throw new Error('index must be >= 0');
        const raw = await this._call({ to: addr, data: this._codec.encode('crowdfundableDisputeImplementationAt(uint256)', [index]) });
        const [impl, name] = this._codec.decode('crowdfundableDisputeImplementationAt(uint256)', raw);
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
        const signature = impl
            ? 'predictDisputeAddress(address,(bytes32,bytes,uint256,string))'
            : 'predictDisputeAddress((bytes32,bytes,uint256,string))';
        const args = impl ? [impl, reqTuple] : [reqTuple];
        const raw = await this._call({
            to: addr,
            ...(caller === undefined ? {} : { from: requireAddress(caller, 'caller') }),
            data: this._codec.encode(signature, args),
        });
        return this._codec.decode(signature, raw)[0] as string;
    }

    async estimateCost(factoryAddress: string, arbitratorExtraData: string): Promise<CostEstimate> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const arbAddr = await this.readArbitratorAddress(addr);
        const [creationFeeRaw, arbCostRaw] = await Promise.all([
            this._call({ to: addr, data: this._codec.encode('creationFee()') }),
            this._call({ to: arbAddr, data: this._codec.encode('arbitrationCost(bytes)', [arbitratorExtraData]) }),
        ]);
        const creationFee = this._codec.decode('creationFee()', creationFeeRaw)[0] as bigint;
        const arbitrationCost = this._codec.decode('arbitrationCost(bytes)', arbCostRaw)[0] as bigint;
        return { creationFee, arbitrationCost, total: creationFee + arbitrationCost };
    }

    private async readArbitratorAddress(factoryAddress: string): Promise<string> {
        return this._codec.decode('arbitrator()', await this._call({ to: factoryAddress, data: this._codec.encode('arbitrator()') }))[0] as string;
    }

    private async _readDisputeSnapshot(disputeAddress: string): Promise<DisputeInfo> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        return this._multicall ? this._readDisputeViaMulticall(addr) : this._readDisputeDirect(addr);
    }

    private async _readDisputeDirect(addr: string): Promise<DisputeInfo> {
        const call = (method: string) => this._call({ to: addr, data: this._codec.encode(`${method}()`) });
        const [owner, arbitrator, extraData, providerDisputeId, numberOfRulingOptions,
            ruling, isRuled, evidenceSubmitted] = await Promise.all([
            call('owner'), call('arbitrator'), call('arbitratorExtraData'), call('providerDisputeId'),
            call('numberOfRulingOptions'), call('ruling'), call('isRuled'), call('evidenceSubmitted'),
        ]);
        const isRuledValue = this._codec.decode('isRuled()', isRuled)[0] as boolean;
        return {
            disputeAddress: addr,
            state: isRuledValue ? DisputeState.RULED : DisputeState.PENDING,
            owner: this._codec.decode('owner()', owner)[0] as string,
            arbitrator: this._codec.decode('arbitrator()', arbitrator)[0] as string,
            arbitratorExtraData: this._codec.decode('arbitratorExtraData()', extraData)[0] as string,
            providerDisputeId: this._codec.decode('providerDisputeId()', providerDisputeId)[0] as bigint,
            numberOfRulingOptions: this._codec.decode('numberOfRulingOptions()', numberOfRulingOptions)[0] as bigint,
            ruling: this._codec.decode('ruling()', ruling)[0] as bigint,
            isRuled: isRuledValue,
            evidenceSubmitted: this._codec.decode('evidenceSubmitted()', evidenceSubmitted)[0] as boolean,
        };
    }

    private async _readDisputeViaMulticall(addr: string): Promise<DisputeInfo> {
        const config = this._multicall!;
        const encode = (method: string): EncodedReadCall => ({
            target: addr,
            method,
            callData: this._codec.encode(`${method}()`),
            decode: data => this._codec.decode(`${method}()`, data)[0],
        });
        const calls = ['owner', 'arbitrator', 'arbitratorExtraData', 'providerDisputeId',
            'numberOfRulingOptions', 'ruling', 'isRuled', 'evidenceSubmitted'].map(encode);
        const values = await executeMulticall(this._rpcClient, this._codec, config.address, calls, this._readBlock);
        const isRuled = values[6] as boolean;
        return {
            disputeAddress: addr,
            state: isRuled ? DisputeState.RULED : DisputeState.PENDING,
            owner: values[0] as string,
            arbitrator: values[1] as string,
            arbitratorExtraData: values[2] as string,
            providerDisputeId: values[3] as bigint,
            numberOfRulingOptions: values[4] as bigint,
            ruling: values[5] as bigint,
            isRuled,
            evidenceSubmitted: values[7] as boolean,
        };
    }

    async readArbitrationCost(disputeAddress: string): Promise<bigint> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        return this._codec.decode('arbitrationCost()', await this._call({ to: addr, data: this._codec.encode('arbitrationCost()') }))[0] as bigint;
    }

    async readAppealCost(disputeAddress: string): Promise<bigint> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        return this._codec.decode('appealCost()', await this._call({ to: addr, data: this._codec.encode('appealCost()') }))[0] as bigint;
    }

    async readAppealPeriod(disputeAddress: string): Promise<AppealPeriod> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        const result = this._codec.decode('appealPeriod()', await this._call({ to: addr, data: this._codec.encode('appealPeriod()') }));
        return { start: result[0] as bigint, end: result[1] as bigint };
    }

    private async _readDisputeValue(disputeAddress: string, method: string): Promise<unknown> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        return this._codec.decode(`${method}()`, await this._call({ to: addr, data: this._codec.encode(`${method}()`) }))[0];
    }

    private async _readDisputeString(disputeAddress: string, method: 'owner' | 'arbitrator' | 'arbitratorExtraData'): Promise<string> {
        return await this._readDisputeValue(disputeAddress, method) as string;
    }

    private async _readDisputeBigInt(disputeAddress: string, method: 'providerDisputeId' | 'numberOfRulingOptions' | 'ruling'): Promise<bigint> {
        return await this._readDisputeValue(disputeAddress, method) as bigint;
    }

    private async _readDisputeBoolean(disputeAddress: string, method: 'isRuled' | 'evidenceSubmitted'): Promise<boolean> {
        return await this._readDisputeValue(disputeAddress, method) as boolean;
    }

    private async _readDisputeState(disputeAddress: string): Promise<DisputeState> {
        return (await this._readDisputeBoolean(disputeAddress, 'isRuled')) ? DisputeState.RULED : DisputeState.PENDING;
    }

    private _call(request: { to: string; data: Hex; from?: string }): Promise<Hex> {
        return ethCall(this._rpcClient, request, this._readBlock);
    }
}