/**
 * Loki Agent — The Trickster (Buffer)
 *
 * Responsibilities (FR3):
 * - FR3.1: Build the strongest case that commercial exposure is limited.
 * - FR3.2: Every claim has Runemark document IDs and numeric low estimates.
 *          Must prove actual alternatives exist and can handle trade.
 * - FR3.3: Attack Thor's worst-case claims; defend with new evidence or CONCEDE when challenged.
 * - NFR9: Maintain private lasting memory across trial rounds.
 */

import { GroundedClaim, DocumentChunk } from '@tle/shared-types';
import { retrieveDynamicContext } from '../ai/dynamicRetriever';
import { callJsonLLM } from '../ai/llm';

export interface LokiMemory {
  claimsBuilt: string[];
  attacksDelivered: string[];
  concededClaimIds: string[];
  defenseStrategies: string[];
}

export class LokiAgent {
  private memory: LokiMemory = {
    claimsBuilt: [],
    attacksDelivered: [],
    concededClaimIds: [],
    defenseStrategies: [],
  };

  /**
   * Round 1: Constructs the limited-exposure resilience case.
   */
  public async buildInitialCase(
    caseId: string,
    chunks: DocumentChunk[],
    question: string = '',
    asOfDate: string = '2027-01-25'
  ): Promise<GroundedClaim[]> {
    const retrieval = retrieveDynamicContext(
      `${question} mitigation alternative routing rail overland substitute reserves buffer`,
      chunks,
      asOfDate,
      10
    );

    const docContextSnippet = retrieval.topChunks
      .slice(0, 6)
      .map(
        (sc) =>
          `[Doc ${sc.docId} | Tier ${sc.reliabilityTier} | Date ${sc.pubDate}]\n${sc.chunk.text.slice(0, 280)}...`
      )
      .join('\n\n');

    const fallbackClaims: GroundedClaim[] = [
      {
        claimId: 'LOKI-CLAIM-01',
        caseId,
        agentRole: 'Loki',
        roundNumber: 1,
        category: 'ALTERNATIVE_ROUTING',
        claimText:
          'Ravik Rail Link actively cushions Orvan wheat outflows, maintaining 64,000 to 69,000 MT/month overland shipments to regional buyers.',
        citedDocIds: ['ORV-0001', 'ORV-0005', 'ORV-0050'],
        citedParagraphs: ['ORV-0001:P1', 'ORV-0005:P2', 'ORV-0050:P2'],
        exposureEstimate: {
          min: 30000,
          max: 45000,
          commodity: 'Wheat',
          unit: 'MT/month',
        },
        isFactOrInference: 'Fact',
        isConceded: false,
      },
      {
        claimId: 'LOKI-CLAIM-02',
        caseId,
        agentRole: 'Loki',
        roundNumber: 1,
        category: 'ALTERNATIVE_ROUTING',
        claimText:
          'Tolan and Midgard buyers have rapidly substituted Orvan sea shortfalls with grain cargoes from Vanir (54,000-58,000 MT/month) and commercial reserves.',
        citedDocIds: ['ORV-0006', 'ORV-0040', 'ORV-0042', 'ORV-0044'],
        citedParagraphs: ['ORV-0040:P1', 'ORV-0042:P1', 'ORV-0044:P2'],
        exposureEstimate: {
          min: 15000,
          max: 25000,
          commodity: 'Wheat/Maize',
          unit: 'MT/month',
        },
        isFactOrInference: 'Inference',
        isConceded: false,
      },
      {
        claimId: 'LOKI-CLAIM-03',
        caseId,
        agentRole: 'Loki',
        roundNumber: 1,
        category: 'PRICE_BUFFER',
        claimText:
          'Commercial grain markets have completely stabilized and absorbed the corridor lapse through alternative supply agreements with minimal net disruption.',
        citedDocIds: ['ORV-0004'],
        citedParagraphs: ['ORV-0004:P1', 'ORV-0004:P2'],
        exposureEstimate: {
          min: 20000,
          max: 35000,
          commodity: 'All Grain',
          unit: 'MT/month',
        },
        isFactOrInference: 'Inference',
        isConceded: false,
      },
    ];

    const systemPrompt = `You are Loki, Defense Advocate & Commercial Mitigator in the Runemark Courtroom.
Your objective is to prove that commercial trade exposure is LIMITED by demonstrating viable alternatives (rail lines, secondary sea corridors, inventory stockpiles, price adjustments).
You must cite exact doc IDs and paragraph references.
Provide low exposure numerical estimates in MT/month or value.`;

    const userPrompt = `Disruption Query: "${question}"
Simulated Date: ${asOfDate}

Available Documents:
${docContextSnippet}

Construct 2 to 3 mitigation claims in this JSON array structure:
[
  {
    "claimId": "LOKI-CLAIM-01",
    "category": "ALTERNATIVE_ROUTING" or "PRICE_BUFFER",
    "claimText": "Defense argument demonstrating mitigation, rerouting, or buffers",
    "citedDocIds": ["ORV-0001", "ORV-0042"],
    "citedParagraphs": ["ORV-0001:P1"],
    "exposureEstimate": {
      "min": 25000,
      "max": 45000,
      "commodity": "Wheat",
      "unit": "MT/month"
    },
    "isFactOrInference": "Fact"
  }
]`;

    const llmClaims = await callJsonLLM<GroundedClaim[]>(
      systemPrompt,
      userPrompt,
      fallbackClaims,
      { maxTokens: 450 }
    );

    const validatedClaims: GroundedClaim[] = (
      Array.isArray(llmClaims) && llmClaims.length > 0 ? llmClaims : fallbackClaims
    ).map((c, idx) => ({
      ...c,
      claimId: c.claimId || `LOKI-CLAIM-0${idx + 1}`,
      caseId,
      agentRole: 'Loki',
      roundNumber: 1,
      isConceded: false,
      exposureEstimate: c.exposureEstimate || fallbackClaims[0].exposureEstimate,
    }));

    // Ensure LOKI-CLAIM-03 (overstated complete market stabilization) is present for debate
    if (!validatedClaims.some((c) => c.category === 'PRICE_BUFFER')) {
      validatedClaims.push(fallbackClaims[2]);
    }

    this.memory.claimsBuilt = validatedClaims.map((c) => c.claimId);
    return validatedClaims;
  }

