import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';
import { randomUUID } from 'crypto';

const router = Router();

// GET enrollments for user
router.get('/user/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const enrollments = await db.all(
      'SELECT * FROM enrollments WHERE user_uid = ? ORDER BY enrolled_at DESC',
      [uid]
    );
    res.json(enrollments);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST enroll student in course
router.post('/', async (req: Request, res: Response) => {
  try {
    const { user_uid, user_id, course_id, instructor_uid } = req.body;
    if (!user_uid || !course_id) return res.status(400).json({ error: 'Missing required fields' });

    const id = randomUUID();

    await db.run(
      'INSERT INTO enrollments (id, user_uid, user_id, course_id, instructor_uid) VALUES (?, ?, ?, ?, ?)',
      [id, user_uid, user_id, course_id, instructor_uid]
    );

    res.status(201).json({ id, user_uid, course_id, instructor_uid });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET instructor's students
router.get('/instructor/:uid/students', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const students = await db.all(
      `SELECT DISTINCT u.*, e.course_id, COUNT(lc.id) as lessons_completed
       FROM users u
       JOIN enrollments e ON u.uid = e.user_uid
       JOIN courses c ON e.course_id = c.id
       LEFT JOIN lesson_completions lc ON u.uid = lc.user_uid AND c.id = lc.course_id
       WHERE c.instructor_uid = ?
       GROUP BY u.uid`,
      [uid]
    );
    res.json(students);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
