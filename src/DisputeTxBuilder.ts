import { Interface } from 'ethers';
import type { PreparedTx } from './common/index.js';
import { requireAddress, type SigningPreview, buildFeeBreakdown, ZERO_ADDRESS } from './common/index.js';
import { DisputeFactory__factory, Dispute__factory } from '../generated/typechain/index.js';

// ─── Configuration ─────────────────────────────────────────────────────────────

export interface DisputesConfig {
    chainId: number;
    factoryAddress: string;
}

// ─── Parameter types ───────────────────────────────────────────────────────────

export interface CreateDisputeParams {
    callerWallet: string;
    /** bytes32 as 0x-prefixed hex — use IdGenerator.generateOnChainIdHex() */
    disputeId: string;
    arbitratorExtraData: string;
    metaEvidenceUri: string;
    numberOfRulingOptions: bigint;
    /** Creation fee (read from factory). */
    creationFee: bigint;
    /** Arbitration cost (read from arbitrator). */
    arbFee: bigint;
    /** Pinned dispute implementation address. Internal — set by FactoryHandle. */
    impl?: string;
}

export interface CreateCrowdfundableDisputeParams extends CreateDisputeParams {}

export interface DisputeActionParams {
    callerWallet: string;
    disputeAddress: string;
}

export interface SubmitEvidenceParams {
    callerWallet: string;
    disputeAddress: string;
    evidenceUri: string;
}

export interface AmendMetaEvidenceParams {
    callerWallet: string;
    disputeAddress: string;
    newUri: string;
}

export interface AppealParams {
    callerWallet: string;
    disputeAddress: string;
    arbitratorExtraData: string;
    appealFeeWei: bigint;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function requireBytes32Hex(value: string, name: string): void {
    if (!value || typeof value !== 'string') {
        throw new Error(`${name} must be a 0x-prefixed 32-byte hex string`);
    }
    const hex = value.startsWith('0x') || value.startsWith('0X') ? value.slice(2) : value;
    if (hex.length !== 64 || !/^[0-9a-fA-F]{64}$/.test(hex)) {
        throw new Error(`${name} must be a 0x-prefixed 32-byte hex string (got: ${value})`);
    }
}

function noValue(
    to: string, data: string, chainId: number, signerHint: string, preview: SigningPreview,
): PreparedTx {
    return { to, data, value: '0', chainId, signerHint, preview };
}

function withValue(
    to: string, data: string, valueWei: bigint, chainId: number, signerHint: string, preview: SigningPreview,
): PreparedTx {
    return { to, data, value: valueWei.toString(), chainId, signerHint, preview };
}

// ─── Builder ───────────────────────────────────────────────────────────────────

/**
 * Stateless transaction builder for the DisputeFactory + Dispute contracts.
 *
 * Every method returns an unsigned PreparedTx — the caller's wallet signs and
 * submits the transaction. This class never holds private keys.
 */
export class DisputeTxBuilder {
    private readonly factoryIface: Interface;
    private readonly disputeIface: Interface;

    constructor() {
        this.factoryIface = DisputeFactory__factory.createInterface() as unknown as Interface;
        this.disputeIface = Dispute__factory.createInterface() as unknown as Interface;
    }

    // ─── Factory: createDispute ─────────────────────────────────────────────

    /**
     * Build an unsigned `createDispute` transaction for a standard dispute.
     */
    createDispute(cfg: DisputesConfig, p: CreateDisputeParams): PreparedTx {
        return this.buildCreate(cfg, p, false);
    }

    /**
     * Build an unsigned `createCrowdfundableDispute` transaction.
     */
    createCrowdfundableDispute(cfg: DisputesConfig, p: CreateCrowdfundableDisputeParams): PreparedTx {
        return this.buildCreate(cfg, p, true);
    }

    private buildCreate(
        cfg: DisputesConfig, p: CreateDisputeParams, isCrowdfundable: boolean,
    ): PreparedTx {
        requireAddress(cfg.factoryAddress, 'factoryAddress');
        requireAddress(p.callerWallet, 'callerWallet');
        requireBytes32Hex(p.disputeId, 'disputeId');
        if (!p.arbitratorExtraData) throw new Error('arbitratorExtraData must not be blank');
        if (!p.metaEvidenceUri?.trim()) throw new Error('metaEvidenceUri must not be blank');
        if (p.numberOfRulingOptions <= 0n) throw new Error('numberOfRulingOptions must be > 0');
        if (p.creationFee < 0n) throw new Error('creationFee must be >= 0');
        if (p.arbFee < 0n) throw new Error('arbFee must be >= 0');

        const totalValue = p.creationFee + p.arbFee;

        const req = {
            id:                   p.disputeId,
            arbitratorExtraData:  p.arbitratorExtraData,
            numberOfRulingOptions: p.numberOfRulingOptions,
            metaEvidenceUri:     p.metaEvidenceUri,
        };

        const fnName = isCrowdfundable ? 'createCrowdfundableDispute' : 'createDispute';

        const data = p.impl
            ? this.factoryIface.encodeFunctionData(
                `${fnName}(address,(bytes32,bytes,uint256,string))`,
                [p.impl, req])
            : this.factoryIface.encodeFunctionData(
                `${fnName}((bytes32,bytes,uint256,string))`,
                [req]);

        const preview: SigningPreview = {
            action: isCrowdfundable ? 'Create Crowdfundable Dispute' : 'Create Dispute',
            signer: 'owner',
            description: isCrowdfundable
                ? 'Deploy a new crowdfundable dispute contract and submit to Kleros arbitration.'
                : 'Deploy a new dispute contract and submit to Kleros arbitration.',
            valueWei: totalValue.toString(),
            token: ZERO_ADDRESS,
            tokenAmountWei: totalValue.toString(),
            fees: buildFeeBreakdown(ZERO_ADDRESS, [
                ['Creation fee', p.creationFee],
                ['Arbitration fee', p.arbFee],
            ]),
            details: {
                'Dispute ID':      p.disputeId,
                'Ruling options':  p.numberOfRulingOptions.toString(),
                'Creation fee':    p.creationFee.toString(),
                'Arb fee':         p.arbFee.toString(),
                'Total value':     totalValue.toString(),
                'Meta evidence':   p.metaEvidenceUri,
            },
        };

        return withValue(cfg.factoryAddress, data, totalValue, cfg.chainId, 'Create dispute', preview);
    }

