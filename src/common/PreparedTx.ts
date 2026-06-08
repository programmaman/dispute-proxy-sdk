export interface PreparedTx {
    to: string;
    data: string;
    value: string;
    chainId: number;
    signerHint?: string;
    preview?: import('./TxPreview.js').SigningPreview;
}
