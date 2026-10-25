import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';

export const retrievalRouter = Router();

const DEFAULT_CHUNKS_PATH = path.resolve(
  __dirname,
  '../../../../03_Ragnarok Trial of the Nine Realms/dev_pack_E5/ingested_output/chunks_with_embeddings.json'
);

let cachedChunks: any[] | null = null;

function getChunks(): any[] {
  if (!cachedChunks && fs.existsSync(DEFAULT_CHUNKS_PATH)) {
    cachedChunks = JSON.parse(fs.readFileSync(DEFAULT_CHUNKS_PATH, 'utf-8'));
  }
  return cachedChunks || [];
}

const TIER_MULTIPLIERS: Record<number, number> = {
  1: 1.25, // Official
  2: 1.05, // Reputable trade/wire
  3: 0.90, // Regional / Analyst
  4: 0.65, // Tabloid / Social
};

// POST /api/retrieval/search
retrievalRouter.post('/search', (req: Request, res: Response) => {
  const { query, asOfDate = '2027-01-25', maxTier = 4, country, sector, eventId, topK = 10 } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }

  const chunks = getChunks();
  const queryTerms = (query as string).toLowerCase().split(/\s+/).filter(Boolean);

  const matched = [];

  for (const c of chunks) {
    const meta = c.metadata || {};
    const pubDate = meta.PUB_DATE || meta.pubDate;
    const tier = parseInt(meta.RELIABILITY || meta.reliability || '4', 10);
    const chunkCountry = (meta.COUNTRY || '').toLowerCase();
    const chunkSector = (meta.SECTOR || '').toLowerCase();
    const chunkEvent = meta.EVENT_ID || '';

    // 1. Clock violation check: Must be on or before asOfDate
    if (pubDate && asOfDate && pubDate > asOfDate) {
      continue;
    }

    // 2. Reliability filter
    if (tier > maxTier) {
      continue;
    }

    // 3. Country / Sector / Event filters
    if (country && !chunkCountry.includes(country.toLowerCase())) {
      continue;
    }
    if (sector && !chunkSector.includes(sector.toLowerCase())) {
      continue;
    }
    if (eventId && chunkEvent !== eventId && chunkEvent !== 'NONE') {
      continue;
    }

    // 4. Lexical keyword matching score
    const textLower = c.text.toLowerCase();
    let termMatches = 0;
    for (const t of queryTerms) {
      if (textLower.includes(t)) {
        termMatches++;
      }
    }

    if (termMatches > 0) {
      const baseScore = termMatches / queryTerms.length;
      const credibilityWeight = TIER_MULTIPLIERS[tier] || 0.7;
      const finalScore = baseScore * credibilityWeight;

      matched.push({
        chunkId: c.chunk_id,
        docId: c.doc_id,
        paragraphRefs: c.paragraph_refs,
        text: c.text,
        baseScore: Math.round(baseScore * 1000) / 1000,
        credibilityWeight,
        score: Math.round(finalScore * 1000) / 1000,
        metadata: {
          ...meta,
          reliabilityTier: tier,
        },
      });
    }
  }

  // Sort descending by final score
  matched.sort((a, b) => b.score - a.score);

  return res.json({
    query,
    asOfDate,
    totalMatches: matched.length,
    results: matched.slice(0, topK),
  });
});

// POST /api/retrieval/rerank
retrievalRouter.post('/rerank', (req: Request, res: Response) => {
  const { items, topK = 10 } = req.body;
  if (!items || !Array.isArray(items)) {
    return res.status(400).json({ error: 'Items array is required.' });
  }

  const reranked = items.map((item: any) => {
    const tier = item.metadata?.reliabilityTier || item.metadata?.RELIABILITY || 4;
    const multiplier = TIER_MULTIPLIERS[Number(tier)] || 0.7;
    const baseScore = item.score || 0.5;
    return {
      ...item,
      rerankScore: Math.round(baseScore * multiplier * 1000) / 1000,
      credibilityTier: Number(tier),
      isOfficial: Number(tier) === 1,
      isCautionary: Number(tier) === 4,
    };
  });

  reranked.sort((a: any, b: any) => b.rerankScore - a.rerankScore);

  return res.json({
    results: reranked.slice(0, topK),
  });
});
