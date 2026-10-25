import { Router, Request, Response } from 'express';
import { checkDatabaseHealth } from '../db/pool';
import fs from 'fs';
import path from 'path';

export const healthRouter = Router();

healthRouter.get('/', async (_req: Request, res: Response) => {
  const dbHealth = await checkDatabaseHealth();
  
  // Check if normalized corpus exists
  const ingestedPath = path.resolve(
    __dirname,
    '../../../../03_Ragnarok Trial of the Nine Realms/dev_pack_E5/ingested_output/normalized_documents.json'
  );
  const isCorpusIngested = fs.existsSync(ingestedPath);

  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'TLE Ragnarok Courtroom API',
    database: dbHealth,
    corpus: {
      isIngested: isCorpusIngested,
      ingestedPath,
    },
    systemClock: {
      asOfDate: '2027-01-25',
      note: 'Simulated clock strictly enforced for trial proceedings',
    },
  });
});
