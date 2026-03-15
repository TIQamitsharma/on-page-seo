import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import {
  createAudit,
  getAuditById,
  getAllAudits,
  updateAuditStatus,
  updateAuditProgress,
  deleteAudit,
  insertPageResult,
  getPageResultsByAuditId,
  getPageResultById,
  deletePageResultsByAuditId,
} from '../db/supabase.js';
import { discoverPages } from '../services/firecrawl.service.js';
import { analyzePageWithRetry } from '../services/dataforseo.service.js';
import { transformSEOData } from '../services/seo-analyzer.service.js';
import type { ProgressEvent, CreateAuditRequest } from '../types/index.js';

const router = Router();

const sseConnections = new Map<string, Set<Response>>();
const cancelledAudits = new Set<string>();

function sendProgress(auditId: string, event: ProgressEvent): void {
  const connections = sseConnections.get(auditId);
  if (connections) {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    connections.forEach((res) => {
      res.write(data);
    });
  }
}

async function processAudit(
  auditId: string,
  url: string,
  userId: string,
  limit: number,
  pages?: string[]
): Promise<void> {
  try {
    await updateAuditStatus(auditId, 'processing');
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'processing',
      total_pages: 0,
      completed_pages: 0,
      current_url: pages ? 'Processing selected pages...' : 'Discovering pages...',
    });

    let pagesToProcess = pages;

    if (!pagesToProcess || pagesToProcess.length === 0) {
      pagesToProcess = await discoverPages(url, userId, limit);
    }

    if (pagesToProcess.length === 0) {
      throw new Error('No pages found for this URL');
    }

    await updateAuditProgress(auditId, pagesToProcess.length, 0);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'processing',
      total_pages: pagesToProcess.length,
      completed_pages: 0,
      current_url: pagesToProcess[0],
    });

    for (let i = 0; i < pagesToProcess.length; i++) {
      if (cancelledAudits.has(auditId)) {
        cancelledAudits.delete(auditId);
        await updateAuditStatus(auditId, 'cancelled', 'Audit cancelled by user');
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'failed',
          total_pages: pagesToProcess.length,
          completed_pages: i,
          error: 'Audit cancelled by user',
        });
        return;
      }

      const pageUrl = pagesToProcess[i];

      try {
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'processing',
          total_pages: pagesToProcess.length,
          completed_pages: i,
          current_url: pageUrl,
        });

        const { data, cost, time } = await analyzePageWithRetry(pageUrl, userId);
        const pageResult = transformSEOData(auditId, data, cost, time);

        await insertPageResult(userId, pageResult);

        await updateAuditProgress(auditId, pagesToProcess.length, i + 1);
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'processing',
          total_pages: pagesToProcess.length,
          completed_pages: i + 1,
          current_url: pageUrl,
        });
      } catch (error) {
        console.error(`Error processing page ${pageUrl}:`, error);
        sendProgress(auditId, {
          audit_id: auditId,
          status: 'processing',
          total_pages: pagesToProcess.length,
          completed_pages: i + 1,
          current_url: pageUrl,
          error: `Failed to analyze ${pageUrl}`,
        });
      }
    }

    await updateAuditStatus(auditId, 'completed');
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'completed',
      total_pages: pagesToProcess.length,
      completed_pages: pagesToProcess.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`Audit ${auditId} failed:`, errorMessage);

    await updateAuditStatus(auditId, 'failed', errorMessage);
    sendProgress(auditId, {
      audit_id: auditId,
      status: 'failed',
      total_pages: 0,
      completed_pages: 0,
      error: errorMessage,
    });
  }
}

router.post('/discover', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, limit = 100 } = req.body;
    const userId = req.userId!;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const pages = await discoverPages(url, userId, limit);

    res.json({
      url,
      pages,
      total: pages.length,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Discover error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { url, limit = 100, pages } = req.body as CreateAuditRequest;
    const userId = req.userId!;

    if (!url) {
      res.status(400).json({ error: 'URL is required' });
      return;
    }

    const audit = await createAudit(userId, url, 0);

    processAudit(audit.id, url, userId, limit, pages);

    res.status(201).json(audit);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Create audit error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const audits = await getAllAudits(userId);

    res.json(audits);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get audits error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const audit = await getAuditById(id, userId);

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const results = await getPageResultsByAuditId(id, userId);

    res.json({
      ...audit,
      results,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get audit error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const audit = await getAuditById(id, userId);

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    await deletePageResultsByAuditId(id, userId);
    await deleteAudit(id, userId);

    res.status(204).send();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete audit error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/:id/cancel', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const audit = await getAuditById(id, userId);

    if (!audit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    cancelledAudits.add(id);

    res.json({ success: true, message: 'Audit cancellation requested' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Cancel audit error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/:id/regenerate', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const oldAudit = await getAuditById(id, userId);

    if (!oldAudit) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    await deletePageResultsByAuditId(id, userId);
    await deleteAudit(id, userId);

    const newAudit = await createAudit(userId, oldAudit.url, 0);

    processAudit(newAudit.id, oldAudit.url, userId, 100);

    res.json(newAudit);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Regenerate audit error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/:id/progress', authMiddleware, (req: Request, res: Response): void => {
  const { id } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  if (!sseConnections.has(id)) {
    sseConnections.set(id, new Set());
  }

  sseConnections.get(id)!.add(res);

  req.on('close', () => {
    const connections = sseConnections.get(id);
    if (connections) {
      connections.delete(res);
      if (connections.size === 0) {
        sseConnections.delete(id);
      }
    }
  });
});

router.get('/report/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const result = await getPageResultById(id, userId);

    if (!result) {
      res.status(404).json({ error: 'Page result not found' });
      return;
    }

    res.json(result);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get page result error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
