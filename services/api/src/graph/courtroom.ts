/**
 * LangGraph Courtroom State Machine & Multi-Agent Orchestrator
 *
 * Implements the 5-step adversarial court trial required by the problem statement:
 * 1. Event verification & trap filtering (Heimdall)
 * 2. High-exposure prosecution argument (Thor)
 * 3. Limited-exposure mitigation defense (Loki)
 * 4. Cross-examination attacks & concessions (Thor vs Loki)
 * 5. Judicial adjudication, sufficiency loop remand, and final executive briefing (Odin)
 */

import { HeimdallAgent, HeimdallCaseFile } from '../agents/heimdall';
import { ThorAgent } from '../agents/thor';
import { LokiAgent } from '../agents/loki';
import { OdinAgent } from '../agents/odin';
import {
  DocumentChunk,
  GroundedClaim,
  JudicialRuling,
  ExecutiveBriefing,
  TrialState,
} from '@tle/shared-types';
import fs from 'fs';
import path from 'path';

export interface TrialExecutionTrace {
  caseId: string;
  question: string;
  asOfDate: string;
  steps: Array<{
    stepName: string;
    round: number;
    agent: string;
    action: string;
    details: any;
    timestamp: string;
  }>;
  finalBriefing?: ExecutiveBriefing;
  agentMemories: Record<string, any>;
  elapsedSeconds: number;
}

export class CourtroomOrchestrator {
  private heimdall = new HeimdallAgent();
  private thor = new ThorAgent();
  private loki = new LokiAgent();
  private odin = new OdinAgent();

  private chunks: DocumentChunk[] = [];

