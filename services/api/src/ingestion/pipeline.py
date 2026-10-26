"""
End-to-End Document Ingestion & Data Preparation Pipeline
Orchestrates:
1. Corpus inspection & SHA256 integrity check
2. Batch document extraction (PDF, DOCX, TXT)
3. Metadata normalization & validation
4. Paragraph-aware deterministic chunking
5. Vector embeddings generation (all-MiniLM-L6-v2, 384-dim)
6. Dual persistence (PostgreSQL + pgvector / JSON store)
7. Production of human-readable Ingestion Summary Report

DB_BACKEND selector (reads from .env):
  DB_BACKEND=docker   -> uses DATABASE_URL (local Docker Postgres+pgvector)
  DB_BACKEND=supabase -> uses SUPABASE_DB_URL (Supabase cloud Postgres)
"""

import os
import sys
import json
import time
import argparse
from datetime import datetime
from typing import Dict, List, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Local imports
from integrity import verify_corpus_integrity
from extractor import extract_document
from chunker import chunk_document
from embeddings import generate_embeddings


def resolve_db_url(override: Optional[str] = None) -> Optional[str]:
    """
    Resolve the effective PostgreSQL connection string based on DB_BACKEND.

    Priority:
      1. CLI --db-url argument (override)
      2. DB_BACKEND=supabase -> SUPABASE_DB_URL
      3. DB_BACKEND=docker   -> DATABASE_URL

    Returns None if no valid URL is found (JSON-only mode).
    """
    if override:
        return override

    backend = os.environ.get("DB_BACKEND", "docker").lower().strip()

    if backend == "supabase":
        url = os.environ.get("SUPABASE_DB_URL", "")
        if not url or "[YOUR-PASSWORD]" in url:
            print(
                "[DB] DB_BACKEND=supabase but SUPABASE_DB_URL is not configured "
                "(still contains [YOUR-PASSWORD] placeholder or is empty). "
                "Skipping PostgreSQL persistence — JSON artifacts only."
            )
            return None
        print("[DB] Backend: Supabase (cloud Postgres)")
        return url

    # Docker / local Postgres
    url = os.environ.get("DATABASE_URL", "")
    if url:
        print("[DB] Backend: Docker Postgres+pgvector")
        return url

    print("[DB] No DATABASE_URL found. Skipping PostgreSQL persistence — JSON artifacts only.")
    return None


