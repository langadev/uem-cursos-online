import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { randomUUID } from 'crypto';

const router = Router();

// GET certificates by status
router.get('/instructor/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const certificates = await db.all(
      'SELECT * FROM certificates WHERE instructor_uid = ? ORDER BY created_at DESC',
      [uid]
    );
    res.json(certificates);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST request certificate
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_uid, course_id, instructor_uid, transaction_id } = req.body;
    if (!user_uid || !course_id) return res.status(400).json({ error: 'Missing required fields' });

    const id = randomUUID();
    const verification_code = randomUUID();

    await db.run(
      'INSERT INTO certificates (id, user_uid, course_id, instructor_uid, transaction_id, verification_code) VALUES (?, ?, ?, ?, ?, ?)',
      [id, user_uid, course_id, instructor_uid, transaction_id, verification_code]
    );

    res.status(201).json({ id, user_uid, course_id, status: 'pending' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT approve/reject certificate
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, certificate_url } = req.body;

    await db.run(
      'UPDATE certificates SET status=?, certificate_url=?, approved_at=CURRENT_TIMESTAMP, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [status, certificate_url, id]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
