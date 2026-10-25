"""
Batch Document Extractor
Extracts text and metadata from PDF, DOCX, and TXT files.
Preserves paragraph markers [P1], [P2] and handles damaged/malformed files gracefully.
"""

import os
import re
import sys
from typing import Dict, List, Any, Optional, Tuple

try:
    import pymupdf
except ImportError:
    pymupdf = None

try:
    import docx
except ImportError:
    docx = None

def decode_text_bytes(data: bytes) -> str:
    """
    Decodes text bytes with automatic BOM and mixed-encoding detection.
    Specially handles files like ORV-0007 where header is ASCII and body has UTF-16 LE BOM.
    """
    if not data:
        return ""

    # Check for split header / body with differing encodings
    if b"---\n" in data:
        parts = data.split(b"---\n", 1)
        header_raw = parts[0]
        body_raw = parts[1]

        header = header_raw.decode("utf-8", errors="replace")

        # Check body BOM
        if body_raw.startswith(b"\xff\xfe") or body_raw.startswith(b"\xfe\xff"):
            try:
                body = body_raw.decode("utf-16", errors="replace")
            except Exception:
                body = body_raw.decode("utf-8", errors="replace")
        else:
            try:
                body = body_raw.decode("utf-8")
            except UnicodeDecodeError:
                try:
                    body = body_raw.decode("latin-1", errors="replace")
                except Exception:
                    body = body_raw.decode("utf-8", errors="replace")

        return header + "---\n" + body

    # Check overall BOM
    if data.startswith(b"\xff\xfe") or data.startswith(b"\xfe\xff"):
        return data.decode("utf-16", errors="replace")
    elif data.startswith(b"\xef\xbb\xbf"):
        return data[3:].decode("utf-8", errors="replace")

    # Standard UTF-8 with latin-1 fallback
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return data.decode("latin-1", errors="replace")

def parse_metadata_header(text: str) -> Tuple[Dict[str, Any], str]:
    """
    Parses key-value metadata header block before '---'.
    Returns (metadata_dict, remaining_body_text).
    """
    metadata: Dict[str, Any] = {}
    body_text = text

    if "---" in text:
        parts = text.split("---", 1)
        header_text = parts[0]
        body_text = parts[1].strip()

        for line in header_text.splitlines():
            line = line.strip()
            if ":" in line:
                k, v = line.split(":", 1)
                key = k.strip().upper()
                val = v.strip()
                metadata[key] = val

    # Normalize reliability tier to integer
    if "RELIABILITY" in metadata:
        try:
            metadata["RELIABILITY"] = int(metadata["RELIABILITY"])
        except ValueError:
            metadata["RELIABILITY"] = 4 # Default to tier 4 if malformed

    return metadata, body_text

def extract_txt(file_path: str) -> Dict[str, Any]:
    with open(file_path, "rb") as f:
        raw_bytes = f.read()

    if len(raw_bytes) == 0:
        return {
            "text": "",
            "header_meta": {},
            "body": "",
            "paragraphs": [],
            "is_damaged": True,
            "damage_reason": "Empty file (0 bytes)"
        }

    full_text = decode_text_bytes(raw_bytes)
    meta, body = parse_metadata_header(full_text)
    paragraphs = extract_paragraphs(body)

    return {
        "text": full_text,
        "header_meta": meta,
        "body": body,
        "paragraphs": paragraphs,
        "is_damaged": False,
        "damage_reason": None
    }

def extract_pdf(file_path: str) -> Dict[str, Any]:
    if not pymupdf:
        raise RuntimeError("pymupdf is not installed")

    try:
        doc = pymupdf.open(file_path)
    except Exception as e:
        return {
            "text": "",
            "header_meta": {},
            "body": "",
            "paragraphs": [],
            "is_damaged": True,
            "damage_reason": f"PDF open error: {str(e)}"
        }

    if len(doc) == 0:
        return {
            "text": "",
            "header_meta": {},
            "body": "",
            "paragraphs": [],
            "is_damaged": True,
            "damage_reason": "PDF has 0 pages"
        }

    pages_text = []
    for page in doc:
        pages_text.append(page.get_text())

    full_text = "\n".join(pages_text)
    meta, body = parse_metadata_header(full_text)
    paragraphs = extract_paragraphs(body)

    return {
        "text": full_text,
        "header_meta": meta,
        "body": body,
        "paragraphs": paragraphs,
        "is_damaged": False,
        "damage_reason": None
    }

def extract_docx(file_path: str) -> Dict[str, Any]:
    if not docx:
        raise RuntimeError("python-docx is not installed")

    try:
        doc = docx.Document(file_path)
    except Exception as e:
        return {
            "text": "",
            "header_meta": {},
            "body": "",
            "paragraphs": [],
            "is_damaged": True,
            "damage_reason": f"DOCX open error: {str(e)}"
        }

    para_texts = [p.text for p in doc.paragraphs if p.text is not None]
    full_text = "\n".join(para_texts)

    if not full_text.strip():
        return {
            "text": "",
            "header_meta": {},
            "body": "",
            "paragraphs": [],
            "is_damaged": True,
            "damage_reason": "Empty DOCX content"
        }

    meta, body = parse_metadata_header(full_text)
    paragraphs = extract_paragraphs(body)

    return {
        "text": full_text,
        "header_meta": meta,
        "body": body,
        "paragraphs": paragraphs,
        "is_damaged": False,
        "damage_reason": None
    }

def extract_paragraphs(body_text: str) -> List[Dict[str, Any]]:
    """
    Extracts paragraphs and preserves markers like [P1], [P2] etc.
    """
    if not body_text:
        return []

    # Match paragraphs by [P\d+] or double newlines
    p_pattern = re.compile(r"(\[P\d+\])")
    parts = p_pattern.split(body_text)

    paragraphs = []
    current_marker = "P1"

    if len(parts) > 1:
        # Paragraph markers were found
        for i in range(1, len(parts), 2):
            marker = parts[i].strip("[]")
            content = parts[i+1].strip() if i+1 < len(parts) else ""
            paragraphs.append({
                "marker": marker,
                "text": f"[{marker}] {content}".strip()
            })
    else:
        # Fallback to standard double newline split
        raw_paras = [p.strip() for p in body_text.split("\n\n") if p.strip()]
        for idx, p in enumerate(raw_paras, 1):
            paragraphs.append({
                "marker": f"P{idx}",
                "text": f"[P{idx}] {p}" if not p.startswith(f"[P{idx}]") else p
            })

    return paragraphs

def extract_document(file_path: str) -> Dict[str, Any]:
    """
    Unified extractor dispatching by file extension.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".txt":
        return extract_txt(file_path)
    elif ext == ".pdf":
        return extract_pdf(file_path)
    elif ext == ".docx":
        return extract_docx(file_path)
    else:
        return {
            "text": "",
            "header_meta": {},
            "body": "",
            "paragraphs": [],
            "is_damaged": True,
            "damage_reason": f"Unsupported format: {ext}"
        }
