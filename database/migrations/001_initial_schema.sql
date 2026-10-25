-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Documents Table
CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    doc_id VARCHAR(50) UNIQUE NOT NULL,
    event_id VARCHAR(50) NOT NULL,
    title TEXT NOT NULL,
    source_name VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL,
    reliability_tier SMALLINT NOT NULL CHECK (reliability_tier BETWEEN 1 AND 4),
    pub_date DATE NOT NULL,
    pub_time TIME NOT NULL,
    country VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    language VARCHAR(20) DEFAULT 'en',
    file_name VARCHAR(255) NOT NULL,
    file_format VARCHAR(20) NOT NULL,
    file_path TEXT NOT NULL,
    content_hash VARCHAR(64) NOT NULL,
    raw_text TEXT NOT NULL,
    paragraph_count INT DEFAULT 0,
    is_damaged BOOLEAN DEFAULT FALSE,
    damage_reason TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_docs_doc_id ON documents(doc_id);
CREATE INDEX IF NOT EXISTS idx_docs_event_id ON documents(event_id);
CREATE INDEX IF NOT EXISTS idx_docs_pub_date ON documents(pub_date);
CREATE INDEX IF NOT EXISTS idx_docs_reliability ON documents(reliability_tier);
CREATE INDEX IF NOT EXISTS idx_docs_country ON documents(country);
CREATE INDEX IF NOT EXISTS idx_docs_sector ON documents(sector);
CREATE INDEX IF NOT EXISTS idx_docs_content_hash ON documents(content_hash);

-- Full-text search index for documents
ALTER TABLE documents ADD COLUMN IF NOT EXISTS text_search_tsv tsvector 
GENERATED ALWAYS AS (to_tsvector('english', title || ' ' || raw_text)) STORED;
CREATE INDEX IF NOT EXISTS idx_docs_fts ON documents USING GIN(text_search_tsv);

-- 2. Chunks Table (with 1024-dimension vector embedding for Nemotron-8B / local models)
CREATE TABLE IF NOT EXISTS chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    chunk_id VARCHAR(100) UNIQUE NOT NULL,
    doc_id VARCHAR(50) NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
    chunk_index INT NOT NULL,
    paragraph_refs TEXT[] NOT NULL,
    chunk_text TEXT NOT NULL,
    token_count INT NOT NULL,
    embedding vector(1024),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chunks_chunk_id ON chunks(chunk_id);
CREATE INDEX IF NOT EXISTS idx_chunks_doc_id ON chunks(doc_id);

-- Vector index for cosine distance
CREATE INDEX IF NOT EXISTS idx_chunks_embedding_cosine 
ON chunks USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- Full-text search index for chunks
ALTER TABLE chunks ADD COLUMN IF NOT EXISTS chunk_search_tsv tsvector 
GENERATED ALWAYS AS (to_tsvector('english', chunk_text)) STORED;
CREATE INDEX IF NOT EXISTS idx_chunks_fts ON chunks USING GIN(chunk_search_tsv);

-- 3. Trade Tables (structured month-by-month volume and value)
CREATE TABLE IF NOT EXISTS trade_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_id VARCHAR(50) NOT NULL,
    row_num INT NOT NULL,
    event_id VARCHAR(50) NOT NULL,
    country_origin VARCHAR(100),
    country_dest VARCHAR(100),
    sector VARCHAR(100),
    unit VARCHAR(50),
    period VARCHAR(20) NOT NULL, -- YYYY-MM
    volume NUMERIC(16, 2),
    value NUMERIC(16, 2),
    is_damaged BOOLEAN DEFAULT FALSE,
    damage_note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (table_id, row_num)
);

CREATE INDEX IF NOT EXISTS idx_trade_tables_event ON trade_tables(event_id);
CREATE INDEX IF NOT EXISTS idx_trade_tables_period ON trade_tables(period);

-- 4. Case Files
CREATE TABLE IF NOT EXISTS case_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(50) UNIQUE NOT NULL,
    question TEXT NOT NULL,
    event_id VARCHAR(50) NOT NULL,
    as_of_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    is_verified BOOLEAN DEFAULT FALSE,
    verification_notes TEXT,
    retrieval_round INT DEFAULT 1,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_cases_case_id ON case_files(case_id);

