import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, questionsTable, subjectsTable } from "@workspace/db";
import {
  ListQuestionsQueryParams,
  CreateQuestionBody,
  GetQuestionParams,
  UpdateQuestionParams,
  UpdateQuestionBody,
  DeleteQuestionParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/questions", async (req, res): Promise<void> => {
  const params = ListQuestionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { subjectId, grade, limit } = params.data;
  const conditions = [];
  if (subjectId != null) conditions.push(eq(questionsTable.subjectId, subjectId));
  if (grade != null) conditions.push(eq(questionsTable.grade, grade));

  const baseQuery = db
    .select({
      id: questionsTable.id,
      subjectId: questionsTable.subjectId,
      subjectName: subjectsTable.name,
      grade: questionsTable.grade,
      text: questionsTable.text,
      optionA: questionsTable.optionA,
      optionB: questionsTable.optionB,
      optionC: questionsTable.optionC,
      optionD: questionsTable.optionD,
      correctOption: questionsTable.correctOption,
      explanation: questionsTable.explanation,
      difficulty: questionsTable.difficulty,
      questionType: questionsTable.questionType,
      createdAt: questionsTable.createdAt,
    })
    .from(questionsTable)
    .leftJoin(subjectsTable, eq(questionsTable.subjectId, subjectsTable.id));

  const rows = conditions.length > 0
    ? await baseQuery.where(and(...conditions)).limit(limit ?? 100)
    : await baseQuery.limit(limit ?? 100);

  res.json(rows.map(r => ({ ...r, subjectName: r.subjectName ?? null, questionType: r.questionType ?? null })));
});

router.get("/questions/types", async (req, res): Promise<void> => {
  const subjectId = req.query.subjectId ? parseInt(String(req.query.subjectId)) : null;
  const grade = req.query.grade ? String(req.query.grade) : null;

  if (!subjectId || !grade) {
    res.status(400).json({ error: "subjectId and grade are required" });
    return;
  }

  const rows = await db
    .select({
      questionType: questionsTable.questionType,
      count: sql<number>`count(*)::int`,
    })
    .from(questionsTable)
    .where(and(eq(questionsTable.subjectId, subjectId), eq(questionsTable.grade, grade)))
    .groupBy(questionsTable.questionType);

  const types = rows.map(r => ({
    questionType: r.questionType ?? "General",
    rawType: r.questionType,
    count: Number(r.count),
  }));

  res.json(types);
});

router.post("/questions", async (req, res): Promise<void> => {
  const parsed = CreateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bodyRaw = req.body as { questionType?: string; timerMinutes?: number | null };

  const [question] = await db.insert(questionsTable).values({
    subjectId: parsed.data.subjectId,
    grade: parsed.data.grade,
    text: parsed.data.text,
    optionA: parsed.data.optionA,
    optionB: parsed.data.optionB,
    optionC: parsed.data.optionC,
    optionD: parsed.data.optionD,
    correctOption: parsed.data.correctOption,
    explanation: parsed.data.explanation,
    difficulty: parsed.data.difficulty ?? "medium",
    questionType: bodyRaw.questionType ?? null,
    timerMinutes: bodyRaw.timerMinutes ? Number(bodyRaw.timerMinutes) : null,
  }).returning();

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, question.subjectId));

  res.status(201).json({
    ...question,
    subjectName: subject?.name ?? null,
    questionType: question.questionType ?? null,
  });
});

router.get("/questions/:id", async (req, res): Promise<void> => {
  const params = GetQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [row] = await db
    .select({
      id: questionsTable.id,
      subjectId: questionsTable.subjectId,
      subjectName: subjectsTable.name,
      grade: questionsTable.grade,
      text: questionsTable.text,
      optionA: questionsTable.optionA,
      optionB: questionsTable.optionB,
      optionC: questionsTable.optionC,
      optionD: questionsTable.optionD,
      correctOption: questionsTable.correctOption,
      explanation: questionsTable.explanation,
      difficulty: questionsTable.difficulty,
      questionType: questionsTable.questionType,
      createdAt: questionsTable.createdAt,
    })
    .from(questionsTable)
    .leftJoin(subjectsTable, eq(questionsTable.subjectId, subjectsTable.id))
    .where(eq(questionsTable.id, params.data.id));

  if (!row) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.json({ ...row, subjectName: row.subjectName ?? null, questionType: row.questionType ?? null });
});

router.patch("/questions/:id", async (req, res): Promise<void> => {
  const params = UpdateQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateQuestionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const bodyRaw = req.body as { questionType?: string | null };

  const updates: Record<string, unknown> = {};
  if (parsed.data.text != null) updates.text = parsed.data.text;
  if (parsed.data.optionA != null) updates.optionA = parsed.data.optionA;
  if (parsed.data.optionB != null) updates.optionB = parsed.data.optionB;
  if (parsed.data.optionC != null) updates.optionC = parsed.data.optionC;
  if (parsed.data.optionD != null) updates.optionD = parsed.data.optionD;
  if (parsed.data.correctOption != null) updates.correctOption = parsed.data.correctOption;
  if (parsed.data.explanation != null) updates.explanation = parsed.data.explanation;
  if (parsed.data.difficulty != null) updates.difficulty = parsed.data.difficulty;
  if ("questionType" in bodyRaw) updates.questionType = bodyRaw.questionType ?? null;

  const [question] = await db.update(questionsTable).set(updates as Parameters<typeof db.update>[0]).where(eq(questionsTable.id, params.data.id)).returning();
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  const [subject] = await db.select().from(subjectsTable).where(eq(subjectsTable.id, question.subjectId));
  res.json({ ...question, subjectName: subject?.name ?? null, questionType: question.questionType ?? null });
});

router.delete("/questions/:id", async (req, res): Promise<void> => {
  const params = DeleteQuestionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [question] = await db.delete(questionsTable).where(eq(questionsTable.id, params.data.id)).returning();
  if (!question) {
    res.status(404).json({ error: "Question not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
