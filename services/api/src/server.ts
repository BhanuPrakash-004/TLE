import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health';
import { ingestionRouter } from './routes/ingestion';
import { retrievalRouter } from './routes/retrieval';
import { casesRouter } from './routes/cases';

dotenv.config();

export const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/health', healthRouter);
app.use('/api/ingestion', ingestionRouter);
app.use('/api/retrieval', retrievalRouter);
app.use('/api/cases', casesRouter);

// Root route
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'TLE Ragnarok Courtroom API',
    status: 'ACTIVE',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      ingestionStatus: '/api/ingestion/status',
      ingestionRun: 'POST /api/ingestion/run',
      ingestionSummary: '/api/ingestion/summary',
      retrievalSearch: 'POST /api/retrieval/search',
      retrievalRerank: 'POST /api/retrieval/rerank',
    },
  });
});

// Global Error Handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[API Error]:', err.stack);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
  });
});

export async function startServer(port: number = 3000): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`[API Server] Running on http://localhost:${port}`);
      resolve();
    });
  });
}

if (require.main === module) {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  startServer(port).catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
