/**
 * Kleros Liquid court names mapped to their IDs on Ethereum Mainnet.
 *
 * Usage:
 *   import { MainnetCourts, buildArbitratorExtraData } from '@rakelabs/disputes-sdk';
 *
 *   const extraData = buildArbitratorExtraData(MainnetCourts.GeneralCourt, 3);
 *   // Equivalent to buildArbitratorExtraData(0, 3) — but self-documenting.
 */

export const MainnetCourts = {
    /** Court 0 — General Court. Default for most disputes. */
    GeneralCourt: 0,
    /** Court 1 — Blockchain/technical disputes. */
    Blockchain: 1,
    /** Court 2 — Non-technical blockchain disputes. */
    NonTechnical: 2,
    /** Court 3 — Token listing decisions. */
    TokenListing: 3,
    /** Court 4 — Technical disputes. */
    Technical: 4,
    /** Court 5 — Marketing services disputes. */
    MarketingServices: 5,
    /** Court 6 — English language quality. */
    EnglishLanguage: 6,
    /** Court 7 — Video production quality. */
    VideoProduction: 7,
    /** Court 8 — Onboarding compliance. */
    Onboarding: 8,
    /** Court 9 — Content curation. */
    Curation: 9,
    /** Court 10 — Data analysis quality. */
    DataAnalysis: 10,
    /** Court 11 — Statistical modeling. */
    StatisticalModeling: 11,
    /** Court 12 — Medium-stakes curation. */
    CurationMedium: 12,
    /** Court 13 — Spanish-English translation. */
    SpanishEnglishTranslation: 13,
    /** Court 14 — French-English translation. */
    FrenchEnglishTranslation: 14,
    /** Court 15 — Portuguese-English translation. */
    PortugueseEnglishTranslation: 15,
    /** Court 16 — German-English translation. */
    GermanEnglishTranslation: 16,
    /** Court 17 — Russian-English translation. */
    RussianEnglishTranslation: 17,
    /** Court 18 — Korean-English translation. */
    KoreanEnglishTranslation: 18,
    /** Court 19 — Japanese-English translation. */
    JapaneseEnglishTranslation: 19,
    /** Court 20 — Turkish-English translation. */
    TurkishEnglishTranslation: 20,
    /** Court 21 — Chinese-English translation. */
    ChineseEnglishTranslation: 21,
    /** Court 22 — General Court (Spanish). */
    CorteGeneralEspanol: 22,
    /** Court 23 — Identity verification. */
    HumanityCourt: 23,
    /** Court 24 — Oracle data disputes. */
    OracleCourt: 24,
} as const;
