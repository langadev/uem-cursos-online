import mysql from 'mysql2/promise';

export class Database {
  private connection: mysql.Connection | null = null;
  private pool: mysql.Pool | null = null;

  async initialize() {
    try {
      // Criar pool de conexões para melhor performance
      this.pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306'),
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'cemoque',
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });

      // Testar conexão
      const conn = await this.pool.getConnection();
      await conn.ping();
      conn.release();

      console.log('✅ MySQL database connected successfully');
      console.log(`📊 Database: ${process.env.DB_NAME} @ ${process.env.DB_HOST}:${process.env.DB_PORT}`);
    } catch (err) {
      console.error('❌ Database connection error:', err);
      throw err;
    }
  }

  async run(sql: string, params: any[] = []): Promise<{ lastID?: number; changes: number }> {
    if (!this.pool) throw new Error('Database not initialized');
    const [result] = await this.pool.execute(sql, params) as any;
    return {
      changes: result.affectedRows || 0,
      lastID: result.insertId || undefined,
    };
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    if (!this.pool) throw new Error('Database not initialized');
    const [rows] = await this.pool.execute(sql, params) as any;
    return rows?.[0] || null;
  }

  async all(sql: string, params: any[] = []): Promise<any[]> {
    if (!this.pool) throw new Error('Database not initialized');
    const [rows] = await this.pool.execute(sql, params) as any;
    return rows || [];
  }

  async exec(sql: string): Promise<void> {
    if (!this.pool) throw new Error('Database not initialized');

    // Dividir múltiplos statements
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);

    for (const statement of statements) {
      const conn = await this.pool.getConnection();
      try {
        await conn.query(statement);
      } finally {
        conn.release();
      }
    }
  }

  async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      console.log('✅ Database pool closed');
    }
  }
}

export const db = new Database();
