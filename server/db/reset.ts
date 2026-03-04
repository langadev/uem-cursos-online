import { db } from './connection.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { rmSync } from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function reset() {
  console.log('🔄 Resetting database...');

  try {
    // Close database
    await db.close();

    // Remove database file
    const dbPath = path.join(__dirname, '../../data/cemoque.db');
    rmSync(dbPath, { force: true });

    console.log('✅ Database reset complete');
    console.log('Run: npm run db:migrate && npm run db:seed');
  } catch (err) {
    console.error('Error resetting database:', err);
    throw err;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  reset().catch(console.error);
}
