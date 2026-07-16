import { Router } from "express";
import type { LoginRequest, LoginResponse } from "@riptacrm/shared-types";
import { prisma } from "../db";
import { verifyPassword } from "../lib/passwords";
import { signAuthToken } from "../lib/jwt";

export const authRouter = Router();

// A valid bcrypt hash of a value nobody will ever type as a password. Comparing against
// this when the username isn't found means an unknown-username request takes roughly the
// same time as a wrong-password request, so response timing doesn't reveal which usernames
// exist in the database.
const DUMMY_HASH = "$2a$10$CwTycUXWue0Thq9StjUM0uJ8y6ONf7A1YWyCZBOF/lHmqp6ecC9wS";

authRouter.post("/auth/login", async (req, res) => {
  const body = req.body as Partial<LoginRequest>;

  if (!body.username?.trim() || !body.password) {
    return res.status(400).json({ error: "username and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { username: body.username.trim() } });
  const valid = await verifyPassword(body.password, user?.passwordHash ?? DUMMY_HASH);

  if (!user || !valid) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  const role = user.role as LoginResponse["user"]["role"];
  const token = signAuthToken({ sub: user.id, name: user.name, email: user.email, role });

  const response: LoginResponse = {
    token,
    user: { id: user.id, name: user.name, email: user.email, role },
  };
  res.json(response);
});
