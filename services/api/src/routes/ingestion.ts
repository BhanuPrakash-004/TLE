import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export const ingestionRouter = Router();

const DEFAULT_PACK_PATH = path.resolve(
  __dirname,
  '../../../../03_Ragnarok Trial of the Nine Realms/dev_pack_E5'
);

// GET /api/ingestion/status
ingestionRouter.get('/status', (_req: Request, res: Response) => {
  const summaryPath = path.join(DEFAULT_PACK_PATH, 'ingested_output', 'ingestion_summary.txt');
  const docsPath = path.join(DEFAULT_PACK_PATH, 'ingested_output', 'normalized_documents.json');
  const chunksPath = path.join(DEFAULT_PACK_PATH, 'ingested_output', 'chunks_with_embeddings.json');

  if (!fs.existsSync(summaryPath)) {
    return res.json({
      status: 'NOT_INGESTED',
      message: 'Ingestion has not been run yet.',
    });
  }

  const docs = JSON.parse(fs.readFileSync(docsPath, 'utf-8'));
  const chunks = JSON.parse(fs.readFileSync(chunksPath, 'utf-8'));

  return res.json({
    status: 'INGESTED',
    pack: 'dev_pack_E5',
    totalDocuments: docs.length,
    totalChunks: chunks.length,
    asOfDate: '2027-01-25',
    summaryAvailable: true,
  });
});

// GET /api/ingestion/summary
ingestionRouter.get('/summary', (_req: Request, res: Response) => {
  const summaryPath = path.join(DEFAULT_PACK_PATH, 'ingested_output', 'ingestion_summary.txt');
  if (!fs.existsSync(summaryPath)) {
    return res.status(404).json({ error: 'Summary report not found. Run ingestion first.' });
  }

  const text = fs.readFileSync(summaryPath, 'utf-8');
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  return res.send(text);
});

// POST /api/ingestion/run (Supports standard JSON or Server-Sent Events)
ingestionRouter.post('/run', (req: Request, res: Response) => {
  const packPath = req.body?.packPath ? path.resolve(req.body.packPath) : DEFAULT_PACK_PATH;
  const isSSE = req.headers.accept === 'text/event-stream';

  const pipelineScript = path.resolve(__dirname, '../ingestion/pipeline.py');

  if (isSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    res.write(`data: ${JSON.stringify({ step: 'START', message: 'Starting pipeline execution...' })}\n\n`);

    const child = spawn('python', [pipelineScript, '--pack', packPath]);

    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      res.write(`data: ${JSON.stringify({ step: 'PROGRESS', output: line })}\n\n`);
    });

    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      res.write(`data: ${JSON.stringify({ step: 'STDERR', output: line })}\n\n`);
    });

    child.on('close', (code) => {
      res.write(
        `data: ${JSON.stringify({
          step: 'COMPLETED',
          exitCode: code,
          message: code === 0 ? 'Ingestion completed successfully.' : 'Ingestion failed.',
        })}\n\n`
      );
      res.end();
    });
  } else {
    const child = spawn('python', [pipelineScript, '--pack', packPath]);
    let output = '';
    let errOutput = '';

    child.stdout.on('data', (d) => (output += d.toString()));
    child.stderr.on('data', (d) => (errOutput += d.toString()));

    child.on('close', (code) => {
      if (code === 0) {
        return res.json({
          status: 'SUCCESS',
          output: output.split('\n').filter(Boolean),
        });
      } else {
        return res.status(500).json({
          status: 'FAILED',
          exitCode: code,
          error: errOutput || output,
        });
      }
    });
  }
});
