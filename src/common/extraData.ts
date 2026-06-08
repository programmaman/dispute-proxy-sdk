/**
 * Convenience wrappers for Kleros Liquid court routing on Ethereum Mainnet.
 *
 * Each function returns the encoded arbitratorExtraData hex string directly.
 *
 * @example
 * import { extraData } from '@rakelabs/disputes-sdk';
 *
 * const data = extraData.humanityCourt(3);     // Court 23, 3 jurors
 * const data = extraData.generalCourt(5);       // Court 0, 5 jurors
 * const data = extraData.oracleCourt();         // Court 24, default 3 jurors
 */

import { buildArbitratorExtraData } from './ArbitratorExtraData.js';

function wrap(courtId: number) {
    return (minJurors: number | bigint = 3) => buildArbitratorExtraData(courtId, minJurors);
}

export const extraData = {
    /** Court 0 — General Court. Default for most disputes. */
    generalCourt:        wrap(0),
    /** Court 1 — Blockchain/technical disputes. */
    blockchain:          wrap(1),
    /** Court 2 — Non-technical blockchain disputes. */
    nonTechnical:        wrap(2),
    /** Court 3 — Token listing decisions. */
    tokenListing:        wrap(3),
    /** Court 4 — Technical disputes. */
    technical:           wrap(4),
    /** Court 5 — Marketing services disputes. */
    marketingServices:   wrap(5),
    /** Court 6 — English language quality. */
    englishLanguage:     wrap(6),
    /** Court 7 — Video production quality. */
    videoProduction:     wrap(7),
    /** Court 8 — Onboarding compliance. */
    onboarding:          wrap(8),
    /** Court 9 — Content curation. */
    curation:            wrap(9),
    /** Court 10 — Data analysis quality. */
    dataAnalysis:        wrap(10),
    /** Court 11 — Statistical modeling. */
    statisticalModeling: wrap(11),
    /** Court 12 — Medium-stakes curation. */
    curationMedium:      wrap(12),
    /** Court 13 — Spanish-English translation. */
    spanishEnglish:      wrap(13),
    /** Court 14 — French-English translation. */
    frenchEnglish:       wrap(14),
    /** Court 15 — Portuguese-English translation. */
    portugueseEnglish:   wrap(15),
    /** Court 16 — German-English translation. */
    germanEnglish:       wrap(16),
    /** Court 17 — Russian-English translation. */
    russianEnglish:      wrap(17),
    /** Court 18 — Korean-English translation. */
    koreanEnglish:       wrap(18),
    /** Court 19 — Japanese-English translation. */
    japaneseEnglish:     wrap(19),
    /** Court 20 — Turkish-English translation. */
    turkishEnglish:      wrap(20),
    /** Court 21 — Chinese-English translation. */
    chineseEnglish:      wrap(21),
    /** Court 22 — General Court (Spanish). */
    corteGeneralEspanol: wrap(22),
    /** Court 23 — Identity verification. */
    humanityCourt:       wrap(23),
    /** Court 24 — Oracle data disputes. */
    oracleCourt:         wrap(24),
} as const;
