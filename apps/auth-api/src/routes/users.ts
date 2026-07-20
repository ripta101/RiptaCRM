import { Router } from "express";
import { prisma } from "../db";

export const usersRouter = Router();

usersRouter.get("/users", async (_req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });
  res.json({
    results: users.map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
    })),
  });
});