  /**
   * Round 1 Cross-Examination: Attack Thor's worst-case claims.
   */
  public attackThorCase(
    thorClaims: GroundedClaim[]
  ): Array<{ targetClaimId: string; challengeText: string; docId: string }> {
    const attacks = [];

    // Attack Thor's Quay Collapse Claim (THOR-CLAIM-03 / ORV-0010)
    const quayClaim = thorClaims.find(
      (c) =>
        (c.citedDocIds || []).includes('ORV-0010') ||
        c.claimText.toLowerCase().includes('entire quay')
    );

    if (quayClaim) {
      attacks.push({
        targetClaimId: quayClaim.claimId,
        challengeText:
          'Thor relies on unverified Tier 4 social media rumors (ORV-0010 Saga Chat). Official Port loading indices (ORV-0012, Tier 1) and Customs data prove the quay is fully intact and still handling 30-38% of normal loading capacity.',
        docId: 'ORV-0012',
      });
    }

    // Attack Thor's gross volume drop claim
    const grossClaim = thorClaims.find(
      (c) => c.category === 'VOLUME_DROP' && c.claimId !== quayClaim?.claimId
    );
    if (grossClaim) {
      attacks.push({
        targetClaimId: grossClaim.claimId,
        challengeText:
          'Thor treats gross sea transit disruption as net commercial collapse, completely ignoring Ravik overland rail diversions and Vanir replacement cargoes.',
        docId: 'ORV-0001',
      });
    }

    this.memory.attacksDelivered = attacks.map((a) => a.targetClaimId);
    return attacks;
  }

  /**
   * Concession Evaluation: When Loki's overstated full stabilization claim is attacked.
   */
  public evaluateConcessions(
    lokiClaims: GroundedClaim[],
    thorAttacks: Array<{ targetClaimId: string; challengeText: string; docId: string }>
  ): GroundedClaim[] {
    return lokiClaims.map((claim) => {
      const isStabilizationClaim =
        claim.category === 'PRICE_BUFFER' ||
        claim.claimText.toLowerCase().includes('completely stabilized') ||
        claim.claimText.toLowerCase().includes('largely stabilized');

      if (isStabilizationClaim) {
        this.memory.concededClaimIds.push(claim.claimId);
        return {
          ...claim,
          isConceded: true,
          concessionReason:
            'Loki concedes claim: Regional price indexes (ORV-0017) confirm agricultural spot prices spiked 42%, contradicting the assertion of full market stabilization.',
        };
      }
      return claim;
    });
  }

  /**
   * Round 2 Defense: Calibrates mitigation bounds after sufficiency search.
   */
  public defendInRound2(
    lokiClaims: GroundedClaim[],
    targetedChunks: DocumentChunk[]
  ): GroundedClaim[] {
    this.memory.defenseStrategies.push('Round 2: Calibrated rail mitigation to 35,000-45,000 MT acknowledging sidings');

    return lokiClaims.map((claim) => {
      if (claim.claimId === 'LOKI-CLAIM-01') {
        return {
          ...claim,
          claimText:
            'Ravik Rail provides steady mitigation, absorbing 38,000 to 45,000 MT/month of wheat deliveries to Midgard, constrained by siding turnarounds (ORV-0050).',
          exposureEstimate: {
            min: 38000,
            max: 48000,
            commodity: 'Wheat',
            unit: 'MT/month',
          },
        };
      }
      return claim;
    });
  }

  public getMemory(): LokiMemory {
    return { ...this.memory };
  }
}
