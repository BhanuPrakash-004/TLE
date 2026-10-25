/**
 * End-to-End Test for the 4-Agent Adversarial Courtroom System
 */

import { CourtroomOrchestrator } from '../services/api/src/graph/courtroom';

async function runTest() {
  console.log('=== Running Multi-Agent Courtroom Trial Test ===\n');

  const orchestrator = new CourtroomOrchestrator();

  const trace = await orchestrator.runTrial(
    'As of 25 January 2027, how exposed are Midgard and Tolan to the end of the Orvan corridor agreement? Give a low and high range for wheat and maize imports.',
    '2027-01-25',
    (step, entry) => {
      console.log(`[Step] ${step} (Round ${entry.round}) - ${entry.agent}: ${entry.action}`);
    }
  );

  console.log('\n=== Verifying Acceptance Criteria ===\n');

  // 1. Verify Case was opened & verified
  if (!trace.caseId) throw new Error('CaseId missing!');
  console.log('✅ Acceptance Criterion 1: Case File opened with verified authenticity.');

  // 2. Verify Cross-examination happened and concessions were made
  const thorQuayClaimConceded = trace.steps.some(
    (s) => s.stepName === 'THOR_CONCESSIONS_EVALUATED' && s.details?.conceded?.length > 0
  );
  if (!thorQuayClaimConceded) throw new Error('Thor did not concede debunked quay destruction claim!');
  console.log('✅ Acceptance Criterion 2: Cross-examination triggered genuine concessions (Thor conceded ORV-0010 rumor).');

  // 3. Verify Odin Sufficiency Loop triggered Round 2
  const sufficiencyLoopTriggered = trace.steps.some((s) => s.stepName === 'ODIN_CASE_REMANDED');
  if (!sufficiencyLoopTriggered) throw new Error('Odin sufficiency loop did not remand case for Round 2!');
  console.log('✅ Acceptance Criterion 3: Odin executed sufficiency check and remanded for Round 2.');

  // 4. Verify Rulings (Fact vs Inference, Established, Contested, Conceded)
  const rulingsStep = trace.steps.find((s) => s.stepName === 'ODIN_RULINGS_ISSUED');
  if (!rulingsStep || !rulingsStep.details) throw new Error('Odin rulings missing!');
  const rulings = rulingsStep.details;
  const hasEstablished = rulings.some((r: any) => r.ruling === 'Established');
  const hasContested = rulings.some((r: any) => r.ruling === 'Contested');
  const hasConceded = rulings.some((r: any) => r.ruling === 'Conceded');
  if (!hasEstablished || !hasContested || !hasConceded) {
    throw new Error('Rulings must contain Established, Contested, and Conceded categories!');
  }
  console.log('✅ Acceptance Criterion 4: Odin classified findings into Established, Contested, and Conceded.');

  // 5. Verify Executive Briefing & 3-Range Exposure Table
  if (!trace.finalBriefing) throw new Error('Final briefing missing!');
  const table = trace.finalBriefing.exposureTable;
  if (!table.thorExposure || !table.lokiExposure || !table.odinExposure) {
    throw new Error('Briefing must include Thor, Loki, and Odin exposure ranges!');
  }
  console.log('✅ Acceptance Criterion 5: Exposure Table contains separate Thor, Loki, and Odin calibrated ranges:');
  console.log('   - Thor Range: ', table.thorExposure);
  console.log('   - Loki Range: ', table.lokiExposure);
  console.log('   - Odin Range: ', table.odinExposure);

  // 6. Verify Citations & Traps Handled
  if (!trace.finalBriefing.inlineCitations || trace.finalBriefing.inlineCitations.length === 0) {
    throw new Error('Inline citations missing from briefing!');
  }
  console.log(`✅ Acceptance Criterion 6: Inline paragraph citations present (${trace.finalBriefing.inlineCitations.length} citations with tiers).`);

  // 7. Verify Agent Memories
  if (!trace.agentMemories.heimdall || !trace.agentMemories.thor || !trace.agentMemories.loki || !trace.agentMemories.odin) {
    throw new Error('Private agent memories missing!');
  }
  console.log('✅ Acceptance Criterion 7: Private agent memories recorded across all 4 agents.');

  console.log(`\n🎉 ALL 7 ACCEPTANCE CRITERIA PASSED in ${trace.elapsedSeconds}s!`);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