-- 5. Evidence & Citations
CREATE TABLE IF NOT EXISTS evidence_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(50) NOT NULL REFERENCES case_files(case_id) ON DELETE CASCADE,
    doc_id VARCHAR(50) NOT NULL,
    chunk_id VARCHAR(100),
    paragraph_ref VARCHAR(20),
    quoted_text TEXT NOT NULL,
    outlet_name VARCHAR(100),
    reliability_tier SMALLINT CHECK (reliability_tier BETWEEN 1 AND 4),
    is_off_runemark BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Claims (Thor & Loki)
CREATE TABLE IF NOT EXISTS claims (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    claim_id VARCHAR(100) UNIQUE NOT NULL,
    case_id VARCHAR(50) NOT NULL REFERENCES case_files(case_id) ON DELETE CASCADE,
    agent_role VARCHAR(20) NOT NULL CHECK (agent_role IN ('Thor', 'Loki')),
    round_number INT NOT NULL,
    claim_text TEXT NOT NULL,
    category VARCHAR(50),
    cited_doc_ids TEXT[] NOT NULL,
    cited_paragraphs TEXT[] NOT NULL,
    exposure_min NUMERIC(16, 2),
    exposure_max NUMERIC(16, 2),
    commodity VARCHAR(100),
    unit VARCHAR(50),
    nature VARCHAR(20) CHECK (nature IN ('Fact', 'Inference')),
    is_conceded BOOLEAN DEFAULT FALSE,
    concession_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Judicial Rulings (Odin)
CREATE TABLE IF NOT EXISTS judicial_rulings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ruling_id VARCHAR(100) UNIQUE NOT NULL,
    case_id VARCHAR(50) NOT NULL REFERENCES case_files(case_id) ON DELETE CASCADE,
    claim_id VARCHAR(100) NOT NULL REFERENCES claims(claim_id) ON DELETE CASCADE,
    round_number INT NOT NULL,
    ruling VARCHAR(20) NOT NULL CHECK (ruling IN ('Established', 'Contested', 'Conceded')),
    nature VARCHAR(20) NOT NULL CHECK (nature IN ('Fact', 'Inference')),
    confidence_score NUMERIC(4, 3) NOT NULL,
    reasoning TEXT NOT NULL,
    primary_citation VARCHAR(100) NOT NULL,
    reliability_tier SMALLINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Executive Briefings
CREATE TABLE IF NOT EXISTS executive_briefings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    briefing_id VARCHAR(100) UNIQUE NOT NULL,
    case_id VARCHAR(50) UNIQUE NOT NULL REFERENCES case_files(case_id) ON DELETE CASCADE,
    as_of_date DATE NOT NULL,
    executive_summary TEXT NOT NULL,
    thor_exposure_min NUMERIC(16, 2),
    thor_exposure_max NUMERIC(16, 2),
    loki_exposure_min NUMERIC(16, 2),
    loki_exposure_max NUMERIC(16, 2),
    odin_exposure_min NUMERIC(16, 2),
    odin_exposure_max NUMERIC(16, 2),
    commodity VARCHAR(100),
    unit VARCHAR(50),
    next_quarter_outlook TEXT NOT NULL,
    stated_assumptions JSONB DEFAULT '[]'::jsonb,
    inline_citations JSONB DEFAULT '[]'::jsonb,
    sufficiency_loop_triggered BOOLEAN DEFAULT FALSE,
    rounds_completed INT DEFAULT 2,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Agent Private Memory
CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    case_id VARCHAR(50) NOT NULL REFERENCES case_files(case_id) ON DELETE CASCADE,
    agent_role VARCHAR(20) NOT NULL CHECK (agent_role IN ('Heimdall', 'Thor', 'Loki', 'Odin')),
    round_number INT NOT NULL,
    memory_key VARCHAR(100) NOT NULL,
    memory_value JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_agent_memories_lookup ON agent_memories(case_id, agent_role, round_number);
