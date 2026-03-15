import { Router, type Request, type Response } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { getPageResultById, supabase } from '../db/supabase.js';
import { generateSEORecommendations } from '../services/claude.service.js';

const router = Router();

router.post('/:pageResultId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageResultId } = req.params;
    const userId = req.userId!;

    const pageResult = await getPageResultById(pageResultId, userId);

    if (!pageResult) {
      res.status(404).json({ error: 'Page result not found' });
      return;
    }

    const { data: existing } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('page_result_id', pageResultId)
      .eq('user_id', userId)
      .maybeSingle();

    if (existing) {
      res.json(existing);
      return;
    }

    const recommendations = await generateSEORecommendations(userId, pageResult);

    const { data: newRec, error } = await supabase
      .from('ai_recommendations')
      .insert({
        page_result_id: pageResultId,
        user_id: userId,
        recommendations,
      })
      .select()
      .single();

    if (error) throw error;

    res.json(newRec);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Generate recommendations error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

router.get('/:pageResultId', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { pageResultId } = req.params;
    const userId = req.userId!;

    const { data, error } = await supabase
      .from('ai_recommendations')
      .select('*')
      .eq('page_result_id', pageResultId)
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      res.status(404).json({ error: 'Recommendations not found' });
      return;
    }

    res.json(data);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Get recommendations error:', error);
    res.status(500).json({ error: errorMessage });
  }
});

export default router;
