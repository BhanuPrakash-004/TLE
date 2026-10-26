import React, { useState, useEffect, useRef } from 'react';
import {
  Scale,
  Swords,
  ShieldAlert,
  Flame,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Layers,
  Cpu,
  BookOpen,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  MessageSquare,
  Send,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface ExposureRange {
  min: number;
  max: number;
  commodity: string;
  unit: string;
}

interface ExecutiveBriefing {
  briefingId: string;
  caseId: string;
  asOfDate: string;
  isDismissed?: boolean;
  dismissalReason?: string;
  executiveSummary: string;
  exposureTable: {
    thorExposure: ExposureRange;
    lokiExposure: ExposureRange;
    odinExposure: ExposureRange;
  };
  establishedFindings: any[];
  contestedFindings: any[];
  concededFindings: any[];
  nextQuarterOutlook: {
    projection: string;
    statedAssumptions: string[];
    riskFactors: string[];
  };
  inlineCitations: Array<{
    citationMarker: string;
    docId: string;
    paragraph: string;
    outlet: string;
    tier: number;
    pubDate: string;
    quote: string;
  }>;
  sufficiencyLoopTriggered: boolean;
  roundsCompleted: number;
}

interface TrialStep {
  stepName: string;
  round: number;
  agent: string;
  action: string;
  details: any;
  timestamp: string;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  citedDocIds?: string[];
}

export interface SampleQuestion {
  id: string;
  title: string;
  category: 'Corridor Disruption' | 'Rail Siding Bottleneck' | 'Maritime Cargo Substitution' | 'Decoy Quarantined (isReal: false)' | 'Premature Renewal (isActive: false)';
  query: string;
  asOfDate: string;
  expectedOutcome: string;
  discreditedDocs?: string[];
  description: string;
}

export const SAMPLE_QUESTIONS_TABLE: SampleQuestion[] = [
  {
    id: 'SCENARIO-1',
    title: 'Event E5: Orvan Corridor Expiration (Midgard & Tolan)',
    category: 'Corridor Disruption',
    query:
      'As of 25 January 2027, how exposed are Midgard and Tolan to the end of the Orvan corridor agreement? Give a low and high range for wheat and maize imports.',
    asOfDate: '2027-01-25',
    expectedOutcome: '✅ Verified Active — 2-Round Adversarial Trial',
    description:
      'Authentic baseline case: Corroborated by official notices ORV-0016 and ORV-0012. Leads to full Round 1 and Round 2 adjudication with 3 exposure ranges.',
  },
  {
    id: 'SCENARIO-2',
    title: 'Ravik Rail Link Siding Capacity Bottleneck',
    category: 'Rail Siding Bottleneck',
    query:
      'How much wheat volume can the Ravik Rail Link divert from Orvan to Midgard before encountering un-electrified passing siding bottlenecks as of 25 January 2027?',
    asOfDate: '2027-01-25',
    expectedOutcome: '✅ Verified Active — 2-Round Adversarial Trial',
    description:
      'Secondary logistics bottleneck: Evaluates whether 6 daily train pairs can bypass maritime loss, tested against ORV-0050 siding throughput constraints.',
  },
  {
    id: 'SCENARIO-3',
    title: 'Tolan Harbour Maritime Berth Substitution',
    category: 'Maritime Cargo Substitution',
    query:
      'To what degree can replacement grain cargoes from Vanir offset Tolan Harbour sea import deficits following the corridor expiration as of 25 January 2027?',
    asOfDate: '2027-01-25',
    expectedOutcome: '✅ Verified Active — 2-Round Adversarial Trial',
    description:
      'Port turnaround and replacement analysis: Tests Vanir maritime replacement shipments against berth draft limits and crane capacity (ORV-0042).',
  },
  {
    id: 'SCENARIO-4',
    title: 'Adversarial Decoy Trap: Complete Quay Collapse (ORV-0010)',
    category: 'Decoy Quarantined (isReal: false)',
    query:
      'Did the entire port quay collapse and get destroyed at the Orvan corridor terminal according to social posts as of 25 January 2027?',
    asOfDate: '2027-01-25',
    expectedOutcome: '🛑 Dismissed at Step 1 — Gatekeeper Rejection ("isReal": false)',
    discreditedDocs: ['ORV-0010'],
    description:
      'Fabricated rumor / decoy: Tier 4 Saga Chat rumor claims total quay destruction, which is completely refuted by official port registry ORV-0012.',
  },
  {
    id: 'SCENARIO-5',
    title: 'Premature Renewal Rumor: Agreement Extended (ORV-0043)',
    category: 'Premature Renewal (isActive: false)',
    query:
      'Was the Orvan corridor trade agreement fully renewed on 9 September 2026, meaning no active trade disruption exists as of 25 January 2027?',
    asOfDate: '2027-01-25',
    expectedOutcome: '🛑 Dismissed at Step 1 — Gatekeeper Rejection ("isActive": false)',
    discreditedDocs: ['ORV-0043'],
    description:
      'Retracted notice / false renewal: Contradicted by Tier 1 official notice ORV-0016 confirming corridor was NOT renewed and terminated in Oct 2026.',
  },
];

const PRESET_FOLLOWUPS = [
  'Why did Thor concede the port quay collapse claim?',
  'Why did Loki concede full market stabilization?',
  'What is the difference between Thor and Odin wheat estimates?',
  'What happens if the Ravik rail link freezes in February 2027?',
  'Which documents are Tier 1 official notices vs Tier 4 rumors?',
];

interface WorkflowStageInfo {
  id: string;
  stageNum: string;
  label: string;
  shortTitle: string;
  agent: string;
  agentIcon: 'eye' | 'flame' | 'shield' | 'scale' | 'swords';
  desc: string;
  mission: string;
  keyDocs: string[];
}

const WORKFLOW_STAGES: WorkflowStageInfo[] = [
  {
    id: 'VERIFY',
    stageNum: '01',
    label: 'Gatekeeper Verification',
    shortTitle: 'Verification',
    agent: 'Heimdall',
    agentIcon: 'eye',
    desc: 'Screen decoys, retractions & verify event',
    mission:
      'Heimdall scans the Runemark corpus to confirm disruption authenticity as of 25 Jan 2027, filtering premature renewal rumors (ORV-0043) and tabloid rumors (ORV-0010).',
    keyDocs: ['ORV-0016', 'ORV-0043', 'ORV-0010', 'ORV-0012'],
  },
  {
    id: 'ROUND1',
    stageNum: '02',
    label: 'Round 1 Exposure Cases',
    shortTitle: 'R1 Claims',
    agent: 'Thor & Loki',
    agentIcon: 'swords',
    desc: 'High Exposure vs Limited Exposure',
    mission:
      'Thor argues worst-case gross maritime deficit (up to 185k MT/mo); Loki argues overland rail bypass and secondary supplier reserves to establish initial bounds.',
    keyDocs: ['ORV-0009', 'ORV-0012', 'ORV-0001', 'ORV-0005'],
  },
  {
    id: 'CROSS',
    stageNum: '03',
    label: 'Cross-Exam & Concessions',
    shortTitle: 'Cross-Exam',
    agent: 'Courtroom Debate',
    agentIcon: 'flame',
    desc: 'Attacks & indisputable concessions',
    mission:
      'Thor attacks Loki’s rail capacity; Loki challenges Thor’s quay damage claim. Thor concedes quay collapse (ORV-0012 registry); Loki concedes full market stabilization.',
    keyDocs: ['ORV-0010', 'ORV-0012', 'ORV-0017', 'ORV-0050'],
  },
  {
    id: 'REMAND',
    stageNum: '04',
    label: 'Odin Sufficiency Remand',
    shortTitle: 'Remand Check',
    agent: 'Odin',
    agentIcon: 'scale',
    desc: 'Round 1 review & sufficiency check',
    mission:
      'Odin checks if evidence is complete. Siding capacity and berth turnaround remain unproven; Odin mandates Round 2 retrieval on rail sidings and port replacement capacities.',
    keyDocs: ['ORV-0050', 'ORV-0042', 'ORV-0044'],
  },
  {
    id: 'ROUND2',
    stageNum: '05',
    label: 'Round 2 Calibration',
    shortTitle: 'R2 Bounds',
    agent: 'Heimdall & Agents',
    agentIcon: 'shield',
    desc: 'Rail sidings & berth bottlenecks',
    mission:
      'Heimdall retrieves siding throughput data (ORV-0050); Thor defends high range with siding limits; Loki refines realistic rail offset (38k–48k MT/mo).',
    keyDocs: ['ORV-0050', 'ORV-0042', 'ORV-0006'],
  },
  {
    id: 'VERDICT',
    stageNum: '06',
    label: 'Judicial Adjudication',
    shortTitle: 'Final Verdict',
    agent: 'Odin (Allfather)',
    agentIcon: 'scale',
    desc: 'Executive Briefing & exposure table',
    mission:
      'Chief Justice Odin classifies all findings into Established, Contested, Conceded; calibrates balanced net exposure range; authors final Executive Intelligence Briefing.',
    keyDocs: ['ORV-0016', 'ORV-0012', 'ORV-0050', 'ORV-0042'],
  },
];

/**
 * High-End Formatted Text Parser
 * Converts **bold text** to strong tags, [DOC-ID:PX] to styled orange citation badges,
 * and bullet/numbered lines into clean, styled list elements.
 */
function renderInlineTokens(text: string): React.ReactNode[] {
  const regex = /(\*\*[^*]+\*\*|\[[A-Z]{3}-\d{4}(?::P\d+)?\])/g;
  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(text.slice(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(
        <strong key={`b-${match.index}`} style={{ fontWeight: '700', color: '#111216' }}>
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith('[') && token.endsWith(']')) {
      parts.push(
        <span
          key={`c-${match.index}`}
          style={{
            backgroundColor: '#FFF5EE',
            color: '#FF5500',
            border: '1px solid #FFD8C2',
            padding: '1px 6px',
            borderRadius: '4px',
            fontWeight: '700',
            fontSize: '11px',
            margin: '0 3px',
            display: 'inline-block',
            letterSpacing: '0.01em',
          }}
        >
          {token}
        </span>
      );
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < text.length) {
    parts.push(text.slice(lastIdx));
  }
  return parts;
}

export function FormattedResponse({ content }: { content: string }) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;

  const flushList = () => {
    if (currentList) {
      if (currentList.type === 'ul') {
        elements.push(
          <ul
            key={`ul-${elements.length}`}
            style={{
              margin: '8px 0 12px 0',
              paddingLeft: '0',
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {currentList.items.map((item, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: '1.6',
                  fontSize: '13.5px',
                  color: '#1E2026',
                }}
              >
                <span
                  style={{
                    color: '#FF5500',
                    fontWeight: '800',
                    fontSize: '16px',
                    lineHeight: '1.2',
                    marginTop: '1px',
                  }}
                >
                  •
                </span>
                <div style={{ flex: 1 }}>{renderInlineTokens(item)}</div>
              </li>
            ))}
          </ul>
        );
      } else {
        elements.push(
          <ol
            key={`ol-${elements.length}`}
            style={{
              margin: '8px 0 12px 0',
              paddingLeft: '0',
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            {currentList.items.map((item, idx) => (
              <li
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  lineHeight: '1.6',
                  fontSize: '13.5px',
                  color: '#1E2026',
                }}
              >
                <span
                  style={{
                    backgroundColor: '#111216',
                    color: '#FFFFFF',
                    borderRadius: '4px',
                    padding: '1px 6px',
                    fontSize: '11px',
                    fontWeight: '700',
                    marginTop: '2px',
                  }}
                >
                  {idx + 1}
                </span>
                <div style={{ flex: 1 }}>{renderInlineTokens(item)}</div>
              </li>
            ))}
          </ol>
        );
      }
      currentList = null;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      flushList();
      continue;
    }

    const bulletMatch = line.match(/^[\*\-•]\s+(.*)/);
    const numMatch = line.match(/^(\d+)\.\s+(.*)/);

    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList();
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[1]);
    } else if (numMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList();
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(numMatch[2]);
    } else {
      flushList();
      elements.push(
        <p
          key={`p-${elements.length}`}
          style={{
            margin: '0 0 10px 0',
            lineHeight: '1.65',
            fontSize: '13.5px',
            color: '#1E2026',
          }}
        >
          {renderInlineTokens(line)}
        </p>
      );
    }
  }
  flushList();

  return <div>{elements}</div>;
}

