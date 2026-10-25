import { Router, Request, Response } from 'express';
import { CourtroomOrchestrator, TrialExecutionTrace } from '../graph/courtroom';

export const casesRouter = Router();

let latestTrace: TrialExecutionTrace | null = null;

// POST /api/cases/trial
casesRouter.post('/trial', async (req: Request, res: Response) => {
  const { question, asOfDate = '2027-01-25' } = req.body;
  const isSSE = req.headers.accept === 'text/event-stream';

  const orchestrator = new CourtroomOrchestrator();

  if (isSSE) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    try {
      const trace = await orchestrator.runTrial(question, asOfDate, (stepName, entry) => {
        res.write(`data: ${JSON.stringify({ step: stepName, entry })}\n\n`);
      });

      latestTrace = trace;
      res.write(`data: ${JSON.stringify({ step: 'TRIAL_FINISHED', trace })}\n\n`);
      res.end();
    } catch (err: any) {
      res.write(`data: ${JSON.stringify({ step: 'ERROR', error: err.message })}\n\n`);
      res.end();
    }
  } else {
    try {
      const trace = await orchestrator.runTrial(question, asOfDate);
      latestTrace = trace;
      return res.json({
        status: 'SUCCESS',
        trace,
      });
    } catch (err: any) {
      return res.status(500).json({
        status: 'ERROR',
        error: err.message,
      });
    }
  }
});

// GET /api/cases/latest
casesRouter.get('/latest', (_req: Request, res: Response) => {
  if (!latestTrace) {
    return res.status(404).json({ error: 'No trial has been executed yet.' });
  }
  return res.json(latestTrace);
});
