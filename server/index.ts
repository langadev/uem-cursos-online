import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { db } from './db/connection.js';
import { migrate } from './db/migrate.js';

// Routes
import authRoutes from './routes/auth.js';
import coursesRoutes from './routes/courses.js';
import enrollmentsRoutes from './routes/enrollments.js';
import lessonsRoutes from './routes/lessons.js';
import certificatesRoutes from './routes/certificates.js';
import submissionsRoutes from './routes/submissions.js';
import questionsRoutes from './routes/questions.js';
import usersRoutes from './routes/users.js';

dotenv.config({ path: '.env.local' });

const app = express();
const PORT = process.env.API_PORT || 5000;

// Middleware
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/courses', coursesRoutes);
app.use('/api/enrollments', enrollmentsRoutes);
app.use('/api/lessons', lessonsRoutes);
app.use('/api/certificates', certificatesRoutes);
app.use('/api/submissions', submissionsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/users', usersRoutes);

// Error handling
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    // Run migrations
    await migrate();

    // Start listening
    app.listen(PORT, () => {
      console.log(`\n🚀 Backend server running at http://localhost:${PORT}`);
      console.log(`📱 Frontend should connect to http://localhost:${PORT}/api/*`);
      console.log(`✨ Offline mode: ${process.env.ENABLE_OFFLINE_MODE === 'true' ? 'enabled' : 'disabled'}\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await db.close();
  process.exit(0);
});

start();
