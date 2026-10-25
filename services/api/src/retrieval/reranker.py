"""
Reranking Engine & Hybrid Retrieval
Supports:
1. OpenRouter (nvidia/nemotron-3.5-rerank-8b:free or cohere/rerank-v3.5) for cross-encoder 8B precision.
2. Local Reciprocal Rank Fusion (RRF) & BM25 fallback.
3. Multiplied by Runemark Outlet Credibility Tiers (ATL-0012) to catch planted traps.
4. Strict Simulated Clock Filter (pub_date <= as_of_date).
"""

import os
import json
import urllib.request
from typing import List, Dict, Any, Optional

TIER_MULTIPLIERS = {
    1: 1.25, # Official notices (Tier 1)
    2: 1.05, # Reputable trade/wire (Tier 2)
    3: 0.90, # Regional/Analyst (Tier 3)
    4: 0.65, # Social post / tabloid / unverified (Tier 4)
}

def rerank_openrouter(
    query: str,
    documents: List[str],
    model: str = "nvidia/nemotron-3.5-rerank-8b:free",
    api_key: Optional[str] = None
) -> List[Dict[str, Any]]:
    """
    Calls OpenRouter /api/v1/rerank endpoint with cross-encoder model.
    Returns list of dicts: [{'index': int, 'relevance_score': float}]
    """
    key = api_key or os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise ValueError("OPENROUTER_API_KEY is not configured.")

    url = "https://openrouter.ai/api/v1/rerank"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/tle-ragnarok",
        "X-Title": "TLE Ragnarok Courtroom System",
    }

    payload = json.dumps({
        "model": model,
        "query": query,
        "documents": documents,
    }).encode("utf-8")

    req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        # OpenRouter returns results with index and relevance_score
        return data.get("results", [])

def compute_reciprocal_rank_fusion(
    vector_ranks: Dict[str, int],
    bm25_ranks: Dict[str, int],
    k: int = 60
) -> Dict[str, float]:
    """
    RRF score = 1 / (k + rank_vector) + 1 / (k + rank_bm25)
    """
    scores = {}
    all_keys = set(vector_ranks.keys()).union(set(bm25_ranks.keys()))

    for key in all_keys:
        v_rank = vector_ranks.get(key, 9999)
        b_rank = bm25_ranks.get(key, 9999)
        score = (1.0 / (k + v_rank)) + (1.0 / (k + b_rank))
        scores[key] = score

    return scores

def rerank_search_results(
    query: str,
    chunks: List[Dict[str, Any]],
    as_of_date: Optional[str] = "2027-01-25",
    max_tier: Optional[int] = 4,
    top_k: int = 10,
    prefer_openrouter: bool = False
) -> List[Dict[str, Any]]:
    """
    Reranks candidate chunks using hybrid score weighted by outlet credibility.
    Filters out any document dated after as_of_date (clock violation).
    If prefer_openrouter is True and OPENROUTER_API_KEY is available, uses
    nvidia/nemotron-3.5-rerank-8b:free cross-encoder.
    """
    valid_chunks = []

    for c in chunks:
        meta = c.get("metadata", {})
        pub_date = meta.get("PUB_DATE") or meta.get("pubDate")
        tier = meta.get("RELIABILITY") or meta.get("reliability") or 4
        try:
            tier = int(tier)
        except ValueError:
            tier = 4

        # 1. As-of date strict filter (clock check)
        if as_of_date and pub_date:
            if pub_date > as_of_date:
                continue # Clock violation: published after as-of date

        # 2. Max tier filter if specified
        if max_tier and tier > max_tier:
            continue

        valid_chunks.append((c, tier))

    if not valid_chunks:
        return []

    # Attempt OpenRouter cross-encoder reranking if configured
    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    rerank_model = os.environ.get("RERANK_MODEL", "nvidia/nemotron-3.5-rerank-8b:free")

    cross_encoder_scores = {}
    if prefer_openrouter and openrouter_key:
        try:
            doc_texts = [item[0].get("text", "") for item in valid_chunks]
            rerank_resp = rerank_openrouter(query, doc_texts, model=rerank_model, api_key=openrouter_key)
            for r in rerank_resp:
                idx = r.get("index")
                score = r.get("relevance_score", 0.5)
                if idx is not None and idx < len(valid_chunks):
                    cross_encoder_scores[idx] = score
        except Exception as e:
            print(f"[Reranker Warning] OpenRouter cross-encoder failed ({e}), using lexical/vector scores...")

    scored_results = []
    for idx, (item, tier) in enumerate(valid_chunks):
        if idx in cross_encoder_scores:
            base_score = cross_encoder_scores[idx]
        else:
            base_score = item.get("score", 0.5)

        tier_weight = TIER_MULTIPLIERS.get(tier, 0.7)
        final_score = base_score * tier_weight

        item_copy = dict(item)
        item_copy["rerank_score"] = round(final_score, 4)
        item_copy["base_relevance"] = round(base_score, 4)
        item_copy["credibility_weight"] = tier_weight
        item_copy["is_official"] = (tier == 1)
        item_copy["is_unverified"] = (tier == 4)
        scored_results.append(item_copy)

    # Sort descending by rerank score
    scored_results.sort(key=lambda x: x["rerank_score"], reverse=True)
    return scored_results[:top_k]
