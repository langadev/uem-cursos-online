import { Router, Request, Response } from 'express';
import { db } from '../db/connection.js';

const router = Router();

// GET all courses
router.get('/', async (req: Request, res: Response) => {
  try {
    const courses = await db.all(
      'SELECT * FROM courses WHERE is_active = 1 ORDER BY created_at DESC'
    );
    res.json(courses);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET course by ID with modules and lessons
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const course = await db.get(
      'SELECT * FROM courses WHERE id = ?',
      [id]
    );
    if (!course) return res.status(404).json({ error: 'Course not found' });

    const modules = await db.all(
      'SELECT * FROM modules WHERE course_id = ? ORDER BY order_index',
      [id]
    );

    for (const module of modules) {
      module.lessons = await db.all(
        'SELECT * FROM lessons WHERE module_id = ? ORDER BY order_index',
        [module.id]
      );
    }

    course.modules = modules;
    res.json(course);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST create course (instructor only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { instructor_uid, title, description, image_url, category, level, price } = req.body;
    if (!instructor_uid || !title) return res.status(400).json({ error: 'Missing required fields' });

    const id = require('crypto').randomUUID();

    await db.run(
      'INSERT INTO courses (id, instructor_uid, title, description, image_url, category, level, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, instructor_uid, title, description, image_url, category, level, price]
    );

    res.status(201).json({ id, instructor_uid, title, description, image_url, category, level, price });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT update course
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, image_url, category, level, price, is_active } = req.body;

    await db.run(
      'UPDATE courses SET title=?, description=?, image_url=?, category=?, level=?, price=?, is_active=?, updated_at=CURRENT_TIMESTAMP WHERE id=?',
      [title, description, image_url, category, level, price, is_active, id]
    );

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE course
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.run('UPDATE courses SET is_active=0 WHERE id=?', [id]);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
