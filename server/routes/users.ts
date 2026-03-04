import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';

const router = Router();

router.get('/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await db.get(
      'SELECT * FROM users WHERE uid = ?',
      [uid]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    const profile = await db.get(
      'SELECT * FROM profiles WHERE user_id = ?',
      [uid]
    );

    res.json({ ...user, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
