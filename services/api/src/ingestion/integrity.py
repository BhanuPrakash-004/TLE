"""
Corpus Integrity and Inspection Module
Verifies files against manifest.json and hashes.sha256.
Preserves the original corpus unchanged.
"""

import os
import sys
import json
import hashlib
from typing import Dict, List, Any, Tuple

def verify_corpus_integrity(pack_dir: str) -> Dict[str, Any]:
    """
    Inspects pack_dir for manifest.json, hashes.sha256, and docs/ folder.
    Returns a structured audit of verification status.
    """
    manifest_path = os.path.join(pack_dir, "manifest.json")
    hashes_path = os.path.join(pack_dir, "hashes.sha256")
    docs_dir = os.path.join(pack_dir, "docs")

    results = {
        "pack_dir": pack_dir,
        "manifest_found": os.path.exists(manifest_path),
        "hashes_found": os.path.exists(hashes_path),
        "docs_dir_found": os.path.isdir(docs_dir),
        "total_expected": 0,
        "verified_hashes": 0,
        "hash_mismatches": [],
        "missing_files": [],
        "unmanifested_files": [],
        "file_details": {},
        "is_intact": False,
    }

    if not results["manifest_found"] or not results["docs_dir_found"]:
        return results

    # Load manifest
    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest_data = json.load(f)

    manifest_docs = {d["file"]: d for d in manifest_data.get("documents", [])}
    results["total_expected"] = len(manifest_docs)

    # Load expected hashes if available
    expected_hashes = {}
    if results["hashes_found"]:
        with open(hashes_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    parts = line.split(maxsplit=1)
                    if len(parts) == 2:
                        fname = os.path.basename(parts[1])
                        expected_hashes[fname] = parts[0]

    # Inspect all files in docs_dir
    actual_files = set(os.listdir(docs_dir))

    for fname, meta in manifest_docs.items():
        fpath = os.path.join(docs_dir, fname)
        if not os.path.exists(fpath):
            results["missing_files"].append(fname)
            results["file_details"][fname] = {
                "status": "MISSING",
                "doc_id": meta.get("DOC_ID"),
                "file": fname
            }
            continue

        # Check hash
        with open(fpath, "rb") as f:
            data = f.read()

        file_size = len(data)
        h_raw = hashlib.sha256(data).hexdigest()
        h_lf = hashlib.sha256(data.replace(b"\r\n", b"\n")).hexdigest()

        exp_hash = expected_hashes.get(fname)
        is_hash_valid = True

        if exp_hash:
            if h_raw == exp_hash or h_lf == exp_hash:
                results["verified_hashes"] += 1
            else:
                is_hash_valid = False
                results["hash_mismatches"].append({
                    "file": fname,
                    "expected": exp_hash,
                    "actual_raw": h_raw,
                    "actual_lf": h_lf
                })

        is_empty = (file_size == 0)

        results["file_details"][fname] = {
            "status": "EMPTY" if is_empty else ("OK" if is_hash_valid else "HASH_MISMATCH"),
            "doc_id": meta.get("DOC_ID"),
            "size_bytes": file_size,
            "sha256": h_lf if (exp_hash and h_lf == exp_hash) else h_raw,
            "hash_verified": is_hash_valid,
            "is_empty": is_empty,
            "format": meta.get("FORMAT", fname.split(".")[-1].upper()),
            "meta": meta
        }

    # Check for unmanifested files
    for fname in actual_files:
        if fname not in manifest_docs:
            results["unmanifested_files"].append(fname)

    results["is_intact"] = (
        len(results["missing_files"]) == 0 and
        len(results["hash_mismatches"]) == 0 and
        results["verified_hashes"] == results["total_expected"]
    )

    return results

if __name__ == "__main__":
    pack = sys.argv[1] if len(sys.argv) > 1 else "03_Ragnarok Trial of the Nine Realms/dev_pack_E5"
    res = verify_corpus_integrity(pack)
    print(f"Corpus check for: {pack}")
    print(f"Total manifest docs: {res['total_expected']}")
    print(f"Verified hashes: {res['verified_hashes']}")
    print(f"Intact: {res['is_intact']}")
    if res["missing_files"]:
        print(f"Missing: {res['missing_files']}")
    if res["hash_mismatches"]:
        print(f"Hash mismatches: {res['hash_mismatches']}")
