import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    res.json({ message: 'Submissions endpoint' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
