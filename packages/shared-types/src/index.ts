/**
 * @tle/shared-types
 * Core TypeScript definitions for the Trial of the Nine Realms courtroom system.
 */

// ==========================================
// 1. Source Reliability & Metadata
// ==========================================

export type ReliabilityTier = 1 | 2 | 3 | 4;

export const RELIABILITY_TIER_DESCRIPTIONS: Record<ReliabilityTier, string> = {
  1: 'Official Notices (Canal authority, government ministries) — Most reliable, rare corrections',
  2: 'Reputable Wire / Trade / Business Press (Raven Wire, Midgard Times, Cargo Weekly) — Reputable',
  3: 'Regional Papers / Analyst Firms (Asgard Herald, Tide Research, Ledger Analytics) — Opinionated/biased',
  4: 'Social Posts / Tabloids / Blogs (Saga Chat, Trade Whisper, Daily Roar) — Weak, unverified, loud',
};

export type SourceType =
  | 'atlas'
  | 'official_notice'
  | 'news_report'
  | 'trade_bulletin'
  | 'shipping_update'
  | 'analyst_note'
  | 'social_post'
  | 'trade_table'
  | 'company_statement'
  | 'retraction'
  | 'correction';

export type FileFormat = 'PDF' | 'DOCX' | 'TXT';

export interface DocumentMetadata {
  docId: string;
  eventId: string;
  title: string;
  sourceName: string;
  sourceType: SourceType | string;
  reliability: ReliabilityTier;
  pubDate: string; // YYYY-MM-DD
  pubTime: string; // HH:MM
  country: string;
  sector: string;
  language: string;
  file: string;
  format: FileFormat;
}

