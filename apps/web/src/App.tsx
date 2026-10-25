import { useState, useEffect, useRef } from 'react';
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

const PRESET_QUERIES = [
  {
    label: '🌾 Event E5 (Orvan Corridor - Midgard & Tolan)',
    query:
      'As of 25 January 2027, how exposed are Midgard and Tolan to the end of the Orvan corridor agreement? Give a low and high range for wheat and maize imports.',
  },
  {
    label: '🚂 Ravik Rail Link Siding Capacity',
    query:
      'How much wheat volume can the Ravik Rail Link divert from Orvan to Midgard before encountering un-electrified passing siding bottlenecks as of 25 January 2027?',
  },
  {
    label: '🚢 Tolan Harbour & Vanir Substitution',
    query:
      'To what degree can replacement grain cargoes from Vanir offset Tolan Harbour sea import deficits following the corridor expiration?',
  },
];

const PRESET_FOLLOWUPS = [
  'Why did Thor concede the port quay collapse claim?',
  'Why did Loki concede full market stabilization?',
  'What is the difference between Thor and Odin wheat estimates?',
  'What happens if the Ravik rail link freezes in February 2027?',
  'Which documents are Tier 1 official notices vs Tier 4 rumors?',
];

const WORKFLOW_STAGES = [
  { id: 'VERIFY', label: '1. Gatekeeper Verification', desc: 'Heimdall screens decoys & traps' },
  { id: 'ROUND1', label: '2. Round 1 Exposure Cases', desc: 'Thor High vs Loki Low' },
  { id: 'CROSS', label: '3. Cross-Exam & Concessions', desc: 'Attacks & counter-evidence' },
  { id: 'REMAND', label: '4. Odin Sufficiency Remand', desc: 'Round 2 retrieval mandated' },
  { id: 'ROUND2', label: '5. Round 2 Calibration', desc: 'Rail sidings & berth limits' },
  { id: 'VERDICT', label: '6. Judicial Verdict', desc: 'Briefing & 3-range table' },
];

