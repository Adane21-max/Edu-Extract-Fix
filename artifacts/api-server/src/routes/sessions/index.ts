import { Router, type IRouter } from "express";
import { eq, and, inArray } from "drizzle-orm";
import { db, quizSessionsTable, sessionAnswersTable, questionsTable, subjectsTable } from "@workspace/db";
import {
  ListSessionsQueryParams,
  GetSessionParams,
  SubmitSessionParams,
  SubmitSessionBody,
  ListSessionsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function buildSessionDetail(sessionId: number, revealAnswers: boolean) {
  const [session] = await db
    .select({
      id: quizSessionsTable.id,
      studentId: quizSessionsTable.studentId,
      subjectId: quizSessionsTable.subjectId,
      subjectName: subjectsTable.name,
      subjectTimerMinutes: subjectsTable.timerMinutes,
      grade: quizSessionsTable.grade,
      questionType: quizSessionsTable.questionType,
      status: quizSessionsTable.status,
      score: quizSessionsTable.score,
      totalQuestions: quizSessionsTable.totalQuestions,
      correctAnswers: quizSessionsTable.correctAnswers,
      timeTaken: quizSessionsTable.timeTaken,
      createdAt: quizSessionsTable.createdAt,
      completedAt: quizSessionsTable.completedAt,
    })
    .from(quizSessionsTable)
    .leftJoin(subjectsTable, eq(quizSessionsTable.subjectId, subjectsTable.id))
    .where(eq(quizSessionsTable.id, sessionId));

  if (!session) return null;

  const answers = await db
    .select({
      id: sessionAnswersTable.id,
      questionId: sessionAnswersTable.questionId,
      questionText: questionsTable.text,
      optionA: questionsTable.optionA,
      optionB: questionsTable.optionB,
      optionC: questionsTable.optionC,
      optionD: questionsTable.optionD,
      correctOption: questionsTable.correctOption,
      explanation: questionsTable.explanation,
      selectedOption: sessionAnswersTable.selectedOption,
      isCorrect: sessionAnswersTable.isCorrect,
      orderIndex: sessionAnswersTable.orderIndex,
    })
    .from(sessionAnswersTable)
    .leftJoin(questionsTable, eq(sessionAnswersTable.questionId, questionsTable.id))
    .where(eq(sessionAnswersTable.sessionId, sessionId))
    .orderBy(sessionAnswersTable.orderIndex);

  const questions = answers.map((a) => ({
    id: a.id,
    questionId: a.questionId,
    questionText: a.questionText ?? "",
    optionA: a.optionA ?? "",
    optionB: a.optionB ?? "",
    optionC: a.optionC ?? "",
    optionD: a.optionD ?? "",
    correctOption: revealAnswers ? (a.correctOption ?? null) : null,
    explanation: revealAnswers ? (a.explanation ?? null) : null,
    selectedOption: a.selectedOption ?? null,
    isCorrect: a.isCorrect ?? null,
    orderIndex: a.orderIndex,
  }));

  return {
    session: {
      ...session,
      subjectName: session.subjectName ?? null,
      subjectTimerMinutes: session.subjectTimerMinutes ?? null,
      questionType: session.questionType ?? null,
      score: session.score ?? null,
      correctAnswers: session.correctAnswers ?? null,
      timeTaken: session.timeTaken ?? null,
      completedAt: session.completedAt ? session.completedAt.toISOString() : null,
    },
    questions,
  };
}

router.get("/sessions", async (req, res): Promise<void> => {
  const params = ListSessionsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sessions = await db
    .select({
      id: quizSessionsTable.id,
      studentId: quizSessionsTable.studentId,
      subjectId: quizSessionsTable.subjectId,
      subjectName: subjectsTable.name,
      grade: quizSessionsTable.grade,
      questionType: quizSessionsTable.questionType,
      status: quizSessionsTable.status,
      score: quizSessionsTable.score,
      totalQuestions: quizSessionsTable.totalQuestions,
      correctAnswers: quizSessionsTable.correctAnswers,
      timeTaken: quizSessionsTable.timeTaken,
      createdAt: quizSessionsTable.createdAt,
      completedAt: quizSessionsTable.completedAt,
    })
    .from(quizSessionsTable)
    .leftJoin(subjectsTable, eq(quizSessionsTable.subjectId, subjectsTable.id))
    .where(eq(quizSessionsTable.studentId, params.data.studentId))
    .orderBy(quizSessionsTable.createdAt);

  const result = sessions.map((s) => ({
    ...s,
    subjectName: s.subjectName ?? null,
    questionType: s.questionType ?? null,
    score: s.score ?? null,
    correctAnswers: s.correctAnswers ?? null,
    timeTaken: s.timeTaken ?? null,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
  }));

  res.json(ListSessionsResponse.parse(result));
});

router.post("/sessions", async (req, res): Promise<void> => {
  const body = req.body as {
    studentId?: number;
    subjectId?: number;
    grade?: string;
    questionType?: string | null;
  };

  const { studentId, subjectId, grade, questionType } = body;

  if (!studentId || !subjectId || !grade) {
    res.status(400).json({ error: "studentId, subjectId, and grade are required" });
    return;
  }

  const rawType = questionType ?? null;

  // Check if this student already has a completed session for this subject+questionType
  const existingSessions = await db
    .select({ id: quizSessionsTable.id, status: quizSessionsTable.status })
    .from(quizSessionsTable)
    .where(
      and(
        eq(quizSessionsTable.studentId, studentId),
        eq(quizSessionsTable.subjectId, subjectId),
        rawType != null
          ? eq(quizSessionsTable.questionType, rawType)
          : eq(quizSessionsTable.grade, grade)
      )
    );

  const completedSession = existingSessions.find(s => s.status === "completed");
  if (completedSession) {
    res.status(409).json({
      error: "You have already completed this question set. Review your results instead.",
      sessionId: completedSession.id,
    });
    return;
  }

  // Resume an in-progress session if it exists
  const inProgressSession = existingSessions.find(s => s.status === "in_progress");
  if (inProgressSession) {
    const detail = await buildSessionDetail(inProgressSession.id, false);
    res.status(200).json({ ...detail, feedback: null });
    return;
  }

  // Load all questions of the specified type for this subject+grade
  const conditions = [
    eq(questionsTable.subjectId, subjectId),
    eq(questionsTable.grade, grade),
  ];
  if (rawType != null) {
    conditions.push(eq(questionsTable.questionType, rawType));
  }

  const allQuestions = await db
    .select()
    .from(questionsTable)
    .where(and(...conditions));

  if (allQuestions.length === 0) {
    res.status(400).json({ error: "No questions available for this question type" });
    return;
  }

  const [session] = await db.insert(quizSessionsTable).values({
    studentId,
    subjectId,
    grade,
    questionType: rawType,
    status: "in_progress",
    totalQuestions: allQuestions.length,
  }).returning();

  await db.insert(sessionAnswersTable).values(
    allQuestions.map((q, idx) => ({
      sessionId: session.id,
      questionId: q.id,
      orderIndex: idx,
    }))
  );

  const detail = await buildSessionDetail(session.id, false);
  res.status(201).json({ ...detail, feedback: null });
});

router.get("/sessions/:id", async (req, res): Promise<void> => {
  const params = GetSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const detail = await buildSessionDetail(params.data.id, false);
  if (!detail) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  res.json({ ...detail, feedback: null });
});

router.post("/sessions/:id/submit", async (req, res): Promise<void> => {
  const params = SubmitSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = SubmitSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { answers, timeTaken } = parsed.data;
  const sessionId = params.data.id;

  const existingAnswers = await db
    .select({ id: sessionAnswersTable.id, questionId: sessionAnswersTable.questionId })
    .from(sessionAnswersTable)
    .where(eq(sessionAnswersTable.sessionId, sessionId));

  const questionIds = existingAnswers.map((a) => a.questionId);
  const questions = await db
    .select({ id: questionsTable.id, correctOption: questionsTable.correctOption })
    .from(questionsTable)
    .where(inArray(questionsTable.id, questionIds));

  const correctMap = new Map(questions.map((q) => [q.id, q.correctOption]));

  let correctCount = 0;
  for (const ans of answers) {
    const correct = correctMap.get(ans.questionId);
    const isCorrect = correct === ans.selectedOption;
    if (isCorrect) correctCount++;

    const ansRow = existingAnswers.find((a) => a.questionId === ans.questionId);
    if (ansRow) {
      await db
        .update(sessionAnswersTable)
        .set({ selectedOption: ans.selectedOption, isCorrect })
        .where(eq(sessionAnswersTable.id, ansRow.id));
    }
  }

  const totalQ = existingAnswers.length;
  const score = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 0;

  await db.update(quizSessionsTable).set({
    status: "completed",
    score,
    correctAnswers: correctCount,
    timeTaken: timeTaken ?? null,
    completedAt: new Date(),
  }).where(eq(quizSessionsTable.id, sessionId));

  const detail = await buildSessionDetail(sessionId, true);
  res.json({ ...detail, feedback: null });
});

export default router;
