import type { Request, Response, NextFunction } from 'express';
import { getUserIdFromToken } from '../db/supabase.js';

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.substring(7);
    const userId = await getUserIdFromToken(token);

    if (!userId) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    req.userId = userId;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}