export default function App() {
  const [question, setQuestion] = useState(PRESET_QUERIES[0].query);
  const [asOfDate, setAsOfDate] = useState('2027-01-25');
  const [activeTab, setActiveTab] = useState<'briefing' | 'steps' | 'debate' | 'citations' | 'followup'>('briefing');
  const [isRunning, setIsRunning] = useState(false);
  const [trialTrace, setTrialTrace] = useState<any | null>(null);
  const [briefing, setBriefing] = useState<ExecutiveBriefing | null>(null);
  const [liveSteps, setLiveSteps] = useState<TrialStep[]>([]);
  const [currentStepName, setCurrentStepName] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [activeCitationFilter, setActiveCitationFilter] = useState<number | 'ALL'>('ALL');
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  // RAG Follow-up State
  const [followupQuery, setFollowupQuery] = useState('');
  const [followupLoading, setFollowupLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Welcome to the Courtroom Intelligence Follow-up Console. You can ask any follow-up question regarding the case dockets, evidence citations, why Thor or Loki conceded specific claims, or counterfactual supply scenarios.',
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
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const handleRunTrial = async () => {
    setIsRunning(true);
    setLiveSteps([]);
    setCurrentStepName('Initializing Court & Gatekeeper Verification...');

    try {
      // Attempt SSE streaming for real-time live step-by-step execution
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
                  setActiveTab('briefing');
                } else if (payload.entry) {
                  setCurrentStepName(`[Round ${payload.entry.round}] ${payload.entry.agent}: ${payload.entry.action}`);
                  setLiveSteps((prev) => [...prev, payload.entry]);
                }
              } catch {
                // Ignore parse errors on chunk boundaries
              }
            }
          }
        }
      } else {
        // Fallback to normal JSON
        const data = await res.json();
        if (data && data.trace) {
          setTrialTrace(data.trace);
          setBriefing(data.trace.finalBriefing);
          setLiveSteps(data.trace.steps || []);
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

          {/* Preset Chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            {PRESET_QUERIES.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => setQuestion(preset.query)}
                style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  backgroundColor: question === preset.query ? '#FFF5EE' : '#F5F1E9',
                  color: question === preset.query ? '#FF5500' : '#57585E',
                  border: question === preset.query ? '1px solid #FF5500' : '1px solid #DDD6C9',
                  borderRadius: '6px',
                  padding: '6px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {preset.label}
              </button>
            ))}
            <button
              onClick={() => setQuestion('')}
              style={{
                fontSize: '12px',
                fontWeight: '600',
                backgroundColor: 'transparent',
                color: '#8A8B93',
                border: '1px dashed #DDD6C9',
                borderRadius: '6px',
                padding: '6px 10px',
              }}
            >
              Clear
            </button>
          </div>

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

          {/* Workflow Stepper Bar */}
          <div
            style={{
              marginTop: '20px',
              paddingTop: '16px',
              borderTop: '1px solid #EAE5DC',
              display: 'grid',
              gridTemplateColumns: 'repeat(6, 1fr)',
              gap: '10px',
            }}
          >
            {WORKFLOW_STAGES.map((stg, idx) => {
              const isCompleted = liveSteps.length >= (idx + 1) * 3 || (!isRunning && liveSteps.length > 0);
              const isCurrent = isRunning && !isCompleted;
              return (
                <div
                  key={stg.id}
                  style={{
                    backgroundColor: isCompleted ? '#ECFDF5' : isCurrent ? '#FFF5EE' : '#FAF8F5',
                    border: isCompleted ? '1px solid #A7F3D0' : isCurrent ? '1.5px solid #FF5500' : '1px solid #EAE5DC',
                    padding: '8px 10px',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: isCompleted ? '#047857' : isCurrent ? '#FF5500' : '#8A8B93' }}>
                      {stg.label}
                    </span>
                    {isCompleted && <Check size={12} color="#047857" />}
                  </div>
                  <div style={{ fontSize: '10.5px', color: '#57585E' }}>{stg.desc}</div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Deliberation Status Indicator */}
          {isRunning && (
            <div
              style={{
                marginTop: '14px',
                backgroundColor: '#FFF5EE',
                border: '1px solid #FFD8C2',
                borderRadius: '8px',
                padding: '10px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                fontSize: '13px',
                color: '#FF5500',
                fontWeight: '600',
              }}
            >
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#FF5500',
                  animation: 'pulseOrange 1.5s infinite',
                }}
              />
              <span>{currentStepName || 'Court in session: Heimdall verifying authenticity → Thor & Loki debating exposure → Odin evaluating sufficiency loop...'}</span>
            </div>
          )}
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

        {/* TAB 1: ODIN'S EXECUTIVE BRIEFING & EXPOSURE TABLE */}
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

            {/* Executive Summary Card */}
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
                  fontSize: '14.5px',
                  lineHeight: '1.7',
                  color: '#1E2026',
                  backgroundColor: '#FAF8F5',
                  padding: '20px',
                  borderRadius: '10px',
                  border: '1px solid #EAE5DC',
                }}
              >
                {briefing?.executiveSummary ||
                  'The courtroom deliberated the commercial disruption. Official notices confirm that the corridor expired without renewal, dropping port loadings to 30-38% of normal. Thor proved gross volume losses, while Loki established overland rail mitigation via the Ravik Rail Link. Claims of total quay destruction were disproven and conceded.'}
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
                    <strong>Port Loading Collapse:</strong> Terminals operating at 30%–38% of baseline (ORV-0012, Tier 1).
                  </div>
                  <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #10B981', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                    <strong>Ravik Rail Active:</strong> Overland bypass delivering 38,000–48,000 MT/month (ORV-0005, Tier 2).
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
                    <strong>Vanir Substitution vs Berth Wait:</strong> Secondary port berthing delays cap net relief (ORV-0042).
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
                    <strong>Thor Conceded Quay Collapse:</strong> Tabloid rumor (ORV-0010) debunked by port registry (ORV-0012).
                  </div>
                  <div style={{ backgroundColor: '#FAF8F5', borderLeft: '3px solid #EF4444', padding: '10px 12px', borderRadius: '4px', fontSize: '12.5px', lineHeight: '1.5' }}>
                    <strong>Loki Conceded Full Stabilization:</strong> Spot price spikes (ORV-0017) refute full market equilibrium.
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
          </div>
        )}

        {/* TAB 2: STEP-BY-STEP ROUND 1 & ROUND 2 BREAKDOWN */}
        {activeTab === 'steps' && (
          <div className="fade-in">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              {/* Round 1 Card */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #EAE5DC', paddingBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111216' }}>
                      Round 1: Initial Confrontation & Attacks
                    </h3>
                    <span style={{ fontSize: '12px', color: '#57585E' }}>Event Verification, Gross Deficit vs Early Mitigations</span>
                  </div>
                  <span style={{ backgroundColor: '#FFF5EE', color: '#FF5500', fontWeight: '700', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                    {round1Steps.length} Steps
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {round1Steps.map((step: TrialStep, idx: number) => {
                    const isExpanded = expandedStep === idx;
                    return (
                      <div
                        key={idx}
                        style={{
                          backgroundColor: '#FAF8F5',
                          borderRadius: '8px',
                          border: '1px solid #EAE5DC',
                          padding: '12px',
                        }}
                      >
                        <div
                          onClick={() => setExpandedStep(isExpanded ? null : idx)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '11px', backgroundColor: '#111216', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>
                              #{idx + 1}
                            </span>
                            <strong style={{ fontSize: '13px', color: '#FF5500' }}>{step.agent}:</strong>
                            <span style={{ fontSize: '12.5px', color: '#111216' }}>{step.action}</span>
                          </div>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>

                        {isExpanded && step.details && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #DDD6C9', fontSize: '12px' }}>
                            <pre style={{ margin: 0, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', overflowX: 'auto', color: '#334155', maxHeight: '180px' }}>
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Round 2 Card */}
              <div style={{ backgroundColor: '#FFFFFF', borderRadius: '12px', border: '1px solid #EAE5DC', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', borderBottom: '1px solid #EAE5DC', paddingBottom: '10px' }}>
                  <div>
                    <h3 style={{ fontSize: '16px', fontWeight: '800', margin: 0, color: '#111216' }}>
                      Round 2: Sufficiency Remand & Adjudication
                    </h3>
                    <span style={{ fontSize: '12px', color: '#57585E' }}>Targeted Siding Retrieval & Final Calibration</span>
                  </div>
                  <span style={{ backgroundColor: '#ECFDF5', color: '#10B981', fontWeight: '700', fontSize: '12px', padding: '3px 8px', borderRadius: '6px' }}>
                    {round2Steps.length} Steps
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {round2Steps.map((step: TrialStep, idx: number) => {
                    const stepIdx = round1Steps.length + idx;
                    const isExpanded = expandedStep === stepIdx;
                    return (
                      <div
                        key={stepIdx}
                        style={{
                          backgroundColor: '#FAF8F5',
                          borderRadius: '8px',
                          border: '1px solid #EAE5DC',
                          padding: '12px',
                        }}
                      >
                        <div
                          onClick={() => setExpandedStep(isExpanded ? null : stepIdx)}
                          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '800', fontSize: '11px', backgroundColor: '#10B981', color: '#FFFFFF', padding: '2px 6px', borderRadius: '4px' }}>
                              #{idx + 1}
                            </span>
                            <strong style={{ fontSize: '13px', color: '#10B981' }}>{step.agent}:</strong>
                            <span style={{ fontSize: '12.5px', color: '#111216' }}>{step.action}</span>
                          </div>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>

                        {isExpanded && step.details && (
                          <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #DDD6C9', fontSize: '12px' }}>
                            <pre style={{ margin: 0, backgroundColor: '#FFFFFF', padding: '10px', borderRadius: '6px', overflowX: 'auto', color: '#334155', maxHeight: '180px' }}>
                              {JSON.stringify(step.details, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ADVERSARIAL DEBATE (THOR VS LOKI) */}
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
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

        {/* TAB 4: SOURCE CITATIONS & RELIABILITY TIERS */}
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

        {/* TAB 5: INTERACTIVE RAG FOLLOW-UP ASSISTANT */}
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
                    Ask detailed follow-up questions regarding the trial proceedings, evidence citations, why concessions were made, or secondary trade projections.
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

              {/* Chat Messages Thread */}
              <div
                style={{
                  backgroundColor: '#FAF8F5',
                  border: '1px solid #EAE5DC',
                  borderRadius: '10px',
                  padding: '16px',
                  minHeight: '320px',
                  maxHeight: '440px',
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
                        padding: '12px 16px',
                        borderRadius: msg.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        fontSize: '13.5px',
                        lineHeight: '1.6',
                        boxShadow: '0 2px 6px rgba(18, 19, 22, 0.03)',
                      }}
                    >
                      {msg.content}

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
