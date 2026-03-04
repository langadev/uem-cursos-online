import { db } from './connection.js';
import { randomUUID } from 'crypto';

export async function seed() {
  console.log('🌱 Seeding database with test data...');

  try {
    // Create test users
    const adminId = randomUUID();
    const instructorId = randomUUID();
    const studentId = randomUUID();

    await db.run(
      'INSERT INTO users (id, uid, email, name, role) VALUES (?, ?, ?, ?, ?)',
      [adminId, 'admin-001', 'admin@cemoque.edu', 'Admin', 'admin']
    );

    await db.run(
      'INSERT INTO users (id, uid, email, name, role) VALUES (?, ?, ?, ?, ?)',
      [instructorId, 'instructor-001', 'instructor@cemoque.edu', 'Professor João', 'instructor']
    );

    await db.run(
      'INSERT INTO users (id, uid, email, name, role) VALUES (?, ?, ?, ?, ?)',
      [studentId, 'student-001', 'student@cemoque.edu', 'Maria Silva', 'student']
    );

    // Create test course
    const courseId = randomUUID();
    await db.run(
      'INSERT INTO courses (id, instructor_uid, title, description, category, level, price, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        courseId,
        'instructor-001',
        'Introdução ao TypeScript',
        'Aprenda TypeScript do zero para avançado',
        'Programação',
        'Beginner',
        49.99,
        1
      ]
    );

    // Create modules
    const moduleId = randomUUID();
    await db.run(
      'INSERT INTO modules (id, course_id, title, order_index) VALUES (?, ?, ?, ?)',
      [moduleId, courseId, 'Fundamentos', 1]
    );

    // Create lessons
    for (let i = 1; i <= 5; i++) {
      const lessonId = randomUUID();
      await db.run(
        'INSERT INTO lessons (id, module_id, course_id, title, duration_minutes, order_index) VALUES (?, ?, ?, ?, ?, ?)',
        [
          lessonId,
          moduleId,
          courseId,
          `Aula ${i}: Tipos Básicos`,
          15,
          i
        ]
      );
    }

    // Create enrollment
    await db.run(
      'INSERT INTO enrollments (id, user_uid, course_id, instructor_uid) VALUES (?, ?, ?, ?)',
      [randomUUID(), 'student-001', courseId, 'instructor-001']
    );

    console.log('✅ Database seeded successfully with test data!');
    console.log(`
Test accounts created:
- Admin: admin@cemoque.edu / admin-001
- Instructor: instructor@cemoque.edu / instructor-001
- Student: student@cemoque.edu / student-001

Test course created:
- "Introdução ao TypeScript" with 5 lessons
    `);
  } catch (err) {
    console.error('Error seeding database:', err);
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed().catch(console.error);
}