export interface DocumentRecord extends DocumentMetadata {
  id?: string;
  filePath: string;
  contentHash: string;
  rawText: string;
  paragraphCount: number;
  isDamaged?: boolean;
  damageReason?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ==========================================
// 2. Chunks & Vector Embeddings
// ==========================================

export interface DocumentChunk {
  chunkId: string;
  docId: string;
  chunkIndex: number;
  paragraphRefs: string[]; // e.g. ["P1", "P2"]
  text: string;
  tokenCount: number;
  embedding?: number[];
  metadata: {
    eventId: string;
    sourceName: string;
    sourceType: string;
    reliability: ReliabilityTier;
    pubDate: string;
    country: string;
    sector: string;
  };
}

export interface TradeTableRow {
  tableId: string;
  rowNum: number;
  period: string; // YYYY-MM
  volume: number;
  value: number;
  unitVolume?: string;
  unitValue?: string;
  countryOrigin?: string;
  countryDest?: string;
  sector?: string;
  isDamaged?: boolean;
}

// ==========================================
// 3. Case File & As-Of Date
// ==========================================

export interface CaseFile {
  caseId: string;
  question: string;
  eventId: string;
  targetCountries: string[];
  targetSectors: string[];
  asOfDate: string; // e.g., '2027-01-25'
  status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'IN_TRIAL' | 'CONCLUDED';
  verificationDetails?: {
    isReal: boolean;
    isActive: boolean;
    reasoning: string;
    corroboratingDocIds: string[];
    debunkedDocIds: string[];
  };
  retrievalRound: number;
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 4. Claims & Adversarial Arguments
// ==========================================

export type AgentRole = 'Heimdall' | 'Thor' | 'Loki' | 'Odin';

export type ClaimCategory = 'DISRUPTION_SEVERITY' | 'ALTERNATIVE_ROUTING' | 'PRICE_BUFFER' | 'VOLUME_DROP';

export interface GroundedClaim {
  claimId: string;
  caseId: string;
  agentRole: 'Thor' | 'Loki';
  roundNumber: number;
  claimText: string;
  category: ClaimCategory | string;
  citedDocIds: string[];
  citedParagraphs: string[]; // e.g. ["ORV-0007:P2", "ATL-0012:P3"]
  exposureEstimate: {
    min: number;
    max: number;
    commodity: string;
    unit: string;
  };
  isFactOrInference: 'Fact' | 'Inference';
  isConceded: boolean;
  concessionReason?: string;
  counteredByClaimId?: string;
  defenseEvidenceDocIds?: string[];
}

export interface CrossExaminationChallenge {
  challengeId: string;
  roundNumber: number;
  challengerRole: 'Thor' | 'Loki';
  targetClaimId: string;
  counterEvidenceDocIds: string[];
  challengeArgument: string;
  outcome: 'CONCEDED' | 'DEFENDED' | 'REJECTED';
  rebuttalText?: string;
}

// ==========================================
// 5. Odin Judicial Rulings & Briefing
// ==========================================

export type JudicialRulingType = 'Established' | 'Contested' | 'Conceded';

export interface JudicialRuling {
  rulingId: string;
  caseId: string;
  claimId: string;
  roundNumber: number;
  ruling: JudicialRulingType;
  nature: 'Fact' | 'Inference';
  confidenceScore: number; // 0.0 to 1.0
  reasoning: string;
  primaryDocCitation: string;
  outletReliabilityTier: ReliabilityTier;
  createdAt: string;
}

export interface ExposureRange {
  min: number;
  max: number;
  commodity: string;
  unit: string;
}

export interface ExecutiveBriefing {
  briefingId: string;
  caseId: string;
  asOfDate: string;
  executiveSummary: string;
  exposureTable: {
    thorExposure: ExposureRange;
    lokiExposure: ExposureRange;
    odinExposure: ExposureRange;
  };
  establishedFindings: JudicialRuling[];
  contestedFindings: JudicialRuling[];
  concededFindings: JudicialRuling[];
  nextQuarterOutlook: {
    projection: string;
    statedAssumptions: string[];
    riskFactors: string[];
  };
  inlineCitations: Array<{
    citationMarker: string; // e.g., "[ORV-0007:P2]"
    docId: string;
    paragraph: string;
    outlet: string;
    tier: ReliabilityTier;
    pubDate: string;
    quote: string;
  }>;
  sufficiencyLoopTriggered: boolean;
  roundsCompleted: number;
}

// ==========================================
// 6. Ingestion & Retrieval API Interfaces
// ==========================================

export interface IngestionFileResult {
  docId: string;
  file: string;
  format: FileFormat;
  hash: string;
  hashVerified: boolean;
  status: 'PROCESSED' | 'FLAGGED' | 'FAILED';
  chunkCount: number;
  error?: string;
}

export interface IngestionSummaryReport {
  packName: string;
  eventId: string;
  asOfDate: string;
  totalFiles: number;
  processedCount: number;
  flaggedCount: number;
  failedCount: number;
  totalChunks: number;
  fileResults: IngestionFileResult[];
  startedAt: string;
  completedAt: string;
  elapsedSeconds: number;
}

export interface IngestionProgressEvent {
  step: 'CORPUS_INSPECTION' | 'EXTRACTION' | 'NORMALIZATION' | 'CHUNKING' | 'EMBEDDING' | 'PERSISTENCE' | 'COMPLETED';
  currentFile?: string;
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  message: string;
}

export interface SearchQueryFilters {
  asOfDate?: string; // documents dated after this are excluded
  maxReliabilityTier?: ReliabilityTier; // filter out weak tiers if requested
  eventId?: string;
  countries?: string[];
  sectors?: string[];
  sourceTypes?: string[];
}

export interface SearchResultItem {
  chunkId: string;
  docId: string;
  paragraphRefs: string[];
  text: string;
  score: number;
  bm25Score?: number;
  vectorScore?: number;
  metadata: DocumentMetadata;
}

export interface RerankRequest {
  query: string;
  items: SearchResultItem[];
  topK?: number;
}

export interface RerankResultItem extends SearchResultItem {
  rerankScore: number;
  credibilityWeight: number;
}

// ==========================================
// 7. Agent Memory & Trial State
// ==========================================

export interface AgentMemoryEntry {
  agentRole: AgentRole;
  caseId: string;
  roundNumber: number;
  action: string;
  memoryKey: string;
  memoryValue: any;
  timestamp: string;
}

export interface TrialState {
  caseFile: CaseFile;
  currentRound: number;
  maxRounds: number;
  thorClaims: GroundedClaim[];
  lokiClaims: GroundedClaim[];
  crossExaminations: CrossExaminationChallenge[];
  rulings: JudicialRuling[];
  sufficiencyMet: boolean;
  briefing?: ExecutiveBriefing;
  agentMemories: AgentMemoryEntry[];
}
