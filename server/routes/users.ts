import { Request, Response, Router } from "express";
import { db } from "../db/connection.js";

const router = Router();

// GET /users - Get all users (for admin panel)
router.get("/", async (req: Request, res: Response) => {
  try {
    const users = await db.all(
      "SELECT id, uid, email, name as full_name, role, status, created_at, updated_at FROM users ORDER BY name ASC",
    );

    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:uid - Get user with profile
router.get("/:uid", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const user = await db.get("SELECT * FROM users WHERE uid = ?", [uid]);
    if (!user) return res.status(404).json({ error: "User not found" });

    const profile = await db.get("SELECT * FROM profiles WHERE user_id = ?", [
      uid,
    ]);

    res.json({ ...user, profile });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /users/:uid/profile - Get user profile
router.get("/:uid/profile", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;

    // Try to get from profiles table first
    let profile = await db.get("SELECT * FROM profiles WHERE user_id = ?", [
      uid,
    ]);

    // If no profile exists, get user data and return as profile
    if (!profile) {
      const user = await db.get("SELECT * FROM users WHERE uid = ?", [uid]);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({
        id: user.id,
        uid: user.uid,
        email: user.email,
        full_name: user.name,
        avatar_url: user.avatar_url,
        role: user.role || "student",
        status: "Ativo",
        bio: user.bio,
        createdAt: user.created_at,
        lastLogin: user.updated_at,
      });
    }

    // Get user data to merge
    const user = await db.get("SELECT * FROM users WHERE uid = ?", [uid]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json({
      id: user.id,
      uid: user.uid,
      email: user.email,
      full_name: user.name,
      avatar_url: profile.avatar_url || user.avatar_url,
      role: user.role || "student",
      status: "Ativo",
      bio: profile.bio || user.bio,
      createdAt: user.created_at,
      lastLogin: user.updated_at,
      ...profile,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:uid/profile - Update user profile
router.put("/:uid/profile", async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    const { full_name, avatar_url, bio, status } = req.body;

    // Update user table
    if (full_name) {
      await db.run(
        "UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE uid = ?",
        [full_name, uid],
      );
    }

    // Update profile table
    const profile = await db.get("SELECT id FROM profiles WHERE user_id = ?", [
      uid,
    ]);

    if (profile) {
      const updates: string[] = [];
      const values: any[] = [];

      if (avatar_url !== undefined) {
        updates.push("avatar_url = ?");
        values.push(avatar_url);
      }
      if (bio !== undefined) {
        updates.push("bio = ?");
        values.push(bio);
      }
      updates.push("updated_at = CURRENT_TIMESTAMP");

      if (updates.length > 0) {
        values.push(uid);
        await db.run(
          `UPDATE profiles SET ${updates.join(", ")} WHERE user_id = ?`,
          values,
        );
      }
    } else {
      // Create profile if doesn't exist
      const { randomUUID } = await import("crypto");
      await db.run(
        "INSERT INTO profiles (id, user_id, avatar_url, bio) VALUES (?, ?, ?, ?)",
        [randomUUID(), uid, avatar_url, bio],
      );
    }

    res.json({ success: true, message: "Profile updated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /users - Create new user (for admin panel)
router.post("/", async (req: Request, res: Response) => {
  try {
    const { full_name, email, password, role, status } = req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        error: "Missing required fields: full_name, email, password",
      });
    }

    // Check if email already exists
    const existingUser = await db.get("SELECT id FROM users WHERE email = ?", [
      email,
    ]);

    if (existingUser) {
      return res.status(409).json({ error: "Email já existe" });
    }

    const bcrypt = await import("bcrypt");
    const { randomUUID } = await import("crypto");

    const passwordHash = await bcrypt.default.hash(password, 10);
    const uid = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const id = randomUUID();
    const profileId = randomUUID();

    // Insert user
    await db.run(
      `INSERT INTO users (id, uid, email, password_hash, name, role, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
      [
        id,
        uid,
        email,
        passwordHash,
        full_name,
        role || "student",
        status || "Ativo",
      ],
    );

    // Create profile
    await db.run("INSERT INTO profiles (id, user_id) VALUES (?, ?)", [
      profileId,
      uid,
    ]);

    res.status(201).json({
      success: true,
      message: "User created successfully",
      user: { id, uid, email, full_name, role, status },
    });
  } catch (err: any) {
    console.error("Error creating user:", err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /users/:id - Update user (for admin panel)
router.put("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { full_name, role, status } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (full_name !== undefined) {
      updates.push("name = ?");
      values.push(full_name);
    }
    if (role !== undefined) {
      updates.push("role = ?");
      values.push(role);
    }
    if (status !== undefined) {
      updates.push("status = ?");
      values.push(status);
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(id);

    await db.run(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, values);

    res.json({ success: true, message: "User updated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /users/:id - Delete user (for admin panel)
router.delete("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Get user uid first
    const user = await db.get("SELECT uid FROM users WHERE id = ?", [id]);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Delete profile
    await db.run("DELETE FROM profiles WHERE user_id = ?", [user.uid]);

    // Delete user
    await db.run("DELETE FROM users WHERE id = ?", [id]);

    res.json({ success: true, message: "User deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
