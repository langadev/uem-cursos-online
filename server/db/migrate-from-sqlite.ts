import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './connection.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OLD_DB_PATH = path.join(__dirname, '../../data/cemoque.db');

interface Row {
  [key: string]: any;
}

async function getOldDb(): Promise<sqlite3.Database | null> {
  return new Promise((resolve) => {
    const sqlite = new sqlite3.Database(OLD_DB_PATH, (err) => {
      if (err) {
        console.log('ℹ️  No old SQLite database found - starting fresh');
        resolve(null);
      } else {
        console.log('✅ Old SQLite database found:', OLD_DB_PATH);
        resolve(sqlite);
      }
    });
  });
}

function queryOldDb(sqlite: sqlite3.Database, sql: string): Promise<Row[]> {
  return new Promise((resolve, reject) => {
    sqlite.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

export async function migrateFromSqlite() {
  console.log('🚀 Starting migration from SQLite to MySQL...\n');

  // Inicializar MySQL
  await db.initialize();

  // Obter conexão SQLite antiga (se existir)
  const oldDb = await getOldDb();

  if (!oldDb) {
    console.log('✅ Migration skipped - no old database to migrate from');
    return;
  }

  try {
    const tables = [
      'users',
      'profiles',
      'courses',
      'modules',
      'lessons',
      'enrollments',
      'lesson_completions',
      'submissions',
      'questions',
      'answers',
      'certificates',
      'feedback',
      'sync_queue'
    ];

    let totalRecords = 0;

    for (const table of tables) {
      try {
        // Obter dados da tabela antiga
        const rows: Row[] = await queryOldDb(oldDb, `SELECT * FROM ${table}`);

        if (rows.length === 0) {
          console.log(`  ℹ️  ${table}: 0 records`);
          continue;
        }

        // Preparar SQL para inserção
        const columns = Object.keys(rows[0]);
        const placeholders = columns.map(() => '?').join(',');
        const sql = `INSERT INTO ${table} (${columns.join(',')}) VALUES (${placeholders})`;

        // Inserir cada linha
        for (const row of rows) {
          const values = columns.map(col => row[col]);
          try {
            await db.run(sql, values);
          } catch (err: any) {
            // Ignorar duplicatas e constraint violations
            if (!err.message.includes('Duplicate') && !err.message.includes('UNIQUE')) {
              console.warn(`  ⚠️  Error inserting into ${table}:`, err.message);
            }
          }
        }

        console.log(`  ✅ ${table}: ${rows.length} records migrated`);
        totalRecords += rows.length;
      } catch (err: any) {
        // Tabela pode não existir no banco antigo
        if (!err.message.includes('no such table')) {
          console.warn(`  ⚠️  Error migrating ${table}:`, err.message);
        }
      }
    }

    console.log(`\n✅ Migration completed! Total records migrated: ${totalRecords}`);
    console.log('📝 Note: SQLite database at:', OLD_DB_PATH);
    console.log('💡 You can delete it if migration was successful');

  } finally {
    // Fechar conexão SQLite
    oldDb.close();
  }
}

// Executar se chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  migrateFromSqlite()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
