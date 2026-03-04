import dotenv from "dotenv";
import { createPool } from "mysql2/promise";

dotenv.config({ path: ".env.local" });

async function addPasswordColumn() {
  let connection: any = null;

  try {
    const pool = createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "cemoque",
    });

    connection = await pool.getConnection();
    console.log("✅ Conectado ao MySQL");

    // Verificar quais colunas existem
    const [columns] = await connection.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_NAME = 'users' AND TABLE_SCHEMA = ?`,
      [process.env.DB_NAME || "cemoque"],
    );

    const existingColumns = new Set(
      (columns as any[]).map((c) => c.COLUMN_NAME),
    );

    if (!existingColumns.has("password_hash")) {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN password_hash VARCHAR(255) NULL
      `);
      console.log("✅ Coluna password_hash adicionada");
    } else {
      console.log("✓ Coluna password_hash já existe");
    }

    if (!existingColumns.has("status")) {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN status ENUM('Ativo', 'Suspenso') DEFAULT 'Ativo'
      `);
      console.log("✅ Coluna status adicionada");
    } else {
      console.log("✓ Coluna status já existe");
    }

    if (!existingColumns.has("last_login")) {
      await connection.execute(`
        ALTER TABLE users ADD COLUMN last_login TIMESTAMP NULL
      `);
      console.log("✅ Coluna last_login adicionada");
    } else {
      console.log("✓ Coluna last_login já existe");
    }

    connection.release();
    await pool.end();

    console.log("\n✨ Todas as colunas necessárias estão prontas!");
    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro:", error.message);
    if (connection) connection.release();
    process.exit(1);
  }
}

addPasswordColumn();
