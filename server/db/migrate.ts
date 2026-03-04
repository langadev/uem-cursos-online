import { db } from './connection.js';

export async function migrate() {
  console.log('🔄 Running database migrations...');

  // Inicializar conexão MySQL
  await db.initialize();

  // Users table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      uid VARCHAR(255) UNIQUE NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password_hash VARCHAR(255),
      name VARCHAR(255),
      role ENUM('student', 'instructor', 'admin') DEFAULT 'student',
      status ENUM('Ativo', 'Suspenso') DEFAULT 'Ativo',
      avatar_url TEXT,
      bio TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      last_login TIMESTAMP,
      INDEX idx_uid (uid),
      INDEX idx_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Alter existing users table to add columns if they don't exist
  try {
    await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)');
    await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM("Ativo", "Suspenso") DEFAULT "Ativo"');
    await db.exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login TIMESTAMP');
  } catch (e) {
    console.log('⚠️ Columns already exist or ALTER failed (expected)');
  }

  // Profiles table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(255) NOT NULL UNIQUE,
      bio TEXT,
      avatar_url TEXT,
      specialization VARCHAR(255),
      students_count INT DEFAULT 0,
      courses_count INT DEFAULT 0,
      rating DECIMAL(3,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(uid),
      INDEX idx_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Courses table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS courses (
      id VARCHAR(36) PRIMARY KEY,
      instructor_uid VARCHAR(255) NOT NULL,
      creator_uid VARCHAR(255),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      image_url TEXT,
      level VARCHAR(50),
      category VARCHAR(100),
      duration_hours INT,
      price DECIMAL(10,2),
      is_active BOOLEAN DEFAULT TRUE,
      rating DECIMAL(3,2) DEFAULT 0,
      students_count INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      INDEX idx_instructor (instructor_uid),
      INDEX idx_category (category)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Modules table (subcollection of courses)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS modules (
      id VARCHAR(36) PRIMARY KEY,
      course_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      order_index INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(course_id) REFERENCES courses(id),
      INDEX idx_course (course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Lessons table (subcollection of modules)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lessons (
      id VARCHAR(36) PRIMARY KEY,
      module_id VARCHAR(36) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      content LONGTEXT,
      video_url TEXT,
      duration_minutes INT,
      order_index INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(module_id) REFERENCES modules(id),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      INDEX idx_module (module_id),
      INDEX idx_course (course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Enrollments table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS enrollments (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(255),
      user_uid VARCHAR(255) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      course_uid VARCHAR(36),
      instructor_uid VARCHAR(255),
      status VARCHAR(50) DEFAULT 'active',
      progress DECIMAL(5,2) DEFAULT 0,
      enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      INDEX idx_user (user_uid),
      INDEX idx_course (course_id),
      UNIQUE KEY unique_enrollment (user_uid, course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Lesson Completions table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS lesson_completions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(255),
      user_uid VARCHAR(255) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      lesson_id VARCHAR(36) NOT NULL,
      instructor_uid VARCHAR(255),
      completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      INDEX idx_user (user_uid),
      INDEX idx_course (course_id),
      INDEX idx_lesson (lesson_id),
      UNIQUE KEY unique_completion (user_uid, lesson_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Submissions table (exercise uploads)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS submissions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(255),
      user_uid VARCHAR(255) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      course_uid VARCHAR(36),
      lesson_id VARCHAR(36) NOT NULL,
      instructor_uid VARCHAR(255),
      file_url TEXT,
      file_name VARCHAR(255),
      submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(lesson_id) REFERENCES lessons(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      INDEX idx_user (user_uid),
      INDEX idx_course (course_id),
      INDEX idx_lesson (lesson_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Questions table (forum)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS questions (
      id VARCHAR(36) PRIMARY KEY,
      course_id VARCHAR(36),
      instructor_uid VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      content TEXT,
      author_uid VARCHAR(255) NOT NULL,
      author_name VARCHAR(255),
      upvotes INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      FOREIGN KEY(author_uid) REFERENCES users(uid),
      INDEX idx_course (course_id),
      INDEX idx_instructor (instructor_uid),
      INDEX idx_author (author_uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Answers table (forum replies)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS answers (
      id VARCHAR(36) PRIMARY KEY,
      question_id VARCHAR(36) NOT NULL,
      author_uid VARCHAR(255) NOT NULL,
      author_name VARCHAR(255),
      content TEXT,
      upvotes INT DEFAULT 0,
      is_correct BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(question_id) REFERENCES questions(id),
      FOREIGN KEY(author_uid) REFERENCES users(uid),
      INDEX idx_question (question_id),
      INDEX idx_author (author_uid)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Certificates table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS certificates (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(255),
      user_uid VARCHAR(255) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      instructor_uid VARCHAR(255) NOT NULL,
      status ENUM('pending', 'confirmed', 'rejected') DEFAULT 'pending',
      transaction_id VARCHAR(255) UNIQUE,
      verification_code VARCHAR(255) UNIQUE,
      certificate_url TEXT,
      approved_at TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      FOREIGN KEY(instructor_uid) REFERENCES users(uid),
      INDEX idx_user (user_uid),
      INDEX idx_course (course_id),
      INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Feedback table
  await db.exec(`
    CREATE TABLE IF NOT EXISTS feedback (
      id VARCHAR(36) PRIMARY KEY,
      user_uid VARCHAR(255) NOT NULL,
      course_id VARCHAR(36) NOT NULL,
      rating INT CHECK(rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_uid) REFERENCES users(uid),
      FOREIGN KEY(course_id) REFERENCES courses(id),
      INDEX idx_user (user_uid),
      INDEX idx_course (course_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Sync Queue (para controle offline)
  await db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id VARCHAR(36) PRIMARY KEY,
      operation VARCHAR(50) NOT NULL,
      table_name VARCHAR(100) NOT NULL,
      record_id VARCHAR(255),
      data LONGTEXT,
      status ENUM('pending', 'synced', 'failed') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      synced_at TIMESTAMP NULL,
      INDEX idx_status (status),
      INDEX idx_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  console.log('✅ Database migrations completed successfully');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrate().catch(console.error);
}
