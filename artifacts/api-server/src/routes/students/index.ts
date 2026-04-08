import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
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

  const { name, email, password, grade, telebirrReceipt } = parsed.data;

  const existing = await db.select().from(studentsTable).where(eq(studentsTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already in use" });
    return;
  }

  const passwordHash = hashPassword(password);

  const tier = grade === "6" ? "grade6" :
    grade === "7" ? "grade7" :
    grade === "8" ? "grade8" :
    grade === "9" ? "grade9" :
    grade === "10" ? "grade10" :
    grade === "11" ? "grade11" :
    grade === "12" ? "grade12" : "none";

  const price = (grade === "6" || grade === "7") ? 450 : grade === "8" ? 500 : grade === "12" ? 800 : 650;

  const [student] = await db.insert(studentsTable).values({
    name,
    email,
    passwordHash,
    grade,
    status: "pending",
    subscriptionTier: tier,
    subscriptionPrice: price,
    telebirrReceipt: telebirrReceipt ?? null,
  }).returning();

  const { passwordHash: _, ...safe } = student;
  res.status(201).json({
    ...safe,
    subscriptionPrice: safe.subscriptionPrice ?? null,
    telebirrReceipt: safe.telebirrReceipt ?? null,
  });
});

router.post("/students/login", async (req, res): Promise<void> => {
  const parsed = LoginStudentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [student] = await db.select().from(studentsTable).where(eq(studentsTable.email, email));
  if (!student || !verifyPassword(password, student.passwordHash)) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = generateToken(student.id, "student");
  const { passwordHash: _, ...safe } = student;
  res.json(LoginStudentResponse.parse({
    token,
    user: { ...safe, subscriptionPrice: safe.subscriptionPrice ?? null, telebirrReceipt: safe.telebirrReceipt ?? null },
    role: "student",
  }));
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
