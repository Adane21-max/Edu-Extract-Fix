import { Router, type IRouter } from "express";
import { eq, count, desc } from "drizzle-orm";
import { db, studentsTable, quizSessionsTable, questionsTable, subjectsTable } from "@workspace/db";
import { GetStudentDashboardParams, GetStudentDashboardResponse, GetAdminDashboardResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/student/:studentId", async (req, res): Promise<void> => {
  const params = GetStudentDashboardParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const { studentId } = params.data;

  const sessions = await db
    .select({
      id: quizSessionsTable.id,
      studentId: quizSessionsTable.studentId,
      subjectId: quizSessionsTable.subjectId,
      subjectName: subjectsTable.name,
      grade: quizSessionsTable.grade,
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
    .where(eq(quizSessionsTable.studentId, studentId))
    .orderBy(desc(quizSessionsTable.createdAt));

  const completedSessions = sessions.filter(s => s.status === "completed");
  const scores = completedSessions.map(s => s.score ?? 0);
  const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const subjectMap = new Map<number, { subjectId: number; subjectName: string; scores: number[]; count: number }>();
  for (const s of completedSessions) {
    if (!subjectMap.has(s.subjectId)) {
      subjectMap.set(s.subjectId, { subjectId: s.subjectId, subjectName: s.subjectName ?? "", scores: [], count: 0 });
    }
    const entry = subjectMap.get(s.subjectId)!;
    entry.scores.push(s.score ?? 0);
    entry.count++;
  }

  const subjectPerformance = Array.from(subjectMap.values()).map(({ subjectId, subjectName, scores, count }) => ({
    subjectId,
    subjectName,
    avgScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
    totalSessions: count,
  }));

  const recentSessions = sessions.slice(0, 5).map(s => ({
    ...s,
    subjectName: s.subjectName ?? null,
    score: s.score ?? null,
    correctAnswers: s.correctAnswers ?? null,
    timeTaken: s.timeTaken ?? null,
    completedAt: s.completedAt ? s.completedAt.toISOString() : null,
  }));

  const improvementTrend = completedSessions.slice(0, 10).reverse().map(s => s.score ?? 0);

  res.json(GetStudentDashboardResponse.parse({
    studentId,
    totalSessions: sessions.length,
    avgScore: Math.round(avgScore * 10) / 10,
    highestScore,
    recentSessions,
    subjectPerformance,
    improvementTrend,
  }));
});

router.get("/dashboard/admin", async (_req, res): Promise<void> => {
  const [studentStats] = await db.select({ total: count() }).from(studentsTable);
  const [pendingStats] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.status, "pending"));
  const [approvedStats] = await db.select({ count: count() }).from(studentsTable).where(eq(studentsTable.status, "approved"));
  const [questionStats] = await db.select({ count: count() }).from(questionsTable);

  const allSessions = await db.select({ score: quizSessionsTable.score }).from(quizSessionsTable).where(eq(quizSessionsTable.status, "completed"));
  const totalSessions = allSessions.length;
  const scores = allSessions.map(s => s.score ?? 0);
  const avgPlatformScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  const recentStudents = await db
    .select()
    .from(studentsTable)
    .orderBy(desc(studentsTable.createdAt))
    .limit(5);

  const subjects = await db.select().from(subjectsTable);
  const subjectBreakdown = await Promise.all(
    subjects.map(async (s) => {
      const sessions = await db
        .select({ score: quizSessionsTable.score })
        .from(quizSessionsTable)
        .where(eq(quizSessionsTable.subjectId, s.id));
      const sScores = sessions.filter(x => x.score != null).map(x => x.score!);
      return {
        subjectId: s.id,
        subjectName: s.name,
        avgScore: sScores.length > 0 ? sScores.reduce((a, b) => a + b, 0) / sScores.length : 0,
        totalSessions: sessions.length,
      };
    })
  );

  const safeRecent = recentStudents.map(({ passwordHash: _, ...s }) => ({
    ...s,
    subscriptionPrice: s.subscriptionPrice ?? null,
    telebirrReceipt: s.telebirrReceipt ?? null,
  }));

  res.json(GetAdminDashboardResponse.parse({
    totalStudents: Number(studentStats?.total ?? 0),
    pendingApprovals: Number(pendingStats?.count ?? 0),
    approvedStudents: Number(approvedStats?.count ?? 0),
    totalQuestions: Number(questionStats?.count ?? 0),
    totalSessions,
    avgPlatformScore: Math.round(avgPlatformScore * 10) / 10,
    recentStudents: safeRecent,
    subjectBreakdown,
  }));
});

export default router;
