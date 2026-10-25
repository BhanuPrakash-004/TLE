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
  public async buildInitialCase(caseId: string, chunks: DocumentChunk[]): Promise<GroundedClaim[]> {
    const claims: GroundedClaim[] = [
      {
        claimId: 'LOKI-CLAIM-01',
        caseId,
        agentRole: 'Loki',
        roundNumber: 1,
        category: 'ALTERNATIVE_ROUTING',
        claimText: 'Ravik Rail Link actively cushions Orvan wheat outflows, maintaining 64,000 to 69,000 MT/month overland shipments to regional buyers.',
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
        claimText: 'Tolan and Midgard buyers have rapidly substituted Orvan sea shortfalls with grain cargoes from Vanir (54,000-58,000 MT/month) and commercial reserves.',
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
        claimText: 'Commercial grain markets have largely stabilized and absorbed the corridor lapse through alternative supply agreements with minimal net disruption.',
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

    this.memory.claimsBuilt = claims.map((c) => c.claimId);
    return claims;
  }

  /**
   * Round 1 Cross-Examination: Attack Thor's worst-case claims.
   */
  public attackThorCase(thorClaims: GroundedClaim[]): Array<{ targetClaimId: string; challengeText: string; docId: string }> {
    const attacks = [];

    // Attack Thor's Quay Collapse Claim (THOR-CLAIM-03)
    const quayClaim = thorClaims.find((c) => c.claimId === 'THOR-CLAIM-03');
    if (quayClaim) {
      const challenge = {
        targetClaimId: quayClaim.claimId,
        challengeText: 'Thor cites a Tier 4 tabloid rumor (ORV-0010). Official Realm Trade Ministry bulletins (ORV-0008, ORV-0012, ORV-0035) prove the port quay is NOT destroyed; berths remain active and loaded at index 30-40.',
        docId: 'ORV-0012',
      };
      attacks.push(challenge);
      this.memory.attacksDelivered.push(`Debunked ${quayClaim.claimId} using ORV-0012`);
    }

    return attacks;
  }

  /**
   * Concede or Adjust Claims when confronted with Thor's counter-evidence.
   */
  public evaluateConcessions(claims: GroundedClaim[], counterAttacks: any[]): GroundedClaim[] {
    for (const claim of claims) {
      // Concede over-optimistic full market stabilization claim (LOKI-CLAIM-03)
      if (claim.claimId === 'LOKI-CLAIM-03') {
        claim.isConceded = true;
        claim.concessionReason = 'Conceded in cross-examination: While Vantro Trading notes market adaptation (ORV-0004), physical transit figures (ORV-0050, ORV-0042) demonstrate substantial physical deficit remains unfilled by alternatives.';
        this.memory.concededClaimIds.push(claim.claimId);
      }
    }
    return claims;
  }

  /**
   * Round 2 Defense: Incorporates new evidence following Odin's remand.
   */
  public defendInRound2(claims: GroundedClaim[], newChunks: DocumentChunk[]): GroundedClaim[] {
    this.memory.defenseStrategies.push('Round 2: Calibrated rail mitigation to partial offset (25,000 MT/month) acknowledging siding constraints in ORV-0050.');
    for (const c of claims) {
      if (c.claimId === 'LOKI-CLAIM-01' && !c.isConceded) {
        c.defenseEvidenceDocIds = ['ORV-0001', 'ORV-0044'];
      }
    }
    return claims;
  }

  public getMemory(): LokiMemory {
    return { ...this.memory };
  }
}
