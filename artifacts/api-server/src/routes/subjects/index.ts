import { Router, type IRouter } from "express";
import { eq, count } from "drizzle-orm";
import { db, subjectsTable, questionsTable } from "@workspace/db";
import { CreateSubjectBody, DeleteSubjectParams, ListSubjectsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/subjects", async (_req, res): Promise<void> => {
  const subjects = await db.select().from(subjectsTable).orderBy(subjectsTable.name);

  const result = await Promise.all(
    subjects.map(async (s) => {
      const [countResult] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.subjectId, s.id));
      return {
        ...s,
        description: s.description ?? null,
        questionCount: Number(countResult?.count ?? 0),
      };
    })
  );

  res.json(ListSubjectsResponse.parse(result));
});

router.post("/subjects", async (req, res): Promise<void> => {
  const parsed = CreateSubjectBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [subject] = await db.insert(subjectsTable).values({
    name: parsed.data.name,
    grade: parsed.data.grade,
    description: parsed.data.description ?? null,
    timerMinutes: (parsed.data as { timerMinutes?: number }).timerMinutes ?? null,
  }).returning();

  res.status(201).json({ ...subject, description: subject.description ?? null, timerMinutes: subject.timerMinutes ?? null, questionCount: 0 });
});

router.patch("/subjects/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid subject id" });
    return;
  }

  const body = req.body as {
    name?: unknown;
    grade?: unknown;
    description?: unknown;
    timerMinutes?: unknown;
  };

  const updates: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim();
  if (typeof body.grade === "string" && body.grade) updates.grade = body.grade;
  if ("description" in body) updates.description = typeof body.description === "string" ? body.description || null : null;
  if ("timerMinutes" in body) {
    if (body.timerMinutes === null || body.timerMinutes === undefined) {
      updates.timerMinutes = null;
    } else if (typeof body.timerMinutes === "number" && body.timerMinutes >= 1) {
      updates.timerMinutes = body.timerMinutes;
    }
  }

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No valid fields to update" });
    return;
  }

  const [subject] = await db.update(subjectsTable)
    .set(updates as Parameters<ReturnType<typeof db.update>["set"]>[0])
    .where(eq(subjectsTable.id, id))
    .returning();

  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  const [countResult] = await db.select({ count: count() }).from(questionsTable).where(eq(questionsTable.subjectId, id));

  res.json({ ...subject, description: subject.description ?? null, timerMinutes: subject.timerMinutes ?? null, questionCount: Number(countResult?.count ?? 0) });
});

router.delete("/subjects/:id", async (req, res): Promise<void> => {
  const params = DeleteSubjectParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [subject] = await db.delete(subjectsTable).where(eq(subjectsTable.id, params.data.id)).returning();
  if (!subject) {
    res.status(404).json({ error: "Subject not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
