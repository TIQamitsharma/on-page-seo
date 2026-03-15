import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

import auditRoutes from './routes/audit.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import recommendationsRoutes from './routes/recommendations.routes.js';

// Load environment variables
config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Express app
const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Middleware
app.use(cors({
  origin: isProduction
    ? false  // In production, same-origin requests only
    : ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:3005'],
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/audits', auditRoutes);
app.use('/api/reports', auditRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/recommendations', recommendationsRoutes);

// Serve static files in production
if (isProduction) {
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║                                                       ║
  ║   On-Page SEO Analyzer                                ║
  ║   Server running on http://localhost:${PORT}             ║
  ║   Mode: ${isProduction ? 'Production' : 'Development'}                                   ║
  ║                                                       ║
  ╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