    // ─── Clone: submitEvidence ─────────────────────────────────────────────

    submitEvidence(cfg: DisputesConfig, p: SubmitEvidenceParams): PreparedTx {
        requireAddress(p.callerWallet, 'callerWallet');
        requireAddress(p.disputeAddress, 'disputeAddress');
        if (!p.evidenceUri?.trim()) throw new Error('evidenceUri must not be blank');
        const data = this.disputeIface.encodeFunctionData('submitEvidence', [p.evidenceUri]);
        const preview: SigningPreview = {
            action: 'Submit Evidence',
            signer: 'owner',
            description: 'Submit an evidence URI to the Kleros arbitration for this dispute.',
            details: { 'Dispute': p.disputeAddress, 'Evidence URI': p.evidenceUri },
        };
        return noValue(p.disputeAddress, data, cfg.chainId, 'Submit evidence', preview);
    }

    // ─── Clone: amendMetaEvidence ──────────────────────────────────────────

    amendMetaEvidence(cfg: DisputesConfig, p: AmendMetaEvidenceParams): PreparedTx {
        requireAddress(p.callerWallet, 'callerWallet');
        requireAddress(p.disputeAddress, 'disputeAddress');
        if (!p.newUri?.trim()) throw new Error('newUri must not be blank');
        const data = this.disputeIface.encodeFunctionData('amendMetaEvidence', [p.newUri]);
        const preview: SigningPreview = {
            action: 'Amend Meta Evidence',
            signer: 'owner',
            description: 'Update the meta-evidence URI before any evidence is submitted.',
            details: { 'Dispute': p.disputeAddress, 'New URI': p.newUri },
        };
        return noValue(p.disputeAddress, data, cfg.chainId, 'Amend meta evidence', preview);
    }

    // ─── Clone: appeal ─────────────────────────────────────────────────────

    appeal(cfg: DisputesConfig, p: AppealParams): PreparedTx {
        requireAddress(p.callerWallet, 'callerWallet');
        requireAddress(p.disputeAddress, 'disputeAddress');
        if (p.appealFeeWei < 0n) throw new Error('appealFeeWei must be >= 0');
        const data = this.disputeIface.encodeFunctionData('appeal', [p.arbitratorExtraData ?? '0x']);
        const preview: SigningPreview = {
            action: 'Appeal Ruling',
            signer: 'owner',
            description: 'Appeal the Kleros ruling for this dispute.',
            valueWei: p.appealFeeWei.toString(),
            token: ZERO_ADDRESS,
            tokenAmountWei: p.appealFeeWei.toString(),
            fees: buildFeeBreakdown(ZERO_ADDRESS, [['Appeal fee', p.appealFeeWei]]),
            details: { 'Dispute': p.disputeAddress },
        };
        return withValue(p.disputeAddress, data, p.appealFeeWei, cfg.chainId, 'Appeal ruling', preview);
    }

    // ─── Clone: rescueEth ──────────────────────────────────────────────────

    rescueEth(cfg: DisputesConfig, p: DisputeActionParams): PreparedTx {
        return this.simpleCall(cfg, p, 'rescueEth', 'Rescue ETH', {
            signer: 'owner',
            description: 'Rescue trapped ETH from the dispute contract after it has been ruled on.',
            details: { 'Dispute': p.disputeAddress },
        });
    }

    // ─── Internals ─────────────────────────────────────────────────────────

    private simpleCall(
        cfg: DisputesConfig, p: DisputeActionParams, method: string,
        action: string, previewOverrides: Partial<SigningPreview>,
    ): PreparedTx {
        requireAddress(p.callerWallet, 'callerWallet');
        requireAddress(p.disputeAddress, 'disputeAddress');
        const data = this.disputeIface.encodeFunctionData(method, []);
        const preview: SigningPreview = {
            action,
            signer: 'owner',
            description: `${action} on dispute ${p.disputeAddress}.`,
            details: { 'Dispute': p.disputeAddress },
            ...previewOverrides,
        };
        return noValue(p.disputeAddress, data, cfg.chainId, action, preview);
    }
}