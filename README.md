# TLE — Trial of the Nine Realms
### Adversarial Multi-Agent Courtroom System for Supply Chain Disruption Intelligence

[![GitHub Repo](https://img.shields.io/badge/GitHub-BhanuPrakash--004%2FTLE-181717?logo=github)](https://github.com/BhanuPrakash-004/TLE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%2Bpgvector-4169E1?logo=postgresql&logoColor=white)](https://github.com/pgvector/pgvector)
[![Acceptance Tests](https://img.shields.io/badge/Acceptance_Criteria-7%2F7_Passed-10B981)](https://github.com/BhanuPrakash-004/TLE/blob/main/tests/test_courtroom_trial.ts)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

**TLE (Trial of the Nine Realms)** is an autonomous, adversarial multi-agent courtroom platform engineered to adjudicate complex supply chain disruptions across the simulated Runemark Trade Network.

Rather than relying on single-agent summaries that suffer from confirmation bias and ungrounded hallucinations, TLE convenes a formal **2-Round Adversarial Trial** between prosecution and defense agents, overseen by an impartial Chief Justice and an intake Gatekeeper Sentinel.

---

## 🏛️ Courtroom Agents Architecture

```mermaid
flowchart TD
    UserQuery["User Disruption Inquiry"] --> Heimdall["01. Heimdall (Gatekeeper Sentinel)\n• Scans 2027-01-25 clock boundary\n• Screens decoys (ORV-0010, ORV-0043)\n• Evaluates 'isReal' and 'isActive'"]
    
    Heimdall --> GateCheck{"Authentic & Active?"}
    GateCheck -- "No ('isReal': false OR 'isActive': false)" --> Dismissal["🛑 COURT DISMISSED AT STEP 1\n• Bypasses Rounds 2-6\n• Prevents hallucinated MT/mo exposure\n• Cites discredited doc IDs"]
    
    GateCheck -- "Yes ('isReal': true AND 'isActive': true)" --> CaseFile["Open Formal Case Docket"]
    
    CaseFile --> Prosecution["02. Thor (Prosecution Agent)\nArgues High Worst-Case Exposure (up to 185k MT/mo)"]
    CaseFile --> Defense["02. Loki (Defense Agent)\nArgues Cushioned Mitigation (Rail & Secondary Ports)"]
    
    Prosecution --> CrossExam["03. Cross-Examination & Debate\n• Thor attacks Loki rail sidings\n• Loki disproves quay collapse with ORV-0012\n• Indisputable Concessions recorded"]
    Defense --> CrossExam
    
    CrossExam --> OdinRemand["04. Odin Sufficiency Remand\n• Assesses evidence sufficiency\n• Identifies unproven siding bottlenecks (ORV-0050)"]
    
    OdinRemand --> Round2["05. Round 2 Calibration\n• Heimdall targeted retrieval\n• Thor defends siding limits\n• Loki bounds rail bypass (38k-48k MT/mo)"]
    
    Round2 --> Verdict["06. Final Judicial Adjudication\n• Classifies facts: Established, Contested, Conceded\n• Publishes 3-Range Exposure Table\n• Delivers Odin's Executive Briefing"]
```

### The Four Agents
1. **Heimdall (The Sentinel & Gatekeeper)**
   - **Role**: Case intake, evidence verification, and anti-leakage temporal gatekeeper.
   - **Duties**: Enforces simulated clock boundary (`2027-01-25`). Quarantines adversarial traps (e.g., `ORV-0043` false renewal rumor, `ORV-0010` quay collapse rumor). If an inquiry is not authentic (`"isReal": false`) or no longer ongoing (`"isActive": false`), dismisses the case immediately at Step 1.
2. **Thor (The Prosecution — High Exposure Advocate)**
   - **Role**: Prosecutes maximum commercial exposure and worst-case vulnerability.
   - **Duties**: Argues severe maritime deficits (up to 185,000 MT/month), dockworker strikes, and un-electrified passing siding bottlenecks.
3. **Loki (The Defense — Mitigation Advocate)**
   - **Role**: Defends with commercial cushioning, substitution channels, and alternative logistics.
   - **Duties**: Identifies secondary port capacity (Tolan Harbour / Vanir substitution), overland rail diversions via the Ravik Rail Link (38,000–48,000 MT/month), and inventory reserve buffers.
4. **Odin (Chief Justice Allfather — Judicial Adjudicator)**
   - **Role**: Presiding magistrate, cross-examination judge, and executive briefing author.
   - **Duties**: Evaluates evidence sufficiency after Round 1, issues mandatory remands, categorizes claims into **Established**, **Contested**, and **Conceded**, and publishes the calibrated 3-range exposure table.

---

## ⚖️ Adjudication Rules & Core Concepts

### 1. Meaning of `"isReal": false` vs `"isActive": false`
- **`"isReal": false` (Uncorroborated Rumor or Decoy)**: The alleged disruption does not exist in verified Runemark records, or is based on an unverified tabloid rumor (e.g., Tier 4 Saga Chat `ORV-0010` claiming the port quay collapsed, which official loading registries `ORV-0012` disproved).
- **`"isActive": false` (Concluded or Retracted Event)**: The disruption may have occurred in the past, but was already resolved, cancelled, or concluded prior to `2027-01-25`. Baseline trade has normalized; zero ongoing deficit exists.
- **Initial-Step Dismissal**: If either condition is false, the trial terminates immediately at **Step 1 (Gatekeeper Rejection)**. Blocks 2–6 in the Stepper are marked `HALTED`, and no exposure calculations are convened, eliminating hallucinated damages.

### 2. Simulated Clock Rule (`2027-01-25`)
- Under strict non-functional requirement NFR3, **zero evidence published after 25 January 2027 may be accessed or cited**. Any document with `pub_date > 2027-01-25` is discarded by the retrieval engine.

### 3. Four-Tier Evidence Credibility System
Evidence in the Runemark Trade Network is weighted by institutional authority:

| Tier | Source Category | Weight Multiplier | Evidentiary Status in Trial |
| :---: | :--- | :---: | :--- |
| **Tier 1** | Official Government Notices, Ministry Returns, Port Manifests | **$1.35\times$** | **Indisputable:** Binding facts for Chief Justice Odin's rulings. |
| **Tier 2** | Trade Wire Services, Lloyd's-Equivalent Port Registries, Exchange Returns | **$1.10\times$** | **Strong:** Corroborated commercial estimates. |
| **Tier 3** | Regional Commercial Papers, Analyst Forecasts, Academic Briefs | **$0.85\times$** | **Supplementary:** Requires secondary corroboration. |
| **Tier 4** | Saga Chat Social Posts, Unverified Tabloid Rumors, Decoys | **$0.50\times$** | **Cautionary:** Quarantined or forced to concession in cross-exam. |

---

## 📂 Key Benchmark Documents (Dev Pack E5)

The Orvan Corridor Disruption case (Event E5) is evaluated against 75 ingested corpus documents:

- **`ORV-0016` (Tier 1 — Ministry Notice)**: Official confirmation that the Orvan Corridor Trade Agreement expired on 10 September 2026 without renewal.
- **`ORV-0012` (Tier 1 — Port Loading Index)**:
  - *Paragraph 1 (`P1`)*: Baseline normal monthly loading index is established at 100.
  - *Paragraph 2 (`P2`)*: In September 2026, loadings collapsed to **40** (a 60% deficit). Proves berths were actively loading grain, disproving the physical quay collapse rumor.
- **`ORV-0010` (Tier 4 — Saga Chat Social Post)**: Adversarial decoy claiming the entire port quay collapsed into the ocean. Conceded by Thor after confrontation with `ORV-0012:P2`.
- **`ORV-0050` (Tier 1 — Railway Directorate Return)**: Establishes that the Ravik Rail Link can divert 38,000–48,000 MT/month of grain, but is strictly constrained by 6 daily train pairs due to un-electrified single-track passing siding bottlenecks.
- **`ORV-0042` (Tier 2 — Harbourmaster Bulletin)**: Tolan Harbour berth draft limits (maximum 11.2m) and crane turnaround delays capping secondary replacement shipments from Vanir.
- **`ORV-0043` (Tier 4 — Premature Renewal Decoy)**: False rumor claiming the corridor agreement was renewed on 9 September 2026; caught and quarantined by Heimdall.

---

## 🛠️ Repository Structure

```text
TLE/
├── apps/
│   └── web/                   # React 18 + Vite Decision-Maker Dossier & UI
│       └── src/
│           ├── App.tsx        # Dashboard (Cream/Obsidian/Orange design)
│           └── index.css      # Styling & animations
├── services/
│   └── api/
│       └── src/
│           ├── agents/        # Heimdall, Thor, Loki, Odin implementations
│           ├── ai/            # dynamicRetriever.ts (BM25 + Cosine), llm.ts
│           ├── db/            # PostgreSQL pool, migrations runner
│           ├── graph/         # CourtroomOrchestrator state machine
│           ├── routes/        # /api/cases (trial, latest, followup), /api/retrieval
│           └── server.ts      # Express backend entrypoint
├── packages/
│   └── shared-types/          # TypeScript contracts (ExecutiveBriefing, TrialTrace)
├── database/
│   └── migrations/            # 001_initial_schema.sql (PostgreSQL 16 + pgvector)
├── tests/
│   ├── test_integrity_and_extraction.py  # Unit tests for text & table extraction
│   ├── test_search_filters.py            # Unit tests for clock and tier filtering
│   ├── test_courtroom_trial.ts           # End-to-end 7 acceptance criteria test
│   ├── test_dismissal.ts                 # Decoy Step 1 dismissal test
│   └── test_followup_rag.ts              # Targeted document RAG verification
├── .env.example
├── package.json
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.18+ or v20+
- **Python**: v3.10+ (for ingestion scripts)
- **PostgreSQL 16 with pgvector** (optional: the system includes a zero-dependency in-memory JSON fallback that runs out of the box)

### 1. Installation
Clone the repository and install all workspace dependencies:

```bash
git clone https://github.com/BhanuPrakash-004/TLE.git
cd TLE
npm install
```

### 2. Environment Configuration
Create a `.env` file in the root directory:

```env
PORT=3000
OPENROUTER_API_KEY=your_openrouter_api_key_here
LLM_MODEL=google/gemini-3.5-flash-lite
EMBEDDING_MODEL=nvidia/nemotron-3.5-embed-8b:free

# Optional: PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tle_ragnarok
```

### 3. Build Shared Packages
```bash
npm --workspace=@tle/shared-types run build
npm --workspace=@tle/api run build
npm --workspace=@tle/web run build
```

### 4. Running the Applications
Start the API backend and Web frontend concurrently:

```bash
# Terminal 1: Backend API (port 3000)
npm run dev:api

# Terminal 2: Decision-Maker Web Dashboard (port 5173)
npm run dev:web
```

Visit `http://localhost:5173` to interact with the trial dashboard.

---

## 🧪 Testing Suite & Verification

The codebase includes automated tests validating all functional and non-functional requirements:

```bash
# Run all tests in sequence
npm test
```

### Individual Test Suites
```bash
# 1. Ingestion Integrity & Table Parsing
python tests/test_integrity_and_extraction.py

# 2. Search Engine & Temporal Clock Filters
python tests/test_search_filters.py

# 3. Full 2-Round Adversarial Courtroom Trial (All 7 Acceptance Criteria)
npx tsx tests/test_courtroom_trial.ts

# 4. Initial-Step Dismissal on Decoy Scenario
npx tsx tests/test_dismissal.ts

# 5. Targeted Document Retrieval (ORV-0012:P2)
npx tsx tests/test_followup_rag.ts
```

### Verified Acceptance Criteria (All Passing)
- ✅ **Criterion 1**: Case File opened with verified authenticity as of `2027-01-25`.
- ✅ **Criterion 2**: Cross-examination triggers concessions (Thor concedes `ORV-0010` quay collapse rumor).
- ✅ **Criterion 3**: Odin executes sufficiency check and remands case for Round 2.
- ✅ **Criterion 4**: Odin classifies findings into Established, Contested, and Conceded.
- ✅ **Criterion 5**: Exposure Table contains 3 distinct calibrated ranges (Thor, Loki, Odin).
- ✅ **Criterion 6**: Inline paragraph citations present with reliability tiers (`[ORV-0012:P2]`, `[ORV-0016:P1]`, `[ORV-0050:P2]`).
- ✅ **Criterion 7**: Private agent memories recorded across all 4 agents.

---

## 📡 API Reference

### 1. Convene Adversarial Trial
`POST /api/cases/trial`
- **Headers**: `Accept: text/event-stream` (for live chunk streaming) or `application/json`.
- **Payload**:
  ```json
  {
    "question": "As of 25 January 2027, how exposed are Midgard and Tolan to the end of the Orvan corridor agreement?",
    "asOfDate": "2027-01-25"
  }
  ```
- **Response**: Emits live `TrialStep` events, concluding with `TRIAL_FINISHED` and the complete `ExecutiveBriefing`.

### 2. Retrieve Latest Trial Trace
`GET /api/cases/latest`
- **Response**: The most recent trial trace including all round steps, concessions, rulings, and briefing.

### 3. Ask Judicial Clerk (RAG Follow-Up)
`POST /api/cases/followup`
- **Payload**:
  ```json
  {
    "query": "What is ORV-0012:P2 and why did Thor concede?",
    "asOfDate": "2027-01-25"
  }
  ```
- **Response**:
  ```json
  {
    "status": "SUCCESS",
    "answer": "**[ORV-0012:P2]** is Paragraph 2 of Realm Trade Ministry Official Notice 'Orvan Grain Port loadings'...",
    "citedDocIds": ["ORV-0012"]
  }
  ```

---

## 🎨 UI & UX Highlights

The frontend incorporates a cream, obsidian black, and safety orange design system:
- **Block-by-Block Stepper**: Interactive progress tracker showing real-time execution across 6 protocol stages.
- **Single Sample Questions Table**: Expandable docket selector featuring 5 predefined scenarios (authentic corridor disruption, rail bottlenecks, port substitution, decoy trap rejection, and premature renewal rumors).
- **Independent Round Accordions**: Symmetric Round 1 and Round 2 side-by-side inspection cards engineered with `minmax(0, 1fr)` CSS grid columns to prevent layout squishing.
- **Formatted Markdown Parser**: Renders structured bullets, bold text, and orange citation badges (`[ORV-0012:P2]`) cleanly without raw asterisks.
- **Initial-Step Dismissal Card**: Prominent alert card displayed when a case fails gatekeeper verification.

---

## 📄 License
MIT License. Developed for the Trial of the Nine Realms (TLE) Adversarial Intelligence Research Initiative.
