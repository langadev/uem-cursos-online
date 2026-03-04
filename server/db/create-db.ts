import dotenv from "dotenv";
import mysql from "mysql2/promise";

dotenv.config({ path: ".env.local" });

async function createDatabase() {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST || "localhost",
        port: parseInt(process.env.DB_PORT || "3306"),
        user: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
      });

      const dbName = process.env.DB_NAME || "cemoque";

      console.log(`🔄 Creating database: ${dbName}...`);

      // Tentar com backticks para caracteres especiais
      try {
        await connection.execute(`DROP DATABASE IF EXISTS \`${dbName}\``);
      } catch (err) {
        // Database pode não existir
      }

      await connection.execute(
        `CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
      );

      console.log(`✅ Database ${dbName} created successfully!`);
      console.log(`📊 You can now run: npm run dev:backend`);

      await connection.end();
      return;
    } catch (err: any) {
      retries++;

      if (err.code === "ECONNREFUSED") {
        console.log(
          `⏳ Attempt ${retries}/${maxRetries}: MySQL is not running yet...`,
        );
        console.log(
          "💡 Make sure Laragon is running and MySQL service is started",
        );

        if (retries < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          continue;
        }
      }

      console.error("❌ Error creating database:", err.message);
      console.error("💡 Troubleshooting:");
      console.error('   1. Start Laragon (click "Start All")');
      console.error("   2. Verify MySQL is running (check Laragon GUI)");
      console.error("   3. Check .env.local for correct DB credentials");
      process.exit(1);
    }
  }
}

createDatabase();
