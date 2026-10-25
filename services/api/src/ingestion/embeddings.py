"""
Vector Embeddings Generator
Supports:
1. OpenRouter (nvidia/nemotron-3.5-embed-8b:free) with 1024-dim Matryoshka truncation for pgvector HNSW compatibility.
2. Local fast fallback with sentence-transformers/all-MiniLM-L6-v2 (384 dimensions).
"""

import os
import sys
import json
import time
from typing import List, Union

_local_model = None

def get_local_model():
    global _local_model
    if _local_model is None:
        from sentence_transformers import SentenceTransformer
        _local_model = SentenceTransformer("all-MiniLM-L6-v2")
    return _local_model

def generate_embeddings_openrouter(
    texts: List[str],
    model: str = "nvidia/nemotron-3.5-embed-8b:free",
    dimensions: int = 1024,
    api_key: str = None
) -> List[List[float]]:
    """
    Generates high-accuracy 8B embeddings via OpenRouter /api/v1/embeddings.
    Truncates to dimensions (1024) for optimal pgvector HNSW indexing.
    """
    import urllib.request

    key = api_key or os.environ.get("OPENROUTER_API_KEY")
    if not key:
        raise ValueError("OPENROUTER_API_KEY is not configured.")

    url = "https://openrouter.ai/api/v1/embeddings"
    headers = {
        "Authorization": f"Bearer {key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://github.com/tle-ragnarok",
        "X-Title": "TLE Ragnarok Courtroom System",
    }

    all_embeddings = []
    # Batch in groups of 25 to respect free-tier token/payload limits
    batch_size = 25
    for i in range(0, len(texts), batch_size):
        batch = texts[i:i + batch_size]
        payload = json.dumps({
            "model": model,
            "input": batch,
            "dimensions": dimensions
        }).encode("utf-8")

        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            batch_embs = [item["embedding"] for item in data.get("data", [])]
            all_embeddings.extend(batch_embs)

        # Brief pause between batches for rate limits
        if i + batch_size < len(texts):
            time.sleep(0.5)

    return all_embeddings

def generate_embeddings(
    texts: List[str],
    batch_size: int = 32,
    prefer_openrouter: bool = True
) -> List[List[float]]:
    """
    Generates embeddings. If prefer_openrouter is True and OPENROUTER_API_KEY is set,
    uses nvidia/nemotron-3.5-embed-8b:free (1024-dim). Gracefully falls back to local MiniLM.
    """
    if not texts:
        return []

    openrouter_key = os.environ.get("OPENROUTER_API_KEY")
    embedding_model = os.environ.get("EMBEDDING_MODEL", "nvidia/nemotron-3.5-embed-8b:free")

    if prefer_openrouter and openrouter_key:
        try:
            print(f"[Embeddings] Generating {len(texts)} embeddings with OpenRouter ({embedding_model})...")
            return generate_embeddings_openrouter(texts, model=embedding_model, dimensions=1024, api_key=openrouter_key)
        except Exception as err:
            print(f"[Embeddings Warning] OpenRouter failed ({err}), falling back to local MiniLM...")

    # Local fallback
    model = get_local_model()
    embeddings = model.encode(
        texts,
        batch_size=batch_size,
        show_progress_bar=False,
        normalize_embeddings=True
    )
    return [emb.tolist() for emb in embeddings]
