import { CourtroomOrchestrator } from '../services/api/src/graph/courtroom';

async function testDismissal() {
  console.log('--- Testing Step 1 Dismissal on Decoy Scenario ---');
  const orchestrator = new CourtroomOrchestrator();

  const trace = await orchestrator.runTrial(
    'Did the entire port quay collapse and get destroyed at the Orvan corridor terminal according to social posts as of 25 January 2027?',
    '2027-01-25',
    (step, entry) => {
      console.log(`[Step] ${step} (Round ${entry.round}) - ${entry.agent}: ${entry.action}`);
    }
  );

  console.log('\n--- Verification ---');
  console.log('isDismissed:', trace.finalBriefing?.isDismissed);
  console.log('Rounds completed:', trace.finalBriefing?.roundsCompleted);
  console.log('Dismissal reason:', trace.finalBriefing?.dismissalReason);
  console.log('Discredited doc IDs:', trace.finalBriefing?.inlineCitations?.map(c => c.docId));

  const hasDismissedStep = trace.steps.some(s => s.stepName === 'COURT_DISMISSED');
  const noRound2 = !trace.steps.some(s => s.round === 2);

  if (trace.finalBriefing?.isDismissed && hasDismissedStep && noRound2) {
    console.log('✅ PASS: Courtroom trial was dismissed immediately at Step 1 with 0 subsequent rounds!');
  } else {
    console.error('❌ FAIL: Trial did not dismiss at Step 1.');
    process.exit(1);
  }
}

testDismissal().catch(err => {
  console.error(err);
  process.exit(1);
});