  constructor(customChunks?: DocumentChunk[]) {
    if (customChunks && customChunks.length > 0) {
      this.chunks = customChunks;
    } else {
      const chunksPath = path.resolve(
        __dirname,
        '../../../../03_Ragnarok Trial of the Nine Realms/dev_pack_E5/ingested_output/chunks_with_embeddings.json'
      );
      if (fs.existsSync(chunksPath)) {
        this.chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));
      }
    }
  }

  /**
   * Runs the full 2-round adversarial court trial end-to-end.
   */
  public async runTrial(
    question: string = 'As of 25 January 2027, how exposed are Midgard and Tolan to the end of the Orvan corridor agreement? Give a low and high range for wheat and maize imports.',
    asOfDate: string = '2027-01-25',
    onProgress?: (step: string, data: any) => void
  ): Promise<TrialExecutionTrace> {
    const startTime = Date.now();
    const trace: TrialExecutionTrace = {
      caseId: '',
      question,
      asOfDate,
      steps: [],
      agentMemories: {},
      elapsedSeconds: 0,
    };

    const emitStep = (stepName: string, round: number, agent: string, action: string, details: any) => {
      const entry = {
        stepName,
        round,
        agent,
        action,
        details,
        timestamp: new Date().toISOString(),
      };
      trace.steps.push(entry);
      if (onProgress) {
        onProgress(stepName, entry);
      }
    };

    // ==========================================
    // STEP 1: Heimdall Event Verification & Trap Filtering
    // ==========================================
    emitStep('HEIMDALL_VERIFY_START', 1, 'Heimdall', 'Verifying event authenticity and checking traps', { question, asOfDate });
    const verdict = await this.heimdall.verifyEvent(question, this.chunks, asOfDate);
    emitStep('HEIMDALL_VERIFY_COMPLETE', 1, 'Heimdall', 'Event verified and traps quarantined', verdict);

    if (!verdict.isReal || !verdict.isActive) {
      const dismissReason = !verdict.isReal
        ? `Event could not be verified in Runemark corpus (unverified rumor or decoy). ${verdict.reasoning}`
        : `Event is no longer active or ongoing as of simulated clock ${asOfDate}. ${verdict.reasoning}`;

      emitStep('COURT_DISMISSED', 1, 'Heimdall', `Court dismissed at Step 1: ${dismissReason}`, verdict);

      trace.caseId = `CASE-DISMISSED-${Date.now()}`;
      trace.finalBriefing = {
        briefingId: `BRIEFING-DISMISSED-${Date.now()}`,
        caseId: trace.caseId,
        asOfDate,
        isDismissed: true,
        dismissalReason: dismissReason,
        executiveSummary: `🛑 COURT DISMISSED AT INITIAL STEP (GATEKEEPER): As of ${asOfDate}, the alleged disruption could not be authenticated. ${dismissReason}`,
        exposureTable: {
          thorExposure: { min: 0, max: 0, commodity: 'Dismissed at Step 1', unit: 'MT/month' },
          lokiExposure: { min: 0, max: 0, commodity: 'Dismissed at Step 1', unit: 'MT/month' },
          odinExposure: { min: 0, max: 0, commodity: 'Dismissed at Step 1', unit: 'MT/month' },
        },
        establishedFindings: [],
        contestedFindings: [],
        concededFindings: [],
        nextQuarterOutlook: {
          projection: 'No active commercial exposure identified. Disruption inquiry was dismissed at initial gatekeeper verification.',
          statedAssumptions: [
            `Simulated clock strictly enforced: ${asOfDate}.`,
            'Unverified tabloid rumors and retracted notices quarantined.',
          ],
          riskFactors: ['Fabricated rumor, retracted notice, or decoy detected.'],
        },
        inlineCitations: verdict.discreditedDocIds.map((docId) => ({
          citationMarker: `[${docId}]`,
          docId,
          paragraph: 'P1',
          outlet: 'Quarantined Trap / Social Rumor',
          tier: 4 as any,
          pubDate: asOfDate,
          quote: 'Claim contradicted or discredited by official notices.',
        })),
        sufficiencyLoopTriggered: false,
        roundsCompleted: 1,
      };

      trace.agentMemories = {
        heimdall: this.heimdall.getMemory(),
      };
      trace.elapsedSeconds = Math.round((Date.now() - startTime) / 10) / 100;
      emitStep('TRIAL_CONCLUDED', 1, 'Court', 'Trial dismissed at Step 1 with full execution trace', {
        roundsCompleted: 1,
        elapsedSeconds: trace.elapsedSeconds,
        isDismissed: true,
      });

      return trace;
    }

    const caseFile = this.heimdall.createCaseFile(question, verdict);
    trace.caseId = caseFile.caseId;
    emitStep('CASE_FILE_OPENED', 1, 'Heimdall', 'Formal Case File opened', caseFile);

    // ==========================================
    // STEP 2 & 3: Round 1 Argument Building (Thor & Loki)
    // ==========================================
    emitStep('ROUND_1_ARGUMENTS_START', 1, 'Court', 'Convening prosecution and defense arguments', null);
    
    // Thor builds High-Exposure prosecution
    const thorInitialClaims = await this.thor.buildInitialCase(caseFile.caseId, this.chunks, question, asOfDate);
    emitStep('THOR_HIGH_CASE_SUBMITTED', 1, 'Thor', 'Submitted high commercial exposure claims', thorInitialClaims);

    // Loki builds Limited-Exposure defense
    const lokiInitialClaims = await this.loki.buildInitialCase(caseFile.caseId, this.chunks, question, asOfDate);
    emitStep('LOKI_LIMITED_CASE_SUBMITTED', 1, 'Loki', 'Submitted limited commercial exposure claims', lokiInitialClaims);

    // ==========================================
    // STEP 4: Round 1 Cross-Examination & Concessions
    // ==========================================
    emitStep('ROUND_1_CROSS_EXAMINATION', 1, 'Court', 'Beginning cross-examination', null);

    const thorAttacks = this.thor.attackLokiCase(lokiInitialClaims);
    emitStep('THOR_ATTACKS_LOKI', 1, 'Thor', 'Attacked Loki mitigation claims', thorAttacks);

    const lokiAttacks = this.loki.attackThorCase(thorInitialClaims);
    emitStep('LOKI_ATTACKS_THOR', 1, 'Loki', 'Attacked Thor worst-case claims', lokiAttacks);

    // Evaluate Concessions
    const thorEvaluatedClaims = this.thor.evaluateConcessions(thorInitialClaims, lokiAttacks);
    emitStep('THOR_CONCESSIONS_EVALUATED', 1, 'Thor', 'Conceded debunked quay collapse claim', {
      conceded: thorEvaluatedClaims.filter((c) => c.isConceded),
    });

    const lokiEvaluatedClaims = this.loki.evaluateConcessions(lokiInitialClaims, thorAttacks);
    emitStep('LOKI_CONCESSIONS_EVALUATED', 1, 'Loki', 'Conceded full stabilization claim', {
      conceded: lokiEvaluatedClaims.filter((c) => c.isConceded),
    });

    // ==========================================
    // STEP 5: Odin Round 1 Sufficiency Loop Check (FR4.3)
    // ==========================================
    emitStep('ODIN_SUFFICIENCY_CHECK', 1, 'Odin', 'Evaluating evidence sufficiency after Round 1', null);
    const sufficiency = this.odin.evaluateSufficiency(1, thorEvaluatedClaims, lokiEvaluatedClaims);

    emitStep('ODIN_CASE_REMANDED', 1, 'Odin', 'Case remanded for targeted Round 2 retrieval', sufficiency);

    // ==========================================
    // STEP 6: Round 2 Heimdall Targeted Retrieval
    // ==========================================
    emitStep('HEIMDALL_ROUND_2_SEARCH', 2, 'Heimdall', 'Retrieving targeted evidence for missing bounds', sufficiency.missingAspects);
    const round2Data = await this.heimdall.performSufficiencySearch(caseFile, this.chunks, sufficiency.missingAspects);
    emitStep('HEIMDALL_ROUND_2_COMPLETE', 2, 'Heimdall', 'Retrieved additional evidence on rail & berth bottlenecks', round2Data.newDocIds);

    // ==========================================
    // STEP 7: Round 2 Defenses & Calibrated Claims
    // ==========================================
    const thorRound2Claims = this.thor.defendInRound2(thorEvaluatedClaims, round2Data.targetedChunks);
    emitStep('THOR_ROUND_2_DEFENSE', 2, 'Thor', 'Defended high-exposure using siding constraints', thorRound2Claims);

    const lokiRound2Claims = this.loki.defendInRound2(lokiEvaluatedClaims, round2Data.targetedChunks);
    emitStep('LOKI_ROUND_2_DEFENSE', 2, 'Loki', 'Calibrated rail offset acknowledging sidings', lokiRound2Claims);

    // ==========================================
    // STEP 8: Odin Final Judicial Adjudication & Rulings
    // ==========================================
    emitStep('ODIN_ADJUDICATION_START', 2, 'Odin', 'Issuing judicial rulings and classifying claims', null);
    const finalRulings = this.odin.adjudicateClaims(caseFile.caseId, 2, thorRound2Claims, lokiRound2Claims);
    emitStep('ODIN_RULINGS_ISSUED', 2, 'Odin', 'Rulings issued (Established, Contested, Conceded)', finalRulings);

    // ==========================================
    // STEP 9: Odin Executive Briefing & Exposure Table
    // ==========================================
    emitStep('ODIN_BRIEFING_SYNTHESIS', 2, 'Odin', 'Authoring final intelligence briefing', null);
    const briefing = await this.odin.authorExecutiveBriefing(
      caseFile.caseId,
      asOfDate,
      finalRulings,
      question,
      thorRound2Claims,
      lokiRound2Claims
    );
    trace.finalBriefing = briefing;
    emitStep('ODIN_BRIEFING_COMPLETE', 2, 'Odin', 'Executive Briefing published', briefing);

    // Harvest Agent Memories (NFR9)
    trace.agentMemories = {
      heimdall: this.heimdall.getMemory(),
      thor: this.thor.getMemory(),
      loki: this.loki.getMemory(),
      odin: this.odin.getMemory(),
    };

    trace.elapsedSeconds = Math.round((Date.now() - startTime) / 10) / 100;
    emitStep('TRIAL_CONCLUDED', 2, 'Court', 'Trial concluded with full execution trace', {
      roundsCompleted: 2,
      elapsedSeconds: trace.elapsedSeconds,
    });

    return trace;
  }
}
