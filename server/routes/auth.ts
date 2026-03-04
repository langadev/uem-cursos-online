import bcrypt from "bcrypt";
import { randomUUID } from "crypto";
import { Request, Response, Router } from "express";
import jwt from "jsonwebtoken";
import { db } from "../db/connection.js";

const router = Router();

const JWT_SECRET =
  process.env.JWT_SECRET || "cemoqe-secret-key-change-in-production-2026";
const JWT_EXPIRES_IN = "7d";

interface JWTPayload {
  uid: string;
  email: string;
  role: string;
}

// Middleware de autenticação JWT
export const authMiddleware = (req: Request, res: Response, next: Function) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Token não fornecido" });
  }

  try {
    const user = jwt.verify(token, JWT_SECRET) as JWTPayload;
    (req as any).user = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Token inválido ou expirado" });
  }
};

// GET /api/auth/me - Get current user
router.get("/me", authMiddleware, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ error: "Não autenticado" });

    const dbUser = await db.get(
      "SELECT id, uid, email, name, role, avatar_url, status, created_at, last_login FROM users WHERE uid = ?",
      [user.uid],
    );
    if (!dbUser)
      return res.status(404).json({ error: "Usuário não encontrado" });

    res.json(dbUser);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register - Registrar novo usuário com senha
router.post("/register", async (req: Request, res: Response) => {
  try {
    const { email, password, name, role = "student" } = req.body;

    // Validação
    if (!email || !password || !name) {
      return res
        .status(400)
        .json({ error: "Email, senha e nome são obrigatórios" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ error: "Senha deve ter pelo menos 6 caracteres" });
    }

    // Verificar se email já existe
    const existing = await db.get("SELECT id FROM users WHERE email = ?", [
      email,
    ]);
    if (existing) {
      return res.status(409).json({ error: "Email já cadastrado" });
    }

    // Hash de senha
    const passwordHash = await bcrypt.hash(password, 10);
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const id = randomUUID();

    // Inserir novo usuário
    await db.run(
      `INSERT INTO users (id, uid, email, password_hash, name, role, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Ativo', NOW())`,
      [id, uid, email, passwordHash, name, role],
    );

    // Criar perfil
    await db.run("INSERT INTO profiles (id, user_id) VALUES (?, ?)", [
      randomUUID(),
      uid,
    ]);

    // Gerar JWT
    const token = jwt.sign({ uid, email, role } as JWTPayload, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });

    return res.status(201).json({
      message: "Usuário registrado com sucesso",
      token,
      user: { uid, email, name, role },
    });
  } catch (error: any) {
    console.error("Erro ao registrar:", error);
    return res.status(500).json({ error: "Erro ao registrar usuário" });
  }
});

// POST /api/auth/login - Fazer login com email e senha
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email e senha são obrigatórios" });
    }

    // Buscar usuário
    const user = await db.get("SELECT * FROM users WHERE email = ?", [email]);
    if (!user) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // Verificar senha
    if (!user.password_hash) {
      return res
        .status(401)
        .json({ error: "Usuário não tem senha configurada" });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(401).json({ error: "Email ou senha incorretos" });
    }

    // Atualizar lastLogin
    await db.run("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    // Gerar JWT
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return res.json({
      message: "Login realizado com sucesso",
      token,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error("Erro ao fazer login:", error);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
});

// POST /api/auth/login-google - Login com Google (cria usuário MySQL se não existir)
router.post("/login-google", async (req: Request, res: Response) => {
  try {
    const { uid, email, name, photoURL } = req.body;

    if (!uid || !email) {
      return res.status(400).json({ error: "UID e email são obrigatórios" });
    }

    // Verificar se usuário existe
    let user = await db.get("SELECT * FROM users WHERE uid = ?", [uid]);

    if (!user) {
      // Criar novo usuário
      const id = randomUUID();
      await db.run(
        `INSERT INTO users (id, uid, email, name, avatar_url, role, status, created_at)
         VALUES (?, ?, ?, ?, ?, 'student', 'Ativo', NOW())`,
        [id, uid, email, name, photoURL],
      );

      // Criar perfil
      await db.run("INSERT INTO profiles (id, user_id) VALUES (?, ?)", [
        randomUUID(),
        uid,
      ]);

      user = await db.get("SELECT * FROM users WHERE uid = ?", [uid]);
    }

    // Atualizar lastLogin
    await db.run("UPDATE users SET last_login = NOW() WHERE id = ?", [
      user.id,
    ]);

    // Gerar JWT
    const token = jwt.sign(
      { uid: user.uid, email: user.email, role: user.role } as JWTPayload,
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN },
    );

    return res.json({
      message: "Login realizado com sucesso",
      token,
      user: {
        uid: user.uid,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar_url: user.avatar_url,
      },
    });
  } catch (error: any) {
    console.error("Erro ao fazer login com Google:", error);
    return res.status(500).json({ error: "Erro ao fazer login" });
  }
});

export default router;
