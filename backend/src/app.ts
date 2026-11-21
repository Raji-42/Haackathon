import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './config';
import apiRoutes from './routes/api.routes';

const app = express();

// Ensure certificates directory exists
if (!fs.existsSync(config.certificateStorageDir)) {
  fs.mkdirSync(config.certificateStorageDir, { recursive: true });
}

// Global Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'HEALTHY',
    service: 'CertiFlow API',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

// API Routes
app.use('/api', apiRoutes);

// Global Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled Application Error:', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
});

export default app;
