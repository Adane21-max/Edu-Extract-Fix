import { Router, type IRouter } from "express";
import { eq, sql } from "drizzle-orm";
import { db, studentsTable } from "@workspace/db";
import {
  RegisterStudentBody,
  LoginStudentBody,
  GetMyProfileQueryParams,
  GetStudentParams,
  UpdateStudentParams,
  UpdateStudentBody,
  ListStudentsResponse,
  GetStudentResponse,
  UpdateStudentResponse,
  LoginStudentResponse,
} from "@workspace/api-zod";
import { hashPassword, verifyPassword, generateToken } from "../../lib/auth";

const router: IRouter = Router();

router.post("/students/register", async (req, res): Promise<void> => {
  const parsed = RegisterStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password, grade } = parsed.data;

  if (password.length < 4) {
    res.status(400).json({ error: "Password must be at least 4 characters" });
    return;
  }

  const existingRows = await db.execute(
    sql`SELECT id FROM students WHERE username = ${username} OR email = ${username + "@ada21.local"} LIMIT 1`
  );
  if ((existingRows.rows as unknown[]).length > 0) {
    res.status(409).json({ error: "Username already taken. Please choose another." });
    return;
  }

  const passwordHash = hashPassword(password);
  const tier = grade === "6" ? "grade6" : grade === "7" ? "grade7" : grade === "8" ? "grade8" :
    grade === "9" ? "grade9" : grade === "10" ? "grade10" : grade === "11" ? "grade11" :
    grade === "12" ? "grade12" : "none";
  const price = 1000;

  const [student] = await db.insert(studentsTable).values({
    name: username,
    email: username + "@ada21.local",
    passwordHash,
    grade,
    status: "pending",
    subscriptionTier: tier,
    subscriptionPrice: price,
    telebirrReceipt: null,
  }).returning();

  await db.execute(sql`UPDATE students SET username = ${username} WHERE id = ${student.id}`);

  const { passwordHash: _, ...safe } = student;
  res.status(201).json({ ...safe, subscriptionPrice: safe.subscriptionPrice ?? null, telebirrReceipt: safe.telebirrReceipt ?? null });
});

router.post("/students/login", async (req, res): Promise<void> => {
  const parsed = LoginStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { username, password } = parsed.data;

  const rows = await db.execute(
    sql`SELECT * FROM students WHERE username = ${username} OR email = ${username} LIMIT 1`
  );
  const studentRow = (rows.rows as Record<string, unknown>[])[0];

  if (!studentRow || !verifyPassword(password as string, studentRow.password_hash as string)) {
    res.status(401).json({ error: "Invalid username or password" });
    return;
  }

  const student = await db.select().from(studentsTable).where(eq(studentsTable.id, studentRow.id as number));
  const s = student[0];
  if (!s) { res.status(404).json({ error: "Not found" }); return; }

  const token = generateToken(s.id, "student");
  const { passwordHash: _, ...safe } = s;
  res.json(LoginStudentResponse.parse({
    token,
    user: { ...safe, subscriptionPrice: safe.subscriptionPrice ?? null, telebirrReceipt: safe.telebirrReceipt ?? null },
    role: "student",
  }));
});

router.post("/students/:id/receipt", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  const { receipt } = req.body as { receipt?: string };
  if (!receipt?.trim()) { res.status(400).json({ error: "Receipt number is required" }); return; }
  await db.execute(sql`UPDATE students SET telebirr_receipt = ${receipt.trim()} WHERE id = ${id}`);
  res.json({ ok: true });
});

router.get("/students/me", async (req, res): Promise<void> => {
  const params = GetMyProfileQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.studentId));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const { passwordHash: _, ...safe } = student;
  res.json(GetStudentResponse.parse({ ...safe, subscriptionPrice: safe.subscriptionPrice ?? null, telebirrReceipt: safe.telebirrReceipt ?? null }));
});

router.get("/students", async (_req, res): Promise<void> => {
  const students = await db.select().from(studentsTable).orderBy(studentsTable.createdAt);
  const safe = students.map(({ passwordHash: _, ...s }) => ({
    ...s,
    subscriptionPrice: s.subscriptionPrice ?? null,
    telebirrReceipt: s.telebirrReceipt ?? null,
  }));
  res.json(ListStudentsResponse.parse(safe));
});

router.get("/students/:id", async (req, res): Promise<void> => {
  const params = GetStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.id, params.data.id));
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const { passwordHash: _, ...safe } = student;
  res.json(GetStudentResponse.parse({ ...safe, subscriptionPrice: safe.subscriptionPrice ?? null, telebirrReceipt: safe.telebirrReceipt ?? null }));
});

router.patch("/students/:id", async (req, res): Promise<void> => {
  const params = UpdateStudentParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updates: Record<string, unknown> = {};
  if (parsed.data.status != null) updates.status = parsed.data.status;
  if (parsed.data.subscriptionTier != null) updates.subscriptionTier = parsed.data.subscriptionTier;
  if (parsed.data.subscriptionPrice !== undefined) updates.subscriptionPrice = parsed.data.subscriptionPrice;
  if (parsed.data.grade != null) updates.grade = parsed.data.grade;
  if (parsed.data.telebirrReceipt !== undefined) updates.telebirrReceipt = parsed.data.telebirrReceipt;

  const [student] = await db.update(studentsTable).set(updates as Parameters<typeof db.update>[0]).where(eq(studentsTable.id, params.data.id)).returning();
  if (!student) {
    res.status(404).json({ error: "Student not found" });
    return;
  }

  const { passwordHash: _, ...safe } = student;
  res.json(UpdateStudentResponse.parse({ ...safe, subscriptionPrice: safe.subscriptionPrice ?? null, telebirrReceipt: safe.telebirrReceipt ?? null }));
});

export default router;
