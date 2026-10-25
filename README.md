# TLE — Trial of the Nine Realms

An adversarial multi-agent courtroom system for supply chain disruption intelligence across the Runemark trade network.

## System Architecture

```text
TLE/
├── apps/
│   └── web/                   # Decision-maker interface & briefing dashboard
├── services/
│   └── api/
│       └── src/
│           ├── agents/        # Courtroom agents
│           │   ├── heimdall.ts # Event verification & decoy filtering
│           │   ├── thor.ts     # High-exposure prosecution/argument case
│           │   ├── loki.ts     # Limited-exposure defense/mitigation case
│           │   └── odin.ts     # Chief justice ruling & executive briefing
│           ├── graph/         # Agent orchestration graph / state machines
│           ├── ingestion/     # Document ingestion, parsing & metadata extraction
│           ├── retrieval/     # Grounded evidence retrieval & vector search
│           ├── claims/        # Claim tracking, concessions & credibility scoring
│           ├── db/            # Database schema & clients
│           ├── routes/        # API endpoints
│           └── server.ts      # API server entrypoint
├── packages/
│   └── shared-types/          # Shared TypeScript interfaces & schemas
├── database/
│   └── migrations/            # Database migration scripts
├── tests/                     # Unit, integration & courtroom benchmark tests
├── .env.example
├── package.json
└── README.md
```

## Agents Overview

- **Heimdall**: Confirms disruption authenticity as of 25 January 2027; screens out decoys, retractions, and noise.
- **Thor**: Prosecutes high commercial exposure with cited document evidence.
- **Loki**: Defends with mitigation factors (alternate routing, price buffering, carrier consolidation).
- **Odin**: Presides over cross-examination, rules on claims (Established / Contested / Conceded), mandates sufficiency loops, and authors the final executive briefing.
