/**
 * Script para criar um utilizador Admin no MySQL
 * Execute: npx tsx scripts/seedAdminMySQL.ts
 */

import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { createPool, PoolConnection } from "mysql2/promise";

const adminData = {
  email: "admin@eduprimes.mz",
  password: "AdminEduPrime@2024",
  full_name: "Administrador Principal",
  name: "Administrador",
};

async function seedAdmin() {
  let connection: PoolConnection | null = null;

  try {
    const pool = createPool({
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "3306"),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "cemoque",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    connection = await pool.getConnection();
    console.log("✅ Conectado ao MySQL");

    // Verificar se email já existe
    const [rows] = await connection.query(
      "SELECT id FROM users WHERE email = ?",
      [adminData.email],
    );

    if ((rows as any[]).length > 0) {
      console.log("⚠️  Email já existe no banco de dados");
      connection.release();
      process.exit(0);
    }

    // Hash da senha
    const passwordHash = await bcrypt.hash(adminData.password, 10);
    const uid = `admin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const id = randomUUID();
    const profileId = randomUUID();

    console.log("🔄 Criando utilizador admin...");

    // Inserir no MySQL
    await connection.execute(
      `INSERT INTO users (id, uid, email, password_hash, name, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, 'admin', 'Ativo', NOW())`,
      [id, uid, adminData.email, passwordHash, adminData.name],
    );

    console.log("✅ Utilizador criado no MySQL");

    // Criar perfil
    await connection.execute(
      `INSERT INTO profiles (id, user_id) VALUES (?, ?)`,
      [profileId, uid],
    );

    console.log("✅ Perfil de admin criado");

    connection.release();
    await pool.end();

    console.log("\n" + "=".repeat(60));
    console.log("🎉 ADMIN CRIADO COM SUCESSO!");
    console.log("=".repeat(60));
    console.log("\n📧 Email: " + adminData.email);
    console.log("🔐 Senha: " + adminData.password);
    console.log("🆔 UID: " + uid);
    console.log(
      "\n✨ Você pode agora fazer login em http://localhost:5173/login",
    );
    console.log("=".repeat(60) + "\n");

    process.exit(0);
  } catch (error: any) {
    console.error("❌ Erro ao criar admin:", error.message);
    if (connection) {
      connection.release();
    }
    process.exit(1);
  }
}

seedAdmin();
