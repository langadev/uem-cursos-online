import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { randomUUID } from 'crypto';

const router = Router();

// GET /api/auth/me - Get current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const uid = req.headers['x-user-id'] as string;
    if (!uid) return res.status(401).json({ error: 'Unauthorized' });

    const user = await db.get(
      'SELECT * FROM users WHERE uid = ?',
      [uid]
    );
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register - Register new user
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { uid, email, name, role = 'student' } = req.body;
    if (!uid || !email) return res.status(400).json({ error: 'Missing required fields' });

    const id = randomUUID();

    await db.run(
      'INSERT INTO users (id, uid, email, name, role) VALUES (?, ?, ?, ?, ?)',
      [id, uid, email, name || null, role]
    );

    // Create profile
    await db.run(
      'INSERT INTO profiles (id, user_id) VALUES (?, ?)',
      [randomUUID(), uid]
    );

    res.status(201).json({ id, uid, email, name, role });
  } catch (err: any) {
    if (err.message.includes('UNIQUE constraint failed')) {
      return res.status(409).json({ error: 'User already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login - Login user
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, uid } = req.body;
    if (!email && !uid) return res.status(400).json({ error: 'Missing credentials' });

    const user = await db.get(
      'SELECT * FROM users WHERE email = ? OR uid = ?',
      [email, uid]
    );

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ user, token: Buffer.from(user.uid).toString('base64') });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