export default function App() {
  const [question, setQuestion] = useState('');
  const [showSampleTable, setShowSampleTable] = useState(false);
  const [asOfDate, setAsOfDate] = useState('2027-01-25');
  const [activeTab, setActiveTab] = useState<'briefing' | 'steps' | 'debate' | 'citations' | 'followup'>('briefing');
  const [isRunning, setIsRunning] = useState(false);
  const [trialTrace, setTrialTrace] = useState<any | null>(null);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [liveSteps, setLiveSteps] = useState<TrialStep[]>([]);
  const [currentStepName, setCurrentStepName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeCitationFilter, setActiveCitationFilter] = useState<number | 'ALL'>('ALL');

  // Stepper Selection State
  const [selectedStageIdx, setSelectedStageIdx] = useState<number>(0);

  // Round 1 & Round 2 View State & Independent Accordion Keys
  const [roundView, setRoundView] = useState<'ALL' | 'ROUND_1' | 'ROUND_2'>('ALL');
  const [expandedStepKeys, setExpandedStepKeys] = useState<Record<string, boolean>>({});

  // RAG Follow-up State
  const [followupQuery, setFollowupQuery] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        '**Welcome to the Courtroom Intelligence Follow-up Console.** You can ask any question regarding the case dockets, evidence citations, why Thor or Loki conceded specific claims, or secondary trade projections.\n\n* **Try Asking:** "Why did Thor concede the port quay collapse claim?"\n* **Or Ask:** "What is the difference between Thor and Odin wheat estimates?"',
      citedDocIds: ['ORV-0016', 'ORV-0012'],
    },
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Attempt to load latest trial on startup
    fetch('/api/cases/latest')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.finalBriefing) {
          setTrialTrace(data);
          setBriefing(data.finalBriefing);
          setLiveSteps(data.steps || []);
          const isTrialDismissed =
            data.finalBriefing?.isDismissed ||
            data.steps?.some((s: any) => s.stepName === 'COURT_DISMISSED');
          setSelectedStageIdx(isTrialDismissed ? 0 : 5);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const toggleStepAccordion = (key: string) => {
    setExpandedStepKeys((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRunTrial = async () => {
    setIsRunning(true);
    setLiveSteps([]);
    setCurrentStepName('Initializing Court & Gatekeeper Verification...');
    setSelectedStageIdx(0);

    try {
      const res = await fetch('/api/cases/trial', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({ question, asOfDate }),
      });

      if (res.headers.get('Content-Type')?.includes('text/event-stream') && res.body) {
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split('\n\n');
          buffer = parts.pop() || '';

          for (const part of parts) {
            if (part.startsWith('data: ')) {
              try {
                const payload = JSON.parse(part.slice(6));
                if (payload.step === 'TRIAL_FINISHED' && payload.trace) {
                  setTrialTrace(payload.trace);
                  setBriefing(payload.trace.finalBriefing);
                  setLiveSteps(payload.trace.steps || []);
                  const isTrialDismissed =
                    payload.trace.finalBriefing?.isDismissed ||
                    payload.trace.steps?.some((s: any) => s.stepName === 'COURT_DISMISSED');
                  setSelectedStageIdx(isTrialDismissed ? 0 : 5);
                  setActiveTab('briefing');
                } else if (payload.entry) {
                  const stepEntry: TrialStep = payload.entry;
                  setCurrentStepName(`[Round ${stepEntry.round}] ${stepEntry.agent}: ${stepEntry.action}`);
                  setLiveSteps((prev) => {
                    const next = [...prev, stepEntry];
                    if (stepEntry.stepName === 'COURT_DISMISSED') {
                      setSelectedStageIdx(0);
                    } else {
                      // Dynamically advance active block based on step count
                      const stage = Math.min(Math.floor((next.length / 14) * 6), 5);
                      setSelectedStageIdx(stage);
                    }
                    return next;
                  });
                }
              } catch {
                // Ignore parse errors on chunk boundaries
              }
            }
          }
        }
      } else {
        const data = await res.json();
        if (data && data.trace) {
          setTrialTrace(data.trace);
          setBriefing(data.trace.finalBriefing);
          setLiveSteps(data.trace.steps || []);
          const isTrialDismissed =
            data.trace.finalBriefing?.isDismissed ||
            data.trace.steps?.some((s: any) => s.stepName === 'COURT_DISMISSED');
          setSelectedStageIdx(isTrialDismissed ? 0 : 5);
          setActiveTab('briefing');
        }
      }
    } catch (err) {
      console.error('Failed to run trial:', err);
    } finally {
      setIsRunning(false);
      setCurrentStepName('');
    }
  };

  const handleSendFollowup = async (queryToSend?: string) => {
    const text = queryToSend || followupQuery;
    if (!text.trim() || followupLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setChatMessages((prev) => [...prev, userMsg]);
    if (!queryToSend) setFollowupQuery('');
    setFollowupLoading(true);

    try {
      const res = await fetch('/api/cases/followup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: text,
          asOfDate,
          history: chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await res.json();
      if (data && data.answer) {
        setChatMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            citedDocIds: data.citedDocIds || [],
          },
        ]);
      }
    } catch {
      setChatMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Unable to reach the judicial clerk service. Please ensure the API is running.',
        },
      ]);
    } finally {
      setFollowupLoading(false);
    }
  };

  const handleCopyBriefing = () => {
    if (!briefing) return;
    const text = `=== ODIN'S EXECUTIVE INTELLIGENCE BRIEFING ===
Case ID: ${briefing.caseId}
Clock As-Of: ${briefing.asOfDate}

EXECUTIVE SUMMARY:
${briefing.executiveSummary}

EXPOSURE TABLE:
• Thor High Range: ${briefing.exposureTable.thorExposure.min.toLocaleString()} - ${briefing.exposureTable.thorExposure.max.toLocaleString()} ${briefing.exposureTable.thorExposure.unit}
• Loki Low Range: ${briefing.exposureTable.lokiExposure.min.toLocaleString()} - ${briefing.exposureTable.lokiExposure.max.toLocaleString()} ${briefing.exposureTable.lokiExposure.unit}
• Odin Judicial Calibrated Range: ${briefing.exposureTable.odinExposure.min.toLocaleString()} - ${briefing.exposureTable.odinExposure.max.toLocaleString()} ${briefing.exposureTable.odinExposure.unit}

NEXT-QUARTER OUTLOOK (Q1 2027):
${briefing.nextQuarterOutlook.projection}
`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  // Group steps for Round 1 & Round 2 breakdown
  const round1Steps = (liveSteps.length > 0 ? liveSteps : trialTrace?.steps || []).filter(
    (s: TrialStep) => s.round === 1
  );
  const round2Steps = (liveSteps.length > 0 ? liveSteps : trialTrace?.steps || []).filter(
    (s: TrialStep) => s.round === 2
  );

  // Extract claims for debate view
  const thorClaims =
    trialTrace?.steps?.find((s: any) => s.stepName === 'THOR_ROUND_2_DEFENSE')?.details ||
    trialTrace?.steps?.find((s: any) => s.stepName === 'THOR_HIGH_CASE_SUBMITTED')?.details ||
    [];

  const lokiClaims =
    trialTrace?.steps?.find((s: any) => s.stepName === 'LOKI_ROUND_2_DEFENSE')?.details ||
    trialTrace?.steps?.find((s: any) => s.stepName === 'LOKI_LIMITED_CASE_SUBMITTED')?.details ||
    [];

  const thorAttacks =
    trialTrace?.steps?.find((s: any) => s.stepName === 'THOR_ATTACKS_LOKI')?.details || [];
  const lokiAttacks =
    trialTrace?.steps?.find((s: any) => s.stepName === 'LOKI_ATTACKS_THOR')?.details || [];

  const filteredCitations =
    briefing?.inlineCitations?.filter((c) =>
      activeCitationFilter === 'ALL' ? true : c.tier === activeCitationFilter
    ) || [];

  const isDismissed =
    briefing?.isDismissed ||
    trialTrace?.finalBriefing?.isDismissed ||
    trialTrace?.steps?.some((s: any) => s.stepName === 'COURT_DISMISSED') ||
    liveSteps?.some((s: any) => s.stepName === 'COURT_DISMISSED');

  const dismissalReason =
    briefing?.dismissalReason ||
    trialTrace?.finalBriefing?.dismissalReason ||
    trialTrace?.steps?.find((s: any) => s.stepName === 'COURT_DISMISSED')?.action ||
    liveSteps?.find((s: any) => s.stepName === 'COURT_DISMISSED')?.action ||
    'Disruption inquiry dismissed at Step 1 (Gatekeeper Rejection).';

  const selectedStage = WORKFLOW_STAGES[selectedStageIdx] || WORKFLOW_STAGES[0];
  const totalStepsCount = liveSteps.length || trialTrace?.steps?.length || 0;
  const progressPercent = isRunning
    ? Math.min(Math.round((liveSteps.length / 14) * 100), 95)
    : isDismissed
    ? 16
    : totalStepsCount > 0
    ? 100
    : 0;

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FBF9F5', color: '#121316' }}>
      {/* Top Dossier Masthead */}
      <header
        style={{
          borderBottom: '1px solid #EAE5DC',
          backgroundColor: '#FFFFFF',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 10px rgba(18, 19, 22, 0.03)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              backgroundColor: '#111216',
              color: '#FF5500',
              padding: '10px',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Scale size={24} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1
                style={{
                  fontSize: '18px',
                  fontWeight: '800',
                  margin: 0,
                  letterSpacing: '-0.02em',
                  color: '#111216',
                }}
              >
                TLE — Trial of the Nine Realms
              </h1>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  backgroundColor: '#FFF5EE',
                  color: '#FF5500',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  border: '1px solid #FFD8C2',
                  textTransform: 'uppercase',
                }}
              >
                Autonomous Multi-Agent Court
              </span>
            </div>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#57585E' }}>
              Adversarial Intelligence System for Supply Chain Disruption Adjudication
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {/* Simulated Clock Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#F5F1E9',
              border: '1px solid #DDD6C9',
              padding: '4px 10px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: '#111216',
            }}
          >
            <Calendar size={15} color="#FF5500" />
            <span>Simulated As-Of:</span>
            <input
              type="text"
              value={asOfDate}
              onChange={(e) => setAsOfDate(e.target.value)}
              title="Target As-Of Date (YYYY-MM-DD)"
              style={{
                background: 'transparent',
                border: 'none',
                color: '#FF5500',
                fontWeight: '700',
                fontSize: '13px',
                width: '88px',
                outline: 'none',
              }}
            />
          </div>

          {/* AI Engine Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#111216',
              color: '#FFFFFF',
              padding: '6px 14px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
            }}
          >
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 6px #10B981',
              }}
            />
            <Cpu size={15} color="#FF5500" />
            <span>Dynamic AI Reasoning Active</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1280px', margin: '0 auto', padding: '28px 24px' }}>
        {/* Case Docket Query Hero Section */}
        <section
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '14px',
            border: '1px solid #EAE5DC',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 20px -2px rgba(18, 19, 22, 0.05)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={18} color="#FF5500" />
              <label
                style={{
                  fontSize: '15px',
                  fontWeight: '700',
                  color: '#111216',
                  letterSpacing: '-0.01em',
                }}
              >
                Disruption Case Inquiry (Any Question May Be Pasted)
              </label>
            </div>
            <span style={{ fontSize: '12px', color: '#8A8B93' }}>
              Simulated Clock Violation Strictly Guarded (Post-25 Jan 2027 Excluded)
            </span>
          </div>

          {/* Controls Bar: Single Sample Questions Table Button & Blank Input State */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                onClick={() => setShowSampleTable(!showSampleTable)}
                style={{
                  fontSize: '12.5px',
                  fontWeight: '700',
                  backgroundColor: showSampleTable ? '#111216' : '#FFF5EE',
                  color: showSampleTable ? '#FFFFFF' : '#FF5500',
                  border: showSampleTable ? '1.5px solid #111216' : '1.5px solid #FF5500',
                  borderRadius: '8px',
                  padding: '7px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 2px 6px rgba(255, 85, 0, 0.15)',
                }}
              >
                <BookOpen size={15} />
                <span>{showSampleTable ? 'Hide Sample Questions Table' : '📋 Browse Sample Questions Table'}</span>
                <span
                  style={{
                    backgroundColor: showSampleTable ? '#FF5500' : '#111216',
                    color: '#FFFFFF',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: '800',
                  }}
                >
                  {SAMPLE_QUESTIONS_TABLE.length} Scenarios
                </span>
                {showSampleTable ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {question && (
                <button
                  onClick={() => setQuestion('')}
                  style={{
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: '#FAF8F5',
                    color: '#8A8B93',
                    border: '1px dashed #DDD6C9',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Clear docket query"
                >
                  <RotateCcw size={13} />
                  <span>Clear Docket Question</span>
                </button>
              )}
            </div>

            <span style={{ fontSize: '12px', color: '#8A8B93' }}>
              {question ? (
                <span>Docket Loaded: <strong>{question.length} chars</strong></span>
              ) : (
                <span>Blank Docket Ready — Type your question or load from Sample Table</span>
              )}
            </span>
          </div>

          {/* SINGLE SAMPLE QUESTIONS TABLE (Expandable Docket Selector) */}
          {showSampleTable && (
            <div
              style={{
                marginBottom: '16px',
                border: '1.5px solid #EAE5DC',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: '#FAF8F5',
                boxShadow: '0 4px 14px rgba(18, 19, 22, 0.04)',
              }}
            >
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  padding: '12px 18px',
                  borderBottom: '1px solid #EAE5DC',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ fontSize: '13.5px', color: '#111216' }}>
                    Runemark Disruption Case Dockets & Trap Benchmarks
                  </strong>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#57585E' }}>
                    Select an authentic disruption inquiry to test full 2-round trial adjudication, or select a decoy / inactive case to verify immediate Step 1 dismissal.
                  </p>
                </div>
                <button
                  onClick={() => setShowSampleTable(false)}
                  style={{
                    border: 'none',
                    background: 'none',
                    fontSize: '12.5px',
                    fontWeight: '700',
                    color: '#8A8B93',
                    cursor: 'pointer',
                    padding: '4px 8px',
                  }}
                >
                  ✕ Close Table
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#F5F1E9', textAlign: 'left', color: '#57585E' }}>
                      <th style={{ padding: '10px 14px', fontWeight: '700' }}>Scenario / Disruption Question</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', width: '200px' }}>Category</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', width: '220px' }}>Expected Outcome</th>
                      <th style={{ padding: '10px 14px', fontWeight: '700', textAlign: 'right', width: '120px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SAMPLE_QUESTIONS_TABLE.map((item, idx) => {
                      const isSelected = question === item.query;
                      const isDecoy = item.category.includes('isReal') || item.category.includes('isActive');

                      return (
                        <tr
                          key={item.id}
                          style={{
                            borderTop: '1px solid #EAE5DC',
                            backgroundColor: isSelected ? '#FFF5EE' : idx % 2 === 0 ? '#FFFFFF' : '#FAF8F5',
                          }}
                        >
                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: '700', color: '#111216', marginBottom: '3px' }}>
                              {item.title}
                            </div>
                            <div style={{ color: '#4B5563', fontSize: '12px', lineHeight: '1.45', marginBottom: '4px' }}>
                              "{item.query}"
                            </div>
                            <div style={{ color: '#8A8B93', fontSize: '11px', fontStyle: 'italic' }}>
                              {item.description}
                            </div>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                                backgroundColor: isDecoy ? '#FEF2F2' : '#EFF6FF',
                                color: isDecoy ? '#DC2626' : '#2563EB',
                                border: isDecoy ? '1px solid #FECACA' : '1px solid #BFDBFE',
                              }}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', verticalAlign: 'top' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11.5px',
                                fontWeight: '700',
                                color: isDecoy ? '#DC2626' : '#059669',
                              }}
                            >
                              {item.expectedOutcome}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', verticalAlign: 'top' }}>
                            <button
                              onClick={() => {
                                setQuestion(item.query);
                                setAsOfDate(item.asOfDate);
                                setShowSampleTable(false);
                              }}
                              style={{
                                backgroundColor: isSelected ? '#111216' : '#FF5500',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '6px 12px',
                                fontWeight: '700',
                                fontSize: '12px',
                                cursor: 'pointer',
                                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {isSelected ? '✓ Loaded' : 'Load Docket'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Query Input Box & CTA Button */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'stretch' }}>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              placeholder="Type or paste any supply chain disruption question across the Runemark Trade Network..."
              style={{
                flex: 1,
                backgroundColor: '#FAF8F5',
                border: '1.5px solid #DDD6C9',
                borderRadius: '10px',
                padding: '12px 16px',
                fontSize: '14px',
                color: '#111216',
                lineHeight: '1.5',
                resize: 'vertical',
                outline: 'none',
              }}
              onFocus={(e) => (e.target.style.borderColor = '#FF5500')}
              onBlur={(e) => (e.target.style.borderColor = '#DDD6C9')}
            />

            <button
              onClick={handleRunTrial}
              disabled={isRunning || !question.trim()}
              style={{
                backgroundColor: isRunning ? '#1E2026' : '#FF5500',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '10px',
                padding: '0 28px',
                fontWeight: '700',
                fontSize: '14px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: isRunning ? 'none' : '0 4px 14px rgba(255, 85, 0, 0.35)',
                cursor: isRunning ? 'not-allowed' : 'pointer',
                minWidth: '220px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Swords size={18} />
                <span>{isRunning ? 'Deliberating Trial...' : 'Convene Court'}</span>
              </div>
              <span style={{ fontSize: '11px', opacity: 0.85, fontWeight: '500' }}>
                {isRunning ? currentStepName.slice(0, 32) + '...' : 'Run 2-Round Adversarial Trial'}
              </span>
            </button>
          </div>

          {/* ========================================================= */}
          {/* HIGH-END BLOCK-BY-BLOCK PROGRESS REACH TRACKER            */}
          {/* ========================================================= */}
          <div style={{ marginTop: '24px', paddingTop: '18px', borderTop: '1px solid #EAE5DC' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={16} color={isDismissed ? '#DC2626' : '#FF5500'} />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#111216', textTransform: 'uppercase' }}>
                  Courtroom Execution Flow (Block-by-Block Protocol)
                </span>
              </div>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: '700',
                  color: isDismissed ? '#DC2626' : '#FF5500',
                }}
              >
                {isRunning
                  ? `⚡ Deliberating: ${progressPercent}% Complete`
                  : isDismissed
                  ? '🛑 Court Dismissed at Step 1 (Gatekeeper Rejection)'
                  : totalStepsCount > 0
                  ? '✓ Complete Protocol Adjudicated'
                  : 'Ready to Convene'}
              </span>
            </div>

            {/* Connecting Track Line */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '24px',
                  left: '30px',
                  right: '30px',
                  height: '4px',
                  backgroundColor: '#EAE5DC',
                  borderRadius: '2px',
                  zIndex: 0,
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '24px',
                  left: '30px',
                  width: isDismissed ? '16.6%' : `${(progressPercent / 100) * (100 - 6)}%`,
                  height: '4px',
                  backgroundColor: isDismissed ? '#DC2626' : '#FF5500',
                  boxShadow: isDismissed
                    ? '0 0 8px rgba(220, 38, 38, 0.5)'
                    : '0 0 8px rgba(255, 85, 0, 0.5)',
                  borderRadius: '2px',
                  zIndex: 0,
                  transition: 'width 0.4s ease-out',
                }}
              />

              {/* Connected Blocks Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: '12px',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {WORKFLOW_STAGES.map((stg, idx) => {
                  const isStage1 = idx === 0;
                  const isHaltedDueToDismissal = isDismissed && idx > 0;
                  const isDismissedStage1 = isDismissed && isStage1;

                  const isCompleted = isDismissed
                    ? isStage1
                    : totalStepsCount >= (idx + 1) * 2 || (!isRunning && totalStepsCount > 0);
                  const isCurrent = isRunning && selectedStageIdx === idx;
                  const isSelected = selectedStageIdx === idx;

                  return (
                    <button
                      key={stg.id}
                      onClick={() => setSelectedStageIdx(idx)}
                      style={{
                        backgroundColor: isDismissedStage1
                          ? isSelected ? '#FFFFFF' : '#FEF2F2'
                          : isHaltedDueToDismissal
                          ? '#F9FAFB'
                          : isSelected
                          ? '#FFFFFF'
                          : isCompleted
                          ? '#FAF8F5'
                          : '#FBF9F5',
                        border: isDismissedStage1
                          ? isSelected ? '2px solid #DC2626' : '1.5px solid #FCA5A5'
                          : isHaltedDueToDismissal
                          ? '1.5px dashed #E5E7EB'
                          : isSelected
                          ? '2px solid #FF5500'
                          : isCompleted
                          ? '1.5px solid #10B981'
                          : '1.5px solid #EAE5DC',
                        borderRadius: '10px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        boxShadow: isSelected
                          ? isDismissedStage1
                            ? '0 4px 14px rgba(220, 38, 38, 0.2)'
                            : '0 4px 14px rgba(255, 85, 0, 0.18)'
                          : '0 2px 4px rgba(0,0,0,0.02)',
                        cursor: 'pointer',
                        transform: isSelected ? 'translateY(-2px)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        opacity: isHaltedDueToDismissal ? 0.55 : 1,
                      }}
                    >
                      {/* Top Header inside Block */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: '800',
                            backgroundColor: isDismissedStage1
                              ? '#DC2626'
                              : isSelected
                              ? '#111216'
                              : '#F5F1E9',
                            color: isDismissedStage1
                              ? '#FFFFFF'
                              : isSelected
                              ? '#FF5500'
                              : '#57585E',
                            padding: '1px 5px',
                            borderRadius: '4px',
                          }}
                        >
                          {stg.stageNum}
                        </span>

                        {isDismissedStage1 ? (
                          <div
                            style={{
                              backgroundColor: '#FEF2F2',
                              color: '#DC2626',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                            title="Case Dismissed at Step 1"
                          >
                            <ShieldAlert size={12} strokeWidth={3} />
                          </div>
                        ) : isHaltedDueToDismissal ? (
                          <span
                            style={{
                              fontSize: '9px',
                              fontWeight: '700',
                              color: '#9CA3AF',
                              backgroundColor: '#F3F4F6',
                              padding: '1px 4px',
                              borderRadius: '3px',
                            }}
                          >
                            HALTED
                          </span>
                        ) : isCompleted ? (
                          <div
                            style={{
                              backgroundColor: '#ECFDF5',
                              color: '#10B981',
                              padding: '2px 4px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                            }}
                          >
                            <Check size={12} strokeWidth={3} />
                          </div>
                        ) : isCurrent ? (
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              backgroundColor: '#FF5500',
                              animation: 'pulseOrange 1s infinite',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: '10px', color: '#8A8B93' }}>●</span>
                        )}
                      </div>

                      {/* Block Title & Agent */}
                      <div
                        style={{
                          fontSize: '12.5px',
                          fontWeight: '800',
                          color: isDismissedStage1
                            ? '#DC2626'
                            : isHaltedDueToDismissal
                            ? '#9CA3AF'
                            : isSelected
                            ? '#FF5500'
                            : '#111216',
                          marginBottom: '2px',
                          lineHeight: '1.3',
                        }}
                      >
                        {isDismissedStage1 ? 'Rejection' : stg.shortTitle}
                      </div>
                      <div
                        style={{
                          fontSize: '11px',
                          color: isHaltedDueToDismissal ? '#9CA3AF' : '#57585E',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {isDismissedStage1
                          ? '🛑 Dismissed'
                          : isHaltedDueToDismissal
                          ? 'Halted'
                          : stg.agent}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* DYNAMIC STAGE INTEL DRAWER (INFO BELOW) */}
            <div
              style={{
                backgroundColor: isDismissed && selectedStageIdx === 0 ? '#FEF2F2' : '#FAF8F5',
                border: isDismissed && selectedStageIdx === 0 ? '1.5px solid #FCA5A5' : '1.5px solid #EAE5DC',
                borderLeft: isDismissed && selectedStageIdx === 0 ? '4px solid #DC2626' : '4px solid #FF5500',
                borderRadius: '8px',
                padding: '14px 18px',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      backgroundColor: isDismissed && selectedStageIdx === 0 ? '#DC2626' : '#111216',
                      color: isDismissed && selectedStageIdx === 0 ? '#FFFFFF' : '#FF5500',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '800',
                    }}
                  >
                    STAGE {selectedStage.stageNum} INTEL
                  </span>
                  <strong style={{ fontSize: '14px', color: '#111216' }}>
                    {isDismissed && selectedStageIdx === 0
                      ? 'Gatekeeper Heimdall — Dismissal Ruling'
                      : isDismissed && selectedStageIdx > 0
                      ? `${selectedStage.label} (HALTED)`
                      : selectedStage.label}
                  </strong>
                  <span style={{ fontSize: '12px', color: '#57585E' }}>({selectedStage.agent})</span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: '#8A8B93' }}>Corpus Targets:</span>
                  {selectedStage.keyDocs.map((doc, dIdx) => (
                    <span
                      key={dIdx}
                      style={{
                        backgroundColor: '#FFFFFF',
                        border: '1px solid #DDD6C9',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '700',
                        color: '#111216',
                      }}
                    >
                      {doc}
                    </span>
                  ))}
                </div>
              </div>

              {/* Dismissal banner or normal stage mission */}
              {isDismissed && selectedStageIdx === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ fontSize: '13.5px', color: '#991B1B', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={16} color="#DC2626" />
                    <span>Case Terminated at Step 1: Disruption event unverified or no longer active as of 25 Jan 2027.</span>
                  </div>
                  <div style={{ fontSize: '13px', color: '#7F1D1D', lineHeight: '1.5' }}>
                    {dismissalReason || briefing?.executiveSummary}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#B91C1C' }}>
                    ⚡ By halting at Step 1, judicial resources are conserved and hallucinated exposure figures are strictly prevented. Stages 02–06 were not convened.
                  </div>
                </div>
              ) : isDismissed && selectedStageIdx > 0 ? (
                <div style={{ fontSize: '13px', color: '#6B7280', fontStyle: 'italic', lineHeight: '1.5' }}>
                  This stage was bypassed because Gatekeeper Heimdall dismissed the inquiry at Step 1. No evidence was argued or remanded.
                </div>
              ) : (
                <div style={{ fontSize: '13px', color: '#334155', lineHeight: '1.5' }}>
                  {selectedStage.mission}
                </div>
              )}

              {isRunning && (
                <div style={{ fontSize: '12px', color: '#FF5500', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#FF5500', animation: 'pulseOrange 1s infinite' }} />
                  <span>Live Court Action: {currentStepName || 'Processing courtroom arguments...'}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            borderBottom: '2px solid #EAE5DC',
            marginBottom: '24px',
            backgroundColor: 'transparent',
            flexWrap: 'wrap',
          }}
        >
          <button
            onClick={() => setActiveTab('briefing')}
            style={{
              padding: '12px 18px',
              backgroundColor: activeTab === 'briefing' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'briefing' ? '#FF5500' : '#57585E',
              border: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              borderBottom: activeTab === 'briefing' ? '3px solid #FF5500' : '3px solid transparent',
              fontWeight: '700',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Scale size={16} />
            <span>Odin's Executive Briefing</span>
          </button>

          <button
            onClick={() => setActiveTab('steps')}
            style={{
              padding: '12px 18px',
              backgroundColor: activeTab === 'steps' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'steps' ? '#FF5500' : '#57585E',
              border: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              borderBottom: activeTab === 'steps' ? '3px solid #FF5500' : '3px solid transparent',
              fontWeight: '700',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Layers size={16} />
            <span>Round 1 & Round 2 Step Execution</span>
            <span
              style={{
                fontSize: '11px',
                backgroundColor: '#111216',
                color: '#FFFFFF',
                padding: '2px 6px',
                borderRadius: '10px',
              }}
            >
              {liveSteps.length || trialTrace?.steps?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('debate')}
            style={{
              padding: '12px 18px',
              backgroundColor: activeTab === 'debate' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'debate' ? '#FF5500' : '#57585E',
              border: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              borderBottom: activeTab === 'debate' ? '3px solid #FF5500' : '3px solid transparent',
              fontWeight: '700',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Swords size={16} />
            <span>Adversarial Debate & Concessions</span>
          </button>

          <button
            onClick={() => setActiveTab('citations')}
            style={{
              padding: '12px 18px',
              backgroundColor: activeTab === 'citations' ? '#FFFFFF' : 'transparent',
              color: activeTab === 'citations' ? '#FF5500' : '#57585E',
              border: 'none',
              borderTopLeftRadius: '8px',
              borderTopRightRadius: '8px',
              borderBottom: activeTab === 'citations' ? '3px solid #FF5500' : '3px solid transparent',
              fontWeight: '700',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <BookOpen size={16} />
            <span>Corpus Evidence & Credibility Tiers</span>
          </button>

          <button
            onClick={() => setActiveTab('followup')}
            style={{
              padding: '12px 18px',
              backgroundColor: activeTab === 'followup' ? '#111216' : '#FAF8F5',
              color: activeTab === 'followup' ? '#FFFFFF' : '#FF5500',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '800',
              fontSize: '13.5px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginLeft: 'auto',
              boxShadow: activeTab === 'followup' ? '0 2px 8px rgba(18,19,22,0.2)' : 'none',
            }}
          >
            <MessageSquare size={16} color="#FF5500" />
            <span>Ask Follow-Up Question (RAG)</span>
          </button>
        </div>

        {/* ========================================================= */}
        {/* TAB 1: ODIN'S EXECUTIVE BRIEFING & EXPOSURE TABLE         */}
        {/* ========================================================= */}
        {activeTab === 'briefing' && (
          <div className="fade-in">
            {/* Header Banner */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EAE5DC',
                padding: '20px 24px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      backgroundColor: '#111216',
                      color: '#FF5500',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '800',
                    }}
                  >
                    ODIN DECISION DOSSIER
                  </span>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#111216' }}>
                    Chief Justice Executive Briefing
                  </h2>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#57585E' }}>
                  Case ID: <code>{briefing?.caseId || 'CASE-RUNEMARK-STANDBY'}</code> | Simulated As-Of: {asOfDate} | Status: Formally Adjudicated
                </p>
              </div>

              <button
                onClick={handleCopyBriefing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: copied ? '#ECFDF5' : '#F5F1E9',
                  color: copied ? '#10B981' : '#111216',
                  border: copied ? '1px solid #A7F3D0' : '1px solid #DDD6C9',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: '600',
                }}
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                <span>{copied ? 'Copied Briefing!' : 'Copy Briefing'}</span>
              </button>
            </div>

            {/* If Court was Dismissed at Step 1, render the Gatekeeper Dismissal Dossier */}
            {isDismissed ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '14px',
                  border: '2px solid #F87171',
                  padding: '28px',
                  boxShadow: '0 6px 24px rgba(220, 38, 38, 0.08)',
                  marginBottom: '24px',
                }}
              >
                {/* Hero Dismissal Banner */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', marginBottom: '22px' }}>
                  <div
                    style={{
                      backgroundColor: '#FEF2F2',
                      color: '#DC2626',
                      padding: '16px',
                      borderRadius: '12px',
                      border: '1.5px solid #FECACA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldAlert size={38} strokeWidth={2.2} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span
                        style={{
                          backgroundColor: '#DC2626',
                          color: '#FFFFFF',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          letterSpacing: '0.04em',
                        }}
                      >
                        DISMISSED AT INITIAL STEP 1
                      </span>
                      <span
                        style={{
                          backgroundColor: '#FFF5EE',
                          color: '#FF5500',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '700',
                          border: '1px solid #FFD8C2',
                        }}
                      >
                        Heimdall Gatekeeper Screen
                      </span>
                    </div>

                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#111216', margin: '0 0 6px 0' }}>
                      Case Dismissed: Disruption Event Invalid or Inactive
                    </h2>
                    <p style={{ margin: 0, fontSize: '13px', color: '#57585E', lineHeight: '1.5' }}>
                      Simulated As-Of Date: <strong>{asOfDate}</strong> | Docket: <code>{briefing?.caseId || 'CASE-DISMISSED'}</code> | Status: <strong>Dismissed at Step 1 (Gatekeeper Rejection)</strong>
                    </p>
                  </div>
                </div>

                {/* Primary Dismissal Finding Box */}
                <div
                  style={{
                    backgroundColor: '#FAF8F5',
                    border: '1.5px solid #EAE5DC',
                    borderLeft: '4px solid #DC2626',
                    borderRadius: '8px',
                    padding: '18px 20px',
                    marginBottom: '22px',
                  }}
                >
                  <div style={{ fontSize: '12.5px', fontWeight: '800', color: '#DC2626', marginBottom: '6px', textTransform: 'uppercase' }}>
                    Gatekeeper Heimdall's Verdict & Rationale
                  </div>
                  <div style={{ fontSize: '14px', color: '#111216', lineHeight: '1.6', fontWeight: '500' }}>
                    <FormattedResponse content={briefing?.executiveSummary || dismissalReason} />
                  </div>
                </div>

                {/* In-depth Conceptual Breakdown: "isReal": false vs "isActive": false */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '16px',
                    marginBottom: '22px',
                  }}
                >
                  {/* Meaning of isReal: false */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #FECACA',
                      borderRadius: '10px',
                      padding: '18px',
                      boxShadow: '0 2px 8px rgba(220, 38, 38, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <XCircle size={18} color="#DC2626" />
                      <strong style={{ fontSize: '14px', color: '#991B1B' }}>
                        Meaning of "isReal": false
                      </strong>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.6', margin: 0 }}>
                      The alleged disruption event <strong>does not exist</strong> in verified Runemark records, or is based purely on an unverified rumor, tabloid fabrication, or adversarial decoy. For example, Tier 4 Saga Chat rumors claim the entire port quay was destroyed (ORV-0010), but official registries (ORV-0012) prove port infrastructure remained intact. Heimdall catches and quarantines these decoys immediately at Step 1.
                    </p>
                  </div>

                  {/* Meaning of isActive: false */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '1.5px solid #FED7AA',
                      borderRadius: '10px',
                      padding: '18px',
                      boxShadow: '0 2px 8px rgba(234, 88, 12, 0.04)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                      <AlertCircle size={18} color="#EA580C" />
                      <strong style={{ fontSize: '14px', color: '#9A3412' }}>
                        Meaning of "isActive": false
                      </strong>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4B5563', lineHeight: '1.6', margin: 0 }}>
                      The disruption event may have occurred historically, but is <strong>already resolved, concluded, or officially cancelled</strong> prior to the simulated clock date ({asOfDate}). Because operations are normalized or baseline trade flows are restored, there is zero ongoing supply deficit to adjudicate. Proceeding would generate false exposure projections.
                    </p>
                  </div>
                </div>

                {/* Quarantined Doc Evidence & Traps */}
                {briefing?.inlineCitations && briefing.inlineCitations.length > 0 && (
                  <div
                    style={{
                      backgroundColor: '#FAF8F5',
                      border: '1px solid #EAE5DC',
                      borderRadius: '10px',
                      padding: '18px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#111216', marginBottom: '10px' }}>
                      Quarantined Traps & Discredited Evidence:
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {briefing.inlineCitations.map((cit, cIdx) => (
                        <div
                          key={cIdx}
                          style={{
                            backgroundColor: '#FFFFFF',
                            border: '1px solid #EAE5DC',
                            borderRadius: '6px',
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                backgroundColor: '#FEF2F2',
                                color: '#DC2626',
                                border: '1px solid #FECACA',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '800',
                              }}
                            >
                              {cit.docId}
                            </span>
                            <span style={{ fontSize: '12.5px', color: '#4B5563' }}>
                              {cit.outlet} — {cit.quote}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#DC2626', fontWeight: '700' }}>
                            TRAP / QUARANTINED
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notice on Skipped Exposure Rounds */}
                <div
                  style={{
                    backgroundColor: '#111216',
                    color: '#FFFFFF',
                    borderRadius: '10px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        backgroundColor: '#FF5500',
                        color: '#FFFFFF',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: '800',
                      }}
                    >
                      ODIN ALLFATHER PROTOCOL
                    </span>
                    <span style={{ fontSize: '13px', color: '#E4E4E7' }}>
                      Courtroom rounds 2 & 3 were halted at Step 1 to prevent uncorroborated exposure calculations.
                    </span>
                  </div>
                  <button
                    onClick={() => setActiveTab('steps')}
                    style={{
                      backgroundColor: '#27272A',
                      color: '#FFFFFF',
                      border: '1px solid #3F3F46',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    View Step Execution Trace →
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 3 Separate Exposure Ranges (The Core Deliverable) */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                  }}
                >
                  {/* Card 1: Thor High Exposure */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1.5px solid #FECACA',
                      padding: '20px',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#EF4444' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444', textTransform: 'uppercase' }}>
                        Thor (Prosecution)
                      </span>
                      <span
                        style={{
                          backgroundColor: '#FEF2F2',
                          color: '#EF4444',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Worst-Case Bounds
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#111216', marginBottom: '4px' }}>
                      {briefing?.exposureTable?.thorExposure
                        ? `${briefing.exposureTable.thorExposure.min.toLocaleString()} – ${briefing.exposureTable.thorExposure.max.toLocaleString()}`
                        : '140,000 – 185,000'}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#57585E', marginLeft: '6px' }}>MT/mo</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#57585E' }}>
                      {briefing?.exposureTable?.thorExposure?.commodity || 'Gross Sea Import Deficit'}
                    </div>
                  </div>

                  {/* Card 2: Loki Low Exposure */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '1.5px solid #A7F3D0',
                      padding: '20px',
                      boxShadow: '0 4px 12px rgba(16, 185, 129, 0.05)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#10B981' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', textTransform: 'uppercase' }}>
                        Loki (Defense)
                      </span>
                      <span
                        style={{
                          backgroundColor: '#ECFDF5',
                          color: '#10B981',
                          fontSize: '11px',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '12px',
                        }}
                      >
                        Mitigated Bounds
                      </span>
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '800', color: '#111216', marginBottom: '4px' }}>
                      {briefing?.exposureTable?.lokiExposure
                        ? `${briefing.exposureTable.lokiExposure.min.toLocaleString()} – ${briefing.exposureTable.lokiExposure.max.toLocaleString()}`
                        : '20,000 – 48,000'}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#57585E', marginLeft: '6px' }}>MT/mo</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#57585E' }}>
                      {briefing?.exposureTable?.lokiExposure?.commodity || 'Overland Rail & Reserves Offset'}
                    </div>
                  </div>

                  {/* Card 3: Odin Calibrated Judicial Range */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '12px',
                      border: '2px solid #FF5500',
                      padding: '20px',
                      boxShadow: '0 6px 20px rgba(255, 85, 0, 0.12)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}
                  >
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', backgroundColor: '#FF5500' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#FF5500', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Scale size={14} />
                        Odin Judicial Ruling
                      </span>
                      <span
                        style={{
                          backgroundColor: '#FFF5EE',
                          color: '#FF5500',
                          fontSize: '11px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          border: '1px solid #FFD8C2',
                        }}
                      >
                        ★ Calibrated Consensus
                      </span>
                    </div>
                    <div style={{ fontSize: '26px', fontWeight: '800', color: '#111216', marginBottom: '4px' }}>
                      {briefing?.exposureTable?.odinExposure
                        ? `${briefing.exposureTable.odinExposure.min.toLocaleString()} – ${briefing.exposureTable.odinExposure.max.toLocaleString()}`
                        : '86,000 – 125,000'}
                      <span style={{ fontSize: '13px', fontWeight: '500', color: '#57585E', marginLeft: '6px' }}>MT/mo</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#57585E', fontWeight: '600' }}>
                      {briefing?.exposureTable?.odinExposure?.commodity || 'Net Commercial Disruption'}
                    </div>
                  </div>
                </div>

                {/* Executive Summary Card with Markdown & Bullet Formatting */}
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #EAE5DC',
                    padding: '24px',
                    marginBottom: '24px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', fontWeight: '800', margin: '0 0 12px 0', color: '#111216' }}>
                    Executive Intelligence Synthesis
                  </h3>
                  <div
                    style={{
                      fontSize: '14px',
                      backgroundColor: '#FAF8F5',
                      padding: '20px',
                      borderRadius: '10px',
                      border: '1px solid #EAE5DC',
                    }}
                  >
                    <FormattedResponse
                      content={
                        briefing?.executiveSummary ||
                        'As of 25 January 2027, the termination of the Orvan Corridor Agreement (expired 10 September 2026 without renewal) triggered a severe 60%–70% drop in maritime grain loadings from Orvan Grain Port [ORV-0012:P2]. Commercial exposure is partially cushioned by overland diversions via the Ravik Rail Link (~38k–48k MT/mo, [ORV-0050:P2]). Thor conceded physical quay collapse [ORV-0010:P1, ORV-0012:P1]. Net commercial deficit is calibrated at 86,000–125,000 MT/month for Midgard.'
                      }
                    />
                  </div>
                </div>

                {/* Adjudicated Findings: Established, Contested, Conceded */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '16px',
                    marginBottom: '24px',
                  }}
                >
                  {/* Column 1: Established Findings */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#111216' }}>
                        Established Facts ({briefing?.establishedFindings?.length || 2})
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #10B981', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                        <strong>Port Loading Collapse:</strong> Terminals operating at 30%–38% of baseline [ORV-0012:P2, Tier 1].
                      </div>
                      <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #10B981', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                        <strong>Ravik Rail Active:</strong> Overland bypass delivering 38,000–48,000 MT/month [ORV-0005:P2, Tier 2].
                      </div>
                    </div>
                  </div>

                  {/* Column 2: Contested Claims */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <AlertCircle size={18} color="#F59E0B" />
                      <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#111216' }}>
                        Contested Inferences ({briefing?.contestedFindings?.length || 1})
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #F59E0B', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                        <strong>Vanir Substitution vs Berth Wait:</strong> Secondary port berthing delays cap net relief [ORV-0042:P1].
                      </div>
                    </div>
                  </div>

                  {/* Column 3: Conceded Claims */}
                  <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                      <XCircle size={18} color="#EF4444" />
                      <h4 style={{ fontSize: '14px', fontWeight: '800', margin: 0, color: '#111216' }}>
                        Conceded Claims ({briefing?.concededFindings?.length || 2})
                      </h4>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #EF4444', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                        <strong>Thor Conceded Quay Collapse:</strong> Tabloid rumor [ORV-0010:P1] debunked by port registry [ORV-0012:P2].
                      </div>
                      <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #EF4444', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                        <strong>Loki Conceded Full Stabilization:</strong> Spot price spikes [ORV-0017:P1] refute full market equilibrium.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Next-Quarter Outlook */}
                <div style={{ backgroundColor: '#111216', color: '#FFFFFF', borderRadius: '12px', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                    <span style={{ backgroundColor: '#FF5500', color: '#FFFFFF', padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '800' }}>
                      Q1 2027 OUTLOOK
                    </span>
                    <h4 style={{ fontSize: '15px', fontWeight: '700', margin: 0, color: '#FFFFFF' }}>
                      Forward Trajectory & Stated Assumptions
                    </h4>
                  </div>
                  <p style={{ fontSize: '14px', lineHeight: '1.6', color: '#D4D4D8', margin: '0 0 16px 0' }}>
                    {briefing?.nextQuarterOutlook?.projection ||
                      'Net import deficits will persist at 35%–45% below historical baselines before secondary shipping routes and rail terminal expansions take full effect.'}
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {briefing?.nextQuarterOutlook?.statedAssumptions?.map((asm, idx) => (
                      <span key={idx} style={{ backgroundColor: '#1E2026', border: '1px solid #2E3039', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', color: '#A1A1AA' }}>
                        ✓ {asm}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: STEP-BY-STEP ROUND 1 & ROUND 2 BREAKDOWN           */}
        {/* ========================================================= */}
        {activeTab === 'steps' && (
          <div className="fade-in">
            {/* View Mode Segmented Controls */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#FFFFFF',
                padding: '12px 18px',
                borderRadius: '10px',
                border: '1px solid #EAE5DC',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Layers size={18} color="#FF5500" />
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#111216' }}>
                  Execution Rounds View Mode:
                </span>
              </div>

              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => setRoundView('ALL')}
                  style={{
                    backgroundColor: roundView === 'ALL' ? '#111216' : '#FAF8F5',
                    color: roundView === 'ALL' ? '#FFFFFF' : '#57585E',
                    border: '1px solid #DDD6C9',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                  }}
                >
                  ⚡ Both Rounds (Side-by-Side)
                </button>
                <button
                  onClick={() => setRoundView('ROUND_1')}
                  style={{
                    backgroundColor: roundView === 'ROUND_1' ? '#FF5500' : '#FAF8F5',
                    color: roundView === 'ROUND_1' ? '#FFFFFF' : '#57585E',
                    border: '1px solid #DDD6C9',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                  }}
                >
                  1️⃣ Round 1 (Confrontation)
                </button>
                <button
                  onClick={() => setRoundView('ROUND_2')}
                  style={{
                    backgroundColor: roundView === 'ROUND_2' ? '#10B981' : '#FAF8F5',
                    color: roundView === 'ROUND_2' ? '#FFFFFF' : '#57585E',
                    border: '1px solid #DDD6C9',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12.5px',
                    fontWeight: '700',
                  }}
                >
                  2️⃣ Round 2 (Remand & Adjudication)
                </button>
              </div>
            </div>

            {/* If Court Dismissed at Step 1, display dismiss alert banner */}
            {isDismissed && (
              <div
                style={{
                  backgroundColor: '#FEF2F2',
                  border: '1.5px solid #FCA5A5',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                }}
              >
                <ShieldAlert size={22} color="#DC2626" style={{ flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#991B1B', fontSize: '13.5px' }}>
                    Court Proceedings Terminated at Step 1 (Gatekeeper Rejection)
                  </strong>
                  <div style={{ color: '#7F1D1D', fontSize: '12.5px', marginTop: '2px', lineHeight: '1.45' }}>
                    {dismissalReason} — Because the disruption inquiry failed verification ("isReal": false or "isActive": false), only Heimdall Gatekeeper Verification was executed. Round 2 was bypassed.
                  </div>
                </div>
              </div>
            )}

            {/* Grid Container with minmax(0, 1fr) to guarantee Round 2 never shrinks */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns:
                  roundView === 'ALL'
                    ? 'minmax(0, 1fr) minmax(0, 1fr)'
                    : 'minmax(0, 1fr)',
                gap: '24px',
                alignItems: 'start',
                marginBottom: '24px',
              }}
            >
              {/* ROUND 1 COMPONENT */}
              {(roundView === 'ALL' || roundView === 'ROUND_1') && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1.5px solid #EAE5DC',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(18, 19, 22, 0.03)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                      borderBottom: '1px solid #EAE5DC',
                      paddingBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            backgroundColor: '#111216',
                            color: '#FF5500',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          ROUND 1
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111216' }}>
                          Initial Confrontation & Attacks
                        </h3>
                      </div>
                      <span style={{ fontSize: '12px', color: '#57585E', marginTop: '2px', display: 'block' }}>
                        Heimdall Verification ➔ Thor & Loki Claims ➔ Cross-Exam Attacks
                      </span>
                    </div>

                    <span style={{ backgroundColor: '#FFF5EE', color: '#FF5500', fontWeight: '700', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                      {round1Steps.length} Steps
                    </span>
                  </div>

                  {/* Steps List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {round1Steps.map((step: TrialStep, idx: number) => {
                      const stepKey = `R1-${idx}`;
                      const isExpanded = !!expandedStepKeys[stepKey];

                      return (
                        <div
                          key={stepKey}
                          style={{
                            backgroundColor: isExpanded ? '#FFFFFF' : '#FAF8F5',
                            borderRadius: '8px',
                            border: isExpanded ? '1.5px solid #FF5500' : '1px solid #EAE5DC',
                            padding: '12px 14px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            onClick={() => toggleStepAccordion(stepKey)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ fontWeight: '800', fontSize: '11px', backgroundColor: '#111216', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>
                                #{idx + 1}
                              </span>
                              <strong style={{ fontSize: '13px', color: '#FF5500', whiteSpace: 'nowrap' }}>{step.agent}:</strong>
                              <span style={{ fontSize: '12.5px', color: '#111216', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {step.action}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                              <span style={{ fontSize: '10px', color: '#8A8B93', fontFamily: 'monospace' }}>
                                {step.stepName}
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Expanded Step Details */}
                          {isExpanded && (
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '10px',
                                borderTop: '1px dashed #DDD6C9',
                                fontSize: '12px',
                                wordBreak: 'break-word',
                              }}
                            >
                              {Array.isArray(step.details) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {step.details.map((item: any, dIdx: number) => (
                                    <div key={dIdx} style={{ backgroundColor: '#FAF8F5', padding: '10px', borderRadius: '6px', border: '1px solid #EAE5DC' }}>
                                      {item.claimText && <div style={{ fontWeight: '600', color: '#111216', marginBottom: '4px' }}>{item.claimText}</div>}
                                      {item.challengeText && <div style={{ color: '#EF4444', fontStyle: 'italic', marginBottom: '4px' }}>"{item.challengeText}"</div>}
                                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginTop: '4px' }}>
                                        {item.category && <span style={{ backgroundColor: '#111216', color: '#FFF', padding: '1px 5px', borderRadius: '3px', fontSize: '10px' }}>{item.category}</span>}
                                        {item.citedDocIds && <span style={{ color: '#FF5500', fontWeight: '700', fontSize: '11px' }}>Docs: {item.citedDocIds.join(', ')}</span>}
                                        {item.exposureEstimate && <span style={{ color: '#10B981', fontWeight: '700', fontSize: '11px' }}>Bound: {item.exposureEstimate.min.toLocaleString()} - {item.exposureEstimate.max.toLocaleString()} {item.exposureEstimate.unit}</span>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              ) : typeof step.details === 'object' && step.details !== null ? (
                                <pre
                                  style={{
                                    margin: 0,
                                    backgroundColor: '#FAF8F5',
                                    border: '1px solid #EAE5DC',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    overflowX: 'auto',
                                    color: '#334155',
                                    maxHeight: '220px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {JSON.stringify(step.details, null, 2)}
                                </pre>
                              ) : (
                                <div style={{ color: '#57585E' }}>{String(step.details || 'Step completed successfully.')}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ROUND 2 COMPONENT (Symmetric, guaranteed to never shrink) */}
              {(roundView === 'ALL' || roundView === 'ROUND_2') && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1.5px solid #EAE5DC',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(18, 19, 22, 0.03)',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '16px',
                      borderBottom: '1px solid #EAE5DC',
                      paddingBottom: '12px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span
                          style={{
                            backgroundColor: '#10B981',
                            color: '#FFFFFF',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                          }}
                        >
                          ROUND 2
                        </span>
                        <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111216' }}>
                          Sufficiency Remand & Adjudication
                        </h3>
                      </div>
                      <span style={{ fontSize: '12px', color: '#57585E', marginTop: '2px', display: 'block' }}>
                        Odin Remand ➔ Siding Re-Search ➔ Calibrated Bounds ➔ Briefing
                      </span>
                    </div>

                    <span style={{ backgroundColor: '#ECFDF5', color: '#10B981', fontWeight: '700', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                      {round2Steps.length} Steps
                    </span>
                  </div>

                  {/* Steps List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {isDismissed ? (
                      <div
                        style={{
                          backgroundColor: '#FAF8F5',
                          border: '1.5px dashed #DDD6C9',
                          borderRadius: '8px',
                          padding: '24px 18px',
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            backgroundColor: '#FEF2F2',
                            color: '#DC2626',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '800',
                            marginBottom: '8px',
                          }}
                        >
                          <ShieldAlert size={13} />
                          ROUND 2 HALTED AT STEP 1
                        </div>
                        <div style={{ fontSize: '13.5px', fontWeight: '700', color: '#111216', marginBottom: '4px' }}>
                          Round 2 Adjudication Was Not Convened
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', color: '#57585E', lineHeight: '1.5' }}>
                          Gatekeeper Heimdall dismissed the inquiry at Step 1 due to invalidity ("isReal": false) or inactive status ("isActive": false). Siding re-search, Odin's sufficiency loop, and exposure calibration were safely bypassed.
                        </p>
                      </div>
                    ) : round2Steps.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px', color: '#8A8B93', fontSize: '13px' }}>
                        No Round 2 steps recorded yet. Convene a valid trial to observe Round 2 execution.
                      </div>
                    ) : (
                      round2Steps.map((step: TrialStep, idx: number) => {
                      const stepKey = `R2-${idx}`;
                      const isExpanded = !!expandedStepKeys[stepKey];

                      return (
                        <div
                          key={stepKey}
                          style={{
                            backgroundColor: isExpanded ? '#FFFFFF' : '#FAF8F5',
                            borderRadius: '8px',
                            border: isExpanded ? '1.5px solid #10B981' : '1px solid #EAE5DC',
                            padding: '12px 14px',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <div
                            onClick={() => toggleStepAccordion(stepKey)}
                            style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ fontWeight: '800', fontSize: '11px', backgroundColor: '#10B981', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>
                                #{idx + 1}
                              </span>
                              <strong style={{ fontSize: '13px', color: '#10B981', whiteSpace: 'nowrap' }}>{step.agent}:</strong>
                              <span style={{ fontSize: '12.5px', color: '#111216', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {step.action}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '8px' }}>
                              <span style={{ fontSize: '10px', color: '#8A8B93', fontFamily: 'monospace' }}>
                                {step.stepName}
                              </span>
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </div>
                          </div>

                          {/* Expanded Step Details */}
                          {isExpanded && (
                            <div
                              style={{
                                marginTop: '12px',
                                paddingTop: '10px',
                                borderTop: '1px dashed #DDD6C9',
                                fontSize: '12px',
                                wordBreak: 'break-word',
                              }}
                            >
                              {Array.isArray(step.details) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {step.details.map((item: any, dIdx: number) => (
                                    <div key={dIdx} style={{ backgroundColor: '#FAF8F5', padding: '10px', borderRadius: '6px', border: '1px solid #EAE5DC' }}>
                                      {item.ruling && (
                                        <div style={{ display: 'flex', gap: '6px', marginBottom: '4px' }}>
                                          <span style={{ backgroundColor: item.ruling === 'Established' ? '#10B981' : item.ruling === 'Contested' ? '#F59E0B' : '#EF4444', color: '#FFF', padding: '1px 6px', borderRadius: '3px', fontWeight: '700', fontSize: '11px' }}>
                                            {item.ruling}
                                          </span>
                                          <span style={{ fontSize: '11px', color: '#57585E' }}>Nature: {item.nature}</span>
                                        </div>
                                      )}
                                      {item.reasoning && <div style={{ color: '#111216', fontSize: '12.5px' }}>{item.reasoning}</div>}
                                      {item.claimText && <div style={{ fontWeight: '600', color: '#111216' }}>{item.claimText}</div>}
                                    </div>
                                  ))}
                                </div>
                              ) : typeof step.details === 'object' && step.details !== null ? (
                                <pre
                                  style={{
                                    margin: 0,
                                    backgroundColor: '#FAF8F5',
                                    border: '1px solid #EAE5DC',
                                    padding: '10px',
                                    borderRadius: '6px',
                                    overflowX: 'auto',
                                    color: '#334155',
                                    maxHeight: '220px',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word',
                                  }}
                                >
                                  {JSON.stringify(step.details, null, 2)}
                                </pre>
                              ) : (
                                <div style={{ color: '#57585E' }}>{String(step.details || 'Step completed successfully.')}</div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: ADVERSARIAL DEBATE (THOR VS LOKI)                  */}
        {/* ========================================================= */}
        {activeTab === 'debate' && (
          <div className="fade-in">
            {/* Sufficiency Loop Remand Banner */}
            <div
              style={{
                backgroundColor: '#FFF5EE',
                border: '1.5px solid #FFD8C2',
                borderRadius: '10px',
                padding: '14px 20px',
                marginBottom: '20px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RotateCcw size={18} color="#FF5500" />
                <span style={{ fontSize: '13.5px', color: '#111216', fontWeight: '600' }}>
                  <strong>Odin Sufficiency Loop (FR4.3):</strong> Round 1 evidence was evaluated; Odin remanded case to Heimdall for targeted Round 2 retrieval on rail siding bottlenecks (ORV-0050) & berth queues.
                </span>
              </div>
              <span
                style={{
                  backgroundColor: '#111216',
                  color: '#FF5500',
                  fontSize: '12px',
                  fontWeight: '800',
                  padding: '4px 10px',
                  borderRadius: '6px',
                }}
              >
                2 Rounds Demonstrated
              </span>
            </div>

            {/* Split Adversarial Columns */}
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '20px', marginBottom: '24px', alignItems: 'start' }}>
              {/* Thor Column */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #FECACA',
                  padding: '20px',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Flame size={20} color="#EF4444" />
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#EF4444' }}>
                      Thor (The Alarm)
                    </h3>
                  </div>
                  <span style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    Prosecution Case
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {thorClaims.map((claim: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: claim.isConceded ? '#F5F5F7' : '#FAF8F5',
                        border: claim.isConceded ? '1px dashed #CBD5E1' : '1px solid #EAE5DC',
                        borderRadius: '8px',
                        padding: '14px',
                        borderLeft: claim.isConceded ? '4px solid #94A3B8' : '4px solid #EF4444',
                        opacity: claim.isConceded ? 0.75 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: '#111216' }}>{claim.claimId}</strong>
                        <span style={{ fontSize: '11px', backgroundColor: claim.isConceded ? '#EF4444' : '#111216', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                          {claim.isConceded ? 'CONCEDED' : claim.isFactOrInference}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                        {claim.claimText}
                      </p>
                      {claim.isConceded && (
                        <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600' }}>
                          ✕ Concession Reason: {claim.concessionReason}
                        </div>
                      )}
                      <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#64748B' }}>
                        Citing: {claim.citedDocIds?.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Loki Column */}
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1.5px solid #A7F3D0',
                  padding: '20px',
                  boxShadow: '0 4px 14px rgba(16, 185, 129, 0.05)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={20} color="#10B981" />
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#10B981' }}>
                      Loki (The Trickster)
                    </h3>
                  </div>
                  <span style={{ backgroundColor: '#ECFDF5', color: '#10B981', padding: '3px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '700' }}>
                    Defense Mitigation
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {lokiClaims.map((claim: any, idx: number) => (
                    <div
                      key={idx}
                      style={{
                        backgroundColor: claim.isConceded ? '#F5F5F7' : '#FAF8F5',
                        border: claim.isConceded ? '1px dashed #CBD5E1' : '1px solid #EAE5DC',
                        borderRadius: '8px',
                        padding: '14px',
                        borderLeft: claim.isConceded ? '4px solid #94A3B8' : '4px solid #10B981',
                        opacity: claim.isConceded ? 0.75 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <strong style={{ fontSize: '13px', color: '#111216' }}>{claim.claimId}</strong>
                        <span style={{ fontSize: '11px', backgroundColor: claim.isConceded ? '#EF4444' : '#111216', color: '#FFFFFF', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
                          {claim.isConceded ? 'CONCEDED' : claim.isFactOrInference}
                        </span>
                      </div>
                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', lineHeight: '1.5', color: '#334155' }}>
                        {claim.claimText}
                      </p>
                      {claim.isConceded && (
                        <div style={{ backgroundColor: '#FEF2F2', color: '#EF4444', padding: '8px 10px', borderRadius: '6px', fontSize: '11.5px', fontWeight: '600' }}>
                          ✕ Concession Reason: {claim.concessionReason}
                        </div>
                      )}
                      <div style={{ marginTop: '8px', fontSize: '11.5px', color: '#64748B' }}>
                        Citing: {claim.citedDocIds?.join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Cross-Examination Rebuttal Log */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px' }}>
              <h4 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px 0', color: '#111216' }}>
                ⚔️ Cross-Examination Attacks & Counter-Proof
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
                <div style={{ backgroundColor: '#FAF8F5', padding: '14px', borderRadius: '8px', border: '1px solid #EAE5DC' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#EF4444', marginBottom: '4px' }}>
                    Thor attacks Loki's Rail Offset:
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    "{thorAttacks[0]?.challengeText || 'Overstated rail throughput; narrow-gauge sidings (ORV-0050) cap overland relief.'}"
                  </div>
                </div>

                <div style={{ backgroundColor: '#FAF8F5', padding: '14px', borderRadius: '8px', border: '1px solid #EAE5DC' }}>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#10B981', marginBottom: '4px' }}>
                    Loki attacks Thor's Quay Collapse Claim:
                  </div>
                  <div style={{ fontSize: '13px', color: '#334155' }}>
                    "{lokiAttacks[0]?.challengeText || 'Thor relies on Tier 4 rumor ORV-0010; port loading indices (ORV-0012) prove berths remain operating.'}"
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: SOURCE CITATIONS & RELIABILITY TIERS               */}
        {/* ========================================================= */}
        {activeTab === 'citations' && (
          <div className="fade-in">
            {/* Reliability Tier Legend */}
            <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: '800', margin: '0 0 12px 0', color: '#111216' }}>
                Runemark Source Credibility Framework (ATL-0012 Standard)
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                <button
                  onClick={() => setActiveCitationFilter(activeCitationFilter === 1 ? 'ALL' : 1)}
                  style={{
                    backgroundColor: activeCitationFilter === 1 ? '#111216' : '#FAF8F5',
                    color: activeCitationFilter === 1 ? '#FFFFFF' : '#111216',
                    border: '1px solid #EAE5DC',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#38BDF8' }}>TIER 1 (Weight: 1.35x)</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>Official Notices</div>
                  <div style={{ fontSize: '11px', color: activeCitationFilter === 1 ? '#D4D4D8' : '#71717A' }}>
                    Ministries & port registries
                  </div>
                </button>

                <button
                  onClick={() => setActiveCitationFilter(activeCitationFilter === 2 ? 'ALL' : 2)}
                  style={{
                    backgroundColor: activeCitationFilter === 2 ? '#111216' : '#FAF8F5',
                    color: activeCitationFilter === 2 ? '#FFFFFF' : '#111216',
                    border: '1px solid #EAE5DC',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#10B981' }}>TIER 2 (Weight: 1.10x)</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>Trade & Business Press</div>
                  <div style={{ fontSize: '11px', color: activeCitationFilter === 2 ? '#D4D4D8' : '#71717A' }}>
                    Raven Wire, Cargo Weekly
                  </div>
                </button>

                <button
                  onClick={() => setActiveCitationFilter(activeCitationFilter === 3 ? 'ALL' : 3)}
                  style={{
                    backgroundColor: activeCitationFilter === 3 ? '#111216' : '#FAF8F5',
                    color: activeCitationFilter === 3 ? '#FFFFFF' : '#111216',
                    border: '1px solid #EAE5DC',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#F59E0B' }}>TIER 3 (Weight: 0.85x)</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>Regional Analyst Notes</div>
                  <div style={{ fontSize: '11px', color: activeCitationFilter === 3 ? '#D4D4D8' : '#71717A' }}>
                    Tide Research, Ledger Analytics
                  </div>
                </button>

                <button
                  onClick={() => setActiveCitationFilter(activeCitationFilter === 4 ? 'ALL' : 4)}
                  style={{
                    backgroundColor: activeCitationFilter === 4 ? '#111216' : '#FAF8F5',
                    color: activeCitationFilter === 4 ? '#FFFFFF' : '#111216',
                    border: '1px solid #EAE5DC',
                    padding: '12px',
                    borderRadius: '8px',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#EF4444' }}>TIER 4 (Weight: 0.50x)</div>
                  <div style={{ fontSize: '13px', fontWeight: '700' }}>Tabloids & Social Posts</div>
                  <div style={{ fontSize: '11px', color: activeCitationFilter === 4 ? '#D4D4D8' : '#71717A' }}>
                    Saga Chat, Trade Whisper (Traps)
                  </div>
                </button>
              </div>
            </div>

            {/* Citations List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {filteredCitations.map((cite, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '10px',
                    border: '1px solid #EAE5DC',
                    padding: '16px 20px',
                    boxShadow: '0 2px 6px rgba(18, 19, 22, 0.02)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ backgroundColor: '#111216', color: '#FF5500', padding: '3px 8px', borderRadius: '6px', fontWeight: '700', fontSize: '12px' }}>
                        {cite.citationMarker}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#111216' }}>{cite.docId} — {cite.outlet}</strong>
                    </div>
                    <span
                      style={{
                        backgroundColor:
                          cite.tier === 1 ? '#ECFDF5' : cite.tier === 2 ? '#F0FDF4' : cite.tier === 3 ? '#FFFBEB' : '#FEF2F2',
                        color:
                          cite.tier === 1 ? '#047857' : cite.tier === 2 ? '#15803D' : cite.tier === 3 ? '#B45309' : '#B91C1C',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        fontSize: '11.5px',
                        fontWeight: '700',
                      }}
                    >
                      Tier {cite.tier} | Pub: {cite.pubDate}
                    </span>
                  </div>
                  <blockquote
                    style={{
                      margin: '6px 0 0',
                      fontSize: '13.5px',
                      color: '#334155',
                      fontStyle: 'italic',
                      lineHeight: '1.5',
                      borderLeft: '3px solid #FF5500',
                      paddingLeft: '12px',
                    }}
                  >
                    "{cite.quote}"
                  </blockquote>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: INTERACTIVE RAG FOLLOW-UP ASSISTANT                */}
        {/* ========================================================= */}
        {activeTab === 'followup' && (
          <div className="fade-in">
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #EAE5DC',
                padding: '24px',
                marginBottom: '20px',
                boxShadow: '0 4px 16px rgba(18, 19, 22, 0.04)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ backgroundColor: '#111216', color: '#FF5500', padding: '8px', borderRadius: '8px' }}>
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: '800', margin: 0, color: '#111216' }}>
                    Odin's Judicial Clerk — Interactive RAG Follow-Up
                  </h3>
                  <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#57585E' }}>
                    Ask follow-up questions to understand the trial proceedings, evidence citations, why concessions occurred, or secondary supply estimates.
                  </p>
                </div>
              </div>

              {/* Quick Prompt Chips */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
                {PRESET_FOLLOWUPS.map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendFollowup(q)}
                    disabled={followupLoading}
                    style={{
                      backgroundColor: '#FAF8F5',
                      border: '1px solid #DDD6C9',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#334155',
                      textAlign: 'left',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <HelpCircle size={14} color="#FF5500" />
                    <span>{q}</span>
                  </button>
                ))}
              </div>

              {/* Chat Messages Thread with Formatted Point/Markdown Output */}
              <div
                style={{
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #EAE5DC',
                  borderRadius: '10px',
                  padding: '16px',
                  minHeight: '340px',
                  maxHeight: '480px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                  marginBottom: '16px',
                }}
              >
                {chatMessages.map((msg, idx) => (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '85%',
                        backgroundColor: msg.role === 'user' ? '#111216' : '#FFFFFF',
                        color: msg.role === 'user' ? '#FFFFFF' : '#111216',
                        border: msg.role === 'user' ? 'none' : '1px solid #EAE5DC',
                        padding: '14px 18px',
                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        fontSize: '13.5px',
                        lineHeight: '1.6',
                        boxShadow: '0 2px 6px rgba(18, 19, 22, 0.03)',
                      }}
                    >
                      {msg.role === 'user' ? (
                        <div>{msg.content}</div>
                      ) : (
                        <FormattedResponse content={msg.content} />
                      )}

                      {msg.citedDocIds && msg.citedDocIds.length > 0 && (
                        <div style={{ marginTop: '10px', paddingTop: '8px', borderTop: '1px dashed #DDD6C9', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '11px', color: '#FF5500', fontWeight: '700' }}>Cited Sources:</span>
                          {msg.citedDocIds.map((docId, dIdx) => (
                            <span
                              key={dIdx}
                              style={{
                                backgroundColor: '#FFF5EE',
                                color: '#FF5500',
                                border: '1px solid #FFD8C2',
                                padding: '1px 6px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                fontWeight: '700',
                              }}
                            >
                              {docId}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {followupLoading && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#FF5500', fontSize: '13px', fontWeight: '600' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#FF5500', animation: 'pulseOrange 1s infinite' }} />
                    <span>Judicial Clerk querying Runemark corpus & trial rulings...</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input Box */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  value={followupQuery}
                  onChange={(e) => setFollowupQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendFollowup()}
                  placeholder="Ask any follow-up question (e.g., 'Why did Thor concede?', 'What is the rail pass freezing risk?')..."
                  disabled={followupLoading}
                  style={{
                    flex: 1,
                    backgroundColor: '#FAF8F5',
                    border: '1.5px solid #DDD6C9',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '13.5px',
                    color: '#111216',
                    outline: 'none',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#FF5500')}
                  onBlur={(e) => (e.target.style.borderColor = '#DDD6C9')}
                />
                <button
                  onClick={() => handleSendFollowup()}
                  disabled={followupLoading || !followupQuery.trim()}
                  style={{
                    backgroundColor: '#FF5500',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '0 20px',
                    fontWeight: '700',
                    fontSize: '13.5px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: followupLoading ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Send size={16} />
                  <span>Send Inquiry</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
