import { Interface, AbstractProvider, ZeroAddress } from 'ethers';
import { requireAddress } from './common/index.js';
import {
    type FactoryInfo,
    type DisputeInfo,
    type CostEstimate,
    type DisputeImplementationInfo,
    DisputeState,
    disputeStateFromOrdinal,
} from './types.js';
import { type MulticallConfig, type EncodedReadCall, executeMulticall } from './multicall.js';
import { DisputeFactory__factory, Dispute__factory } from '../generated/typechain/index.js';

const FACTORY_IFACE = DisputeFactory__factory.createInterface() as unknown as Interface;
const DISPUTE_IFACE = Dispute__factory.createInterface() as unknown as Interface;

export class DisputeReader {
    private readonly _multicall?: MulticallConfig;

    constructor(private readonly provider: AbstractProvider, multicallConfig?: MulticallConfig) {
        this._multicall = multicallConfig;
    }

    // ─── Factory reads ────────────────────────────────────────────────────────

    async readFactory(factoryAddress: string): Promise<FactoryInfo> {
        const addr = requireAddress(factoryAddress, 'factoryAddress');
        const call = (method: string) =>
            this.provider.call({ to: addr, data: FACTORY_IFACE.encodeFunctionData(method, []) });

        const [creationFeeRaw, arbitrator, feeRecipient, defaultsProvider,
               owner, pendingOwnerRaw, defaultImplRaw, defaultCdImplRaw,
               implCountRaw, cdImplCountRaw] = await Promise.all([
            call('creationFee'), call('arbitrator'), call('feeRecipient'),
            call('defaultsProvider'), call('owner'), call('pendingOwner'),
            call('defaultDisputeImplementation'), call('defaultCrowdfundableDisputeImplementation'),
            call('disputeImplementationCount'), call('crowdfundableDisputeImplementationCount'),
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

    async readDispute(disputeAddress: string): Promise<DisputeInfo> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
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

    async readAppealPeriod(disputeAddress: string): Promise<{ start: bigint; end: bigint }> {
        const addr = requireAddress(disputeAddress, 'disputeAddress');
        const raw = await this.provider.call({ to: addr, data: DISPUTE_IFACE.encodeFunctionData('appealPeriod', []) });
        const result = DISPUTE_IFACE.decodeFunctionResult('appealPeriod', raw);
        return { start: result[0] as bigint, end: result[1] as bigint };
    }
}
