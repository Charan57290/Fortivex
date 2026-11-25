import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import { store } from './db/store';
import { errorHandler } from './middleware/errorHandler';
import { geminiProvider } from './services/ai/llmProvider';

import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import customerRoutes from './routes/customers';
import leadRoutes from './routes/leads';
import conversationRoutes from './routes/conversations';
import knowledgeRoutes from './routes/knowledge';
import appointmentRoutes from './routes/appointments';
import agentRoutes from './routes/agent';
import aiRoutes from './routes/ai';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: env.FRONTEND_URL.split(',').map((s) => s.trim()),
      credentials: true,
    })
  );
  app.use(express.json({ limit: '2mb' }));

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' },
  });
  app.use('/api', apiLimiter);

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'voxsales-ai-backend',
      timestamp: new Date().toISOString(),
      database: store.backendType,
      aiMode: geminiProvider.isConfigured() ? 'gemini-live-ready' : 'demo-offline-ready',
      geminiConfigured: geminiProvider.isConfigured(),
    });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api/customers', customerRoutes);
  app.use('/api/leads', leadRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api/knowledge', knowledgeRoutes);
  app.use('/api/appointments', appointmentRoutes);
  app.use('/api/agent', agentRoutes);
  app.use('/api/ai', aiRoutes);

  app.use((_req, res) => {
    res.status(404).json({ error: 'API route not found' });
  });

  app.use(errorHandler);
  return app;
}
