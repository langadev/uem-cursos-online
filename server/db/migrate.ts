import { db } from './connection.js';

export async function migrate() {
  console.log('🔄 Running database migrations...');

  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      uid TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      name TEXT,
      role TEXT CHECK(role IN ('student', 'instructor', 'admin')),
      avatar_url TEXT,
      bio TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Profiles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      specialization TEXT,
      students_count INTEGER DEFAULT 0,
      courses_count INTEGER DEFAULT 0,
      rating REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(uid)
    )
  `);

  // Courses table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      instructor_uid TEXT NOT NULL,
      creator_uid TEXT,
      title TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      level TEXT,
      category TEXT,
      duration_hours INTEGER,
      price REAL,
      is_active BOOLEAN DEFAULT 1,
      rating REAL DEFAULT 0,
      students_count INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(instructor_uid) REFERENCES users(uid)
    )
  `);

  // Modules table (subcollection of courses)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      order_index INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(course_id) REFERENCES courses(id)
    )
  `);

  // Lessons table (subcollection of modules)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id TEXT PRIMARY KEY,
      module_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      content TEXT,
      video_url TEXT,
      duration_minutes INTEGER,
      order_index INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(module_id) REFERENCES modules(id),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    )
  `);

  // Enrollments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_uid TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_uid TEXT,
      instructor_uid TEXT,
      status TEXT DEFAULT 'active',
      progress REAL DEFAULT 0,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid)
    )
  `);

  // Lesson Completions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_completions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_uid TEXT NOT NULL,
      course_id TEXT NOT NULL,
      lesson_id TEXT NOT NULL,
      instructor_uid TEXT,
      completed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid)
    )
  `);

  // Submissions table (exercise uploads)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_uid TEXT NOT NULL,
      course_id TEXT NOT NULL,
      course_uid TEXT,
      lesson_id TEXT NOT NULL,
      instructor_uid TEXT,
      file_url TEXT,
      file_name TEXT,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid)
    )
  `);

  // Questions table (forum)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id TEXT PRIMARY KEY,
      course_id TEXT,
      instructor_uid TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT,
      author_uid TEXT NOT NULL,
      author_name TEXT,
      upvotes INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      FOREIGN KEY(author_uid) REFERENCES users(uid)
    )
  `);

  // Answers table (forum replies)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id TEXT PRIMARY KEY,
      question_id TEXT NOT NULL,
      author_uid TEXT NOT NULL,
      author_name TEXT,
      content TEXT,
      upvotes INTEGER DEFAULT 0,
      is_correct BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(question_id) REFERENCES questions(id),
      FOREIGN KEY(author_uid) REFERENCES users(uid)
    )
  `);

  // Certificates table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      user_uid TEXT NOT NULL,
      course_id TEXT NOT NULL,
      instructor_uid TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'confirmed', 'rejected')),
      transaction_id TEXT UNIQUE,
      verification_code TEXT UNIQUE,
      certificate_url TEXT,
      approved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid)
    )
  `);

  // Feedback table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id TEXT PRIMARY KEY,
      user_uid TEXT NOT NULL,
      course_id TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id)
    )
  `);

  // Sync Queue (para controle offline)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id TEXT PRIMARY KEY,
      operation TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT,
      data TEXT,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'synced', 'failed')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      synced_at DATETIME
    )
  `);

  // Índices para performance
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_users_uid ON users(uid);
    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_uid);
    CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_uid);
    CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
    CREATE INDEX IF NOT EXISTS idx_lesson_completions_user ON lesson_completions(user_uid);
    CREATE INDEX IF NOT EXISTS idx_lesson_completions_course ON lesson_completions(course_id);
    CREATE INDEX IF NOT EXISTS idx_submissions_user ON submissions(user_uid);
    CREATE INDEX IF NOT EXISTS idx_submissions_course ON submissions(course_id);
    CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_uid);
    CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
    CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
  `);

  console.log('✅ Database migrations completed successfully');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch(console.error);
}
