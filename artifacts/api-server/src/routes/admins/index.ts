import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, adminsTable } from "@workspace/db";
import { LoginAdminBody, LoginAdminResponse } from "@workspace/api-zod";
import { verifyPassword, generateToken } from "../../lib/auth";

const router: IRouter = Router();

router.post("/admins/login", async (req, res): Promise<void> => {
  const parsed = LoginAdminBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const [admin] = await db.select().from(adminsTable).where(eq(adminsTable.name, username));
  if (!admin || !verifyPassword(password, admin.passwordHash)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const token = generateToken(admin.id, "admin");
  res.json(LoginAdminResponse.parse({ token, role: "admin" }));
});

export default router;
