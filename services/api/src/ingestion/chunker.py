"""
Paragraph-Aware Chunking Service
Chunks documents deterministically to ~512 tokens with ~50-token overlap.
Preserves paragraph markers [P1], [P2], document IDs, and metadata.
Never mixes passages across different documents.
"""

from typing import List, Dict, Any

def approximate_token_count(text: str) -> int:
    """
    Standard whitespace & punctuation approximate tokenizer:
    1 token ≈ 4 characters or 0.75 words.
    """
    words = text.split()
    return max(1, int(len(words) * 1.3))

def chunk_document(
    doc_id: str,
    paragraphs: List[Dict[str, Any]],
    metadata: Dict[str, Any],
    target_tokens: int = 512,
    overlap_tokens: int = 50
) -> List[Dict[str, Any]]:
    """
    Groups paragraphs deterministically up to target_tokens.
    Includes overlap paragraphs when chunk boundary rolls over.
    """
    if not paragraphs:
        return []

    chunks: List[Dict[str, Any]] = []
    current_paras: List[Dict[str, Any]] = []
    current_tokens = 0
    chunk_index = 0

    for p in paragraphs:
        p_text = p.get("text", "").strip()
        if not p_text:
            continue

        p_tokens = approximate_token_count(p_text)

        # If adding this paragraph exceeds target_tokens and we already have content:
        if current_tokens + p_tokens > target_tokens and current_paras:
            # Finalize current chunk
            chunk_text = "\n\n".join([item["text"] for item in current_paras])
            p_refs = [item["marker"] for item in current_paras]

            chunks.append({
                "chunk_id": f"{doc_id}_c{chunk_index}",
                "doc_id": doc_id,
                "chunk_index": chunk_index,
                "paragraph_refs": p_refs,
                "text": chunk_text,
                "token_count": approximate_token_count(chunk_text),
                "metadata": metadata
            })
            chunk_index += 1

            # Prepare overlap for next chunk
            overlap_paras: List[Dict[str, Any]] = []
            overlap_accum = 0
            for item in reversed(current_paras):
                item_tok = approximate_token_count(item["text"])
                if overlap_accum + item_tok <= overlap_tokens or not overlap_paras:
                    overlap_paras.insert(0, item)
                    overlap_accum += item_tok
                else:
                    break

            current_paras = overlap_paras + [p]
            current_tokens = sum(approximate_token_count(item["text"]) for item in current_paras)
        else:
            current_paras.append(p)
            current_tokens += p_tokens

    # Flush final chunk
    if current_paras:
        chunk_text = "\n\n".join([item["text"] for item in current_paras])
        p_refs = [item["marker"] for item in current_paras]

        chunks.append({
            "chunk_id": f"{doc_id}_c{chunk_index}",
            "doc_id": doc_id,
            "chunk_index": chunk_index,
            "paragraph_refs": p_refs,
            "text": chunk_text,
            "token_count": approximate_token_count(chunk_text),
            "metadata": metadata
        })

    return chunks
