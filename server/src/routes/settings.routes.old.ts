import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getUserApiKey, setUserApiKey, supabase } from '../db/supabase.js';
import { discoverPages } from '../services/firecrawl.service.js';
import { analyzePage } from '../services/dataforseo.service.js';

const router = Router();

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const { data: keys, error } = await supabase
      .from('user_api_keys')
      .select('key_name, key_value')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) throw error;

    const settings: Record<string, string> = {};

    if (keys) {
      for (const key of keys) {
        const maskedValue = key.key_value.substring(0, 8) + '...' + key.key_value.substring(key.key_value.length - 4);
        settings[key.key_name] = maskedValue;
        settings[`${key.key_name}_configured`] = 'true';
      }
    }

    res.json(settings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get settings error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/status', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const firecrawlKey = await getUserApiKey(userId, 'firecrawl_api_key');
    const dataforseoUsername = await getUserApiKey(userId, 'dataforseo_username');
    const dataforseoPassword = await getUserApiKey(userId, 'dataforseo_password');

    const status = {
      firecrawl_configured: !!firecrawlKey,
      dataforseo_configured: !!(dataforseoUsername && dataforseoPassword),
      all_configured: !!(firecrawlKey && dataforseoUsername && dataforseoPassword),
    };

    res.json(status);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get settings status error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.put('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const updates = req.body;

    for (const [key, value] of Object.entries(updates)) {
      if (typeof value === 'string' && value.trim() !== '') {
        await setUserApiKey(userId, key, value);
      }
    }

    res.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Update settings error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.delete('/:key', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;
    const { key } = req.params;

    await supabase
      .from('user_api_keys')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('key_name', key);

    res.json({ success: true, message: 'Setting deleted successfully' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Delete setting error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.post('/test/firecrawl', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const apiKey = await getUserApiKey(userId, 'firecrawl_api_key');

    if (!apiKey) {
      res.json({ success: false, error: 'Firecrawl API key is not configured' });
      return;
    }

    await discoverPages('https://example.com', userId, 5);

    res.json({ success: true, message: 'Firecrawl API connection successful' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Test Firecrawl error:', error);
    res.json({ success: false, error: errorMessage });
  }
});

router.post('/test/dataforseo', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.userId!;

    const username = await getUserApiKey(userId, 'dataforseo_username');
    const password = await getUserApiKey(userId, 'dataforseo_password');

    if (!username || !password) {
      res.json({ success: false, error: 'DataForSEO credentials are not configured' });
      return;
    }

    await analyzePage('https://example.com', userId);

    res.json({ success: true, message: 'DataForSEO API connection successful' });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Test DataForSEO error:', error);
    res.json({ success: false, error: errorMessage });
  }
});

export default router;