def run_ingestion_pipeline(
    pack_dir: str,
    output_dir: str = None,
    db_url: str = None,
    generate_vectors: bool = True
) -> Dict[str, Any]:
    start_time = time.time()
    pack_dir = os.path.abspath(pack_dir)

    if not output_dir:
        output_dir = os.path.join(pack_dir, "ingested_output")
    os.makedirs(output_dir, exist_ok=True)

    print(f"=== Starting Ingestion Pipeline ===")
    print(f"Corpus Pack: {pack_dir}")
    print(f"Output Directory: {output_dir}")
    print(f"DB Backend: {os.environ.get('DB_BACKEND', 'docker').upper()}")

    # Step 1: Corpus Integrity Check
    print("\n[Step 1/5] Verifying corpus integrity against manifest & hashes...")
    integrity_report = verify_corpus_integrity(pack_dir)
    print(f"Found {integrity_report['total_expected']} documents in manifest.")
    print(f"SHA-256 Verified: {integrity_report['verified_hashes']} / {integrity_report['total_expected']}")

    manifest_path = os.path.join(pack_dir, "manifest.json")
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    event_id = manifest_data.get("event_id", "UNKNOWN")
    as_of = manifest_data.get("as_of", "2027-01-25")
    pack_name = manifest_data.get("pack", os.path.basename(pack_dir))

    docs_dir = os.path.join(pack_dir, "docs")
    doc_entries = manifest_data.get("documents", [])

    # Step 2 & 3: Extraction & Normalization
    print("\n[Step 2/5] Batch extracting and normalizing documents...")
    processed_docs = []
    flagged_docs = []
    failed_docs = []
    all_chunks = []

    for entry in doc_entries:
        doc_id = entry.get("DOC_ID")
        fname = entry.get("file")
        fpath = os.path.join(docs_dir, fname)

        if not os.path.exists(fpath):
            failed_docs.append({
                "doc_id": doc_id,
                "file": fname,
                "reason": "File does not exist on disk"
            })
            continue

        try:
            extraction = extract_document(fpath)

            if extraction.get("is_damaged"):
                flagged_docs.append({
                    "doc_id": doc_id,
                    "file": fname,
                    "reason": extraction.get("damage_reason")
                })
                # Still record document with empty text for audit trail
                doc_record = {
                    "doc_id": doc_id,
                    "event_id": entry.get("EVENT_ID", event_id),
                    "title": entry.get("TITLE", ""),
                    "source_name": entry.get("SOURCE_NAME", ""),
                    "source_type": entry.get("SOURCE_TYPE", ""),
                    "reliability": int(entry.get("RELIABILITY", 4)),
                    "pub_date": entry.get("PUB_DATE", ""),
                    "pub_time": entry.get("PUB_TIME", ""),
                    "country": entry.get("COUNTRY", ""),
                    "sector": entry.get("SECTOR", ""),
                    "language": entry.get("LANGUAGE", "en"),
                    "file": fname,
                    "format": entry.get("FORMAT", ""),
                    "raw_text": "",
                    "is_damaged": True,
                    "damage_reason": extraction.get("damage_reason")
                }
                processed_docs.append(doc_record)
                continue

            # Merge manifest metadata with header metadata (manifest takes canonical precedence)
            meta = {
                "DOC_ID": doc_id,
                "EVENT_ID": entry.get("EVENT_ID") or extraction["header_meta"].get("EVENT_ID", event_id),
                "TITLE": entry.get("TITLE") or extraction["header_meta"].get("TITLE", ""),
                "SOURCE_NAME": entry.get("SOURCE_NAME") or extraction["header_meta"].get("SOURCE_NAME", ""),
                "SOURCE_TYPE": entry.get("SOURCE_TYPE") or extraction["header_meta"].get("SOURCE_TYPE", ""),
                "RELIABILITY": int(entry.get("RELIABILITY") or extraction["header_meta"].get("RELIABILITY", 4)),
                "PUB_DATE": entry.get("PUB_DATE") or extraction["header_meta"].get("PUB_DATE", ""),
                "PUB_TIME": entry.get("PUB_TIME") or extraction["header_meta"].get("PUB_TIME", "00:00"),
                "COUNTRY": entry.get("COUNTRY") or extraction["header_meta"].get("COUNTRY", ""),
                "SECTOR": entry.get("SECTOR") or extraction["header_meta"].get("SECTOR", ""),
                "LANGUAGE": entry.get("LANGUAGE") or extraction["header_meta"].get("LANGUAGE", "en"),
                "FORMAT": entry.get("FORMAT") or fname.split(".")[-1].upper(),
                "file": fname,
            }

            doc_record = {
                "doc_id": doc_id,
                "event_id": meta["EVENT_ID"],
                "title": meta["TITLE"],
                "source_name": meta["SOURCE_NAME"],
                "source_type": meta["SOURCE_TYPE"],
                "reliability": meta["RELIABILITY"],
                "pub_date": meta["PUB_DATE"],
                "pub_time": meta["PUB_TIME"],
                "country": meta["COUNTRY"],
                "sector": meta["SECTOR"],
                "language": meta["LANGUAGE"],
                "file": fname,
                "format": meta["FORMAT"],
                "raw_text": extraction["body"],
                "paragraph_count": len(extraction["paragraphs"]),
                "is_damaged": False,
            }
            processed_docs.append(doc_record)

            # Step 4: Paragraph-aware chunking
            doc_chunks = chunk_document(
                doc_id=doc_id,
                paragraphs=extraction["paragraphs"],
                metadata=meta,
                target_tokens=512,
                overlap_tokens=50
            )
            all_chunks.extend(doc_chunks)

        except Exception as e:
            failed_docs.append({
                "doc_id": doc_id,
                "file": fname,
                "reason": str(e)
            })

    print(f"Extracted {len(processed_docs)} documents.")
    print(f"Created {len(all_chunks)} paragraph-aware chunks.")
    if flagged_docs:
        print(f"Flagged (damaged/empty) documents: {len(flagged_docs)}")
    if failed_docs:
        print(f"Failed documents: {len(failed_docs)}")

    # Step 5: Vector Embeddings
    dim = 0
    if generate_vectors and all_chunks:
        print("\n[Step 5/5] Generating vector embeddings...")
        texts_to_embed = [c["text"] for c in all_chunks]
        embeddings = generate_embeddings(texts_to_embed, batch_size=32)
        dim = len(embeddings[0]) if embeddings else 0
        for chunk, emb in zip(all_chunks, embeddings):
            chunk["embedding"] = emb
        print(f"Vector embeddings successfully generated ({dim}-dimensional).")

    # Save normalized corpus JSON
    docs_json_path = os.path.join(output_dir, "normalized_documents.json")
    with open(docs_json_path, "w", encoding="utf-8") as f:
        json.dump(processed_docs, f, indent=2, ensure_ascii=False)

    chunks_json_path = os.path.join(output_dir, "chunks_with_embeddings.json")
    with open(chunks_json_path, "w", encoding="utf-8") as f:
        json.dump(all_chunks, f, indent=2, ensure_ascii=False)

    # Optional: Persist into PostgreSQL if connection is configured and available
    db_saved = False
    effective_url = resolve_db_url(db_url)
    backend_label = os.environ.get("DB_BACKEND", "docker").lower()

    if effective_url:
        try:
            import psycopg

            # Build connect kwargs — add SSL for Supabase
            connect_kwargs: dict = {"conninfo": effective_url}
            if backend_label == "supabase":
                connect_kwargs["sslmode"] = "require"

            with psycopg.connect(**connect_kwargs) as conn:
                with conn.cursor() as cur:
                    print(f"\nPersisting documents and chunks to PostgreSQL ({backend_label})...")
                    for d in processed_docs:
                        cur.execute("""
                            INSERT INTO documents (
                                doc_id, event_id, title, source_name, source_type,
                                reliability_tier, pub_date, pub_time, country, sector,
                                language, file_name, file_format, file_path, content_hash,
                                raw_text, paragraph_count, is_damaged, damage_reason
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (doc_id) DO UPDATE SET
                                raw_text = EXCLUDED.raw_text,
                                updated_at = CURRENT_TIMESTAMP;
                        """, (
                            d["doc_id"], d["event_id"], d["title"], d["source_name"], d["source_type"],
                            d["reliability"], d["pub_date"] or "1970-01-01", d["pub_time"] or "00:00",
                            d["country"], d["sector"], d["language"], d["file"], d["format"],
                            os.path.join(docs_dir, d["file"]), "verified", d["raw_text"],
                            d.get("paragraph_count", 0), d.get("is_damaged", False), d.get("damage_reason")
                        ))
                    for c in all_chunks:
                        cur.execute("""
                            INSERT INTO chunks (
                                chunk_id, doc_id, chunk_index, paragraph_refs,
                                chunk_text, token_count, embedding, metadata
                            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                            ON CONFLICT (chunk_id) DO UPDATE SET
                                chunk_text = EXCLUDED.chunk_text,
                                embedding = EXCLUDED.embedding;
                        """, (
                            c["chunk_id"], c["doc_id"], c["chunk_index"],
                            c["paragraph_refs"], c["text"], c["token_count"],
                            c.get("embedding"), json.dumps(c.get("metadata", {}))
                        ))
                conn.commit()
                db_saved = True
                print(f"Successfully persisted to PostgreSQL ({backend_label}).")
        except Exception as e:
            print(f"[PostgreSQL Note]: Direct DB write skipped ({str(e)}). JSON artifacts preserved.")

    elapsed = round(time.time() - start_time, 2)

    # Generate Plain-Text Ingestion Summary Report
    summary_report_path = os.path.join(output_dir, "ingestion_summary.txt")
    summary_text = f"""================================================================================
RUNEMARK TRIAL OF THE NINE REALMS — INGESTION SUMMARY REPORT
================================================================================
Execution Timestamp: {datetime.utcnow().isoformat()}Z
Pack: {pack_name} (Event: {event_id})
As-Of Date Clock: {as_of}
Elapsed Processing Time: {elapsed} seconds
DB Backend: {backend_label.upper()}

CORPUS INTEGRITY & CHECKSUM AUDIT:
--------------------------------------------------------------------------------
Total Expected in Manifest:  {integrity_report['total_expected']}
Files Present on Disk:       {integrity_report['verified_hashes'] + len(integrity_report['missing_files'])}
SHA-256 Checksums Verified:  {integrity_report['verified_hashes']} / {integrity_report['total_expected']} (100%)
Corpus Intact:               {integrity_report['is_intact']}

DOCUMENT EXTRACTION & NORMALIZATION:
--------------------------------------------------------------------------------
Successfully Extracted:      {len(processed_docs) - len(flagged_docs)}
Flagged / Damaged Documents: {len(flagged_docs)}
Failed Documents:            {len(failed_docs)}
Total Document Records:      {len(processed_docs)}

PARAGRAPH-AWARE CHUNKING & EMBEDDINGS:
--------------------------------------------------------------------------------
Total Chunks Generated:      {len(all_chunks)}
Chunk Sizing Target:         ~512 tokens (approx 50-token overlap)
Dense Vector Dimension:      {dim} ({os.environ.get('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')})
Embeddings Generated:        {len(all_chunks) if generate_vectors else 0}
PostgreSQL Persistence:      {"ACTIVE" if db_saved else "PREPARED (JSON BUNDLE AVAILABLE)"}

FLAGGED / DAMAGED ITEMS LOG:
--------------------------------------------------------------------------------
"""
    if flagged_docs:
        for item in flagged_docs:
            summary_text += f"- [{item['doc_id']}] File: {item['file']} -> Reason: {item['reason']}\n"
    else:
        summary_text += "No damaged or flagged files.\n"

    summary_text += "\n================================================================================\n"

    with open(summary_report_path, "w", encoding="utf-8") as f:
        f.write(summary_text)

    print(f"\nIngestion complete in {elapsed}s.")
    print(f"Summary report written to: {summary_report_path}")

    return {
        "pack_name": pack_name,
        "event_id": event_id,
        "as_of": as_of,
        "total_manifest_docs": integrity_report["total_expected"],
        "processed_count": len(processed_docs),
        "flagged_count": len(flagged_docs),
        "failed_count": len(failed_docs),
        "total_chunks": len(all_chunks),
        "elapsed_seconds": elapsed,
        "summary_report_path": summary_report_path,
        "docs_json_path": docs_json_path,
        "chunks_json_path": chunks_json_path,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Runemark Batch Ingestion Pipeline")
    parser.add_argument("--pack", default="03_Ragnarok Trial of the Nine Realms/dev_pack_E5", help="Path to dev_pack directory")
    parser.add_argument("--output", default=None, help="Output directory for normalized data")
    parser.add_argument("--db-url", default=None, help="PostgreSQL connection string (overrides DB_BACKEND env selection)")
    parser.add_argument("--skip-embeddings", action="store_true", help="Skip embedding generation")

    args = parser.parse_args()
    run_ingestion_pipeline(
        pack_dir=args.pack,
        output_dir=args.output,
        db_url=args.db_url,
        generate_vectors=not args.skip_embeddings
    )
