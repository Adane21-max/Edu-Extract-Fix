import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, aiFeedbackTable, quizSessionsTable, sessionAnswersTable, questionsTable } from "@workspace/db";
import { GetFeedbackParams, GenerateFeedbackParams, GetFeedbackResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/feedback/:sessionId", async (req, res): Promise<void> => {
  const params = GetFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [feedback] = await db.select().from(aiFeedbackTable).where(eq(aiFeedbackTable.sessionId, params.data.sessionId));
  if (!feedback) {
    res.status(404).json({ error: "Feedback not found" });
    return;
  }

  res.json(GetFeedbackResponse.parse({
    id: feedback.id,
    sessionId: feedback.sessionId,
    summary: feedback.summary ?? null,
    strengths: feedback.strengths ?? null,
    weaknesses: feedback.weaknesses ?? null,
    recommendations: feedback.recommendations ?? null,
    questionFeedback: feedback.questionFeedback ?? null,
    generatedAt: feedback.generatedAt ? feedback.generatedAt.toISOString() : null,
  }));
});

router.post("/feedback/:sessionId/generate", async (req, res): Promise<void> => {
  const params = GenerateFeedbackParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sessionId = params.data.sessionId;

  try {
    const [session] = await db.select().from(quizSessionsTable).where(eq(quizSessionsTable.id, sessionId));
    if (!session) {
      res.status(404).json({ error: "Session not found" });
      return;
    }

    const answers = await db
      .select({
        questionText: questionsTable.text,
        correctOption: questionsTable.correctOption,
        explanation: questionsTable.explanation,
        selectedOption: sessionAnswersTable.selectedOption,
        isCorrect: sessionAnswersTable.isCorrect,
      })
      .from(sessionAnswersTable)
      .leftJoin(questionsTable, eq(sessionAnswersTable.questionId, questionsTable.id))
      .where(eq(sessionAnswersTable.sessionId, sessionId));

    const score = session.score ?? 0;
    const totalQ = session.totalQuestions;
    const correctCount = session.correctAnswers ?? 0;
    const wrongAnswers = answers.filter(a => !a.isCorrect);

    let feedbackData: {
      summary: string;
      strengths: string;
      weaknesses: string;
      recommendations: string;
      questionFeedback: string;
    };

    try {
      const { ai } = await import("@workspace/integrations-gemini-ai");
      const prompt = `You are an educational AI tutor for Ethiopian students. A student just completed a quiz.

Score: ${score}%
Total Questions: ${totalQ}
Correct Answers: ${correctCount}
Wrong Answers: ${wrongAnswers.length}

Wrong questions and explanations:
${wrongAnswers.slice(0, 5).map(a => `- Q: ${a.questionText}\n  Correct: ${a.correctOption}\n  Explanation: ${a.explanation}`).join("\n")}

Provide encouraging, constructive feedback in JSON format with these exact keys:
- summary: 2-3 sentences about overall performance
- strengths: what the student did well
- weaknesses: specific areas to improve
- recommendations: 2-3 specific study tips
- questionFeedback: brief comment on the questions they missed

Respond with only valid JSON, no markdown.`;

      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });

      const text = response.text ?? "";
      const cleaned = text.replace(/```json\n?|\n?```/g, "").trim();
      feedbackData = JSON.parse(cleaned);
    } catch {
      feedbackData = {
        summary: `You scored ${score}% on this quiz with ${correctCount} out of ${totalQ} questions correct.`,
        strengths: correctCount > 0 ? "You demonstrated understanding of some key concepts." : "You attempted all questions.",
        weaknesses: wrongAnswers.length > 0 ? "Review the questions you missed and their explanations." : "Continue practicing to maintain your performance.",
        recommendations: "Review the explanations for each question you missed. Practice similar questions daily.",
        questionFeedback: "Focus on understanding the reasoning behind each correct answer.",
      };
    }

    const existing = await db.select().from(aiFeedbackTable).where(eq(aiFeedbackTable.sessionId, sessionId));

    let feedback;
    if (existing.length > 0) {
      [feedback] = await db.update(aiFeedbackTable).set({
        summary: feedbackData.summary ?? null,
        strengths: feedbackData.strengths ?? null,
        weaknesses: feedbackData.weaknesses ?? null,
        recommendations: feedbackData.recommendations ?? null,
        questionFeedback: feedbackData.questionFeedback ?? null,
        generatedAt: new Date(),
      }).where(eq(aiFeedbackTable.sessionId, sessionId)).returning();
    } else {
      [feedback] = await db.insert(aiFeedbackTable).values({
        sessionId,
        summary: feedbackData.summary ?? null,
        strengths: feedbackData.strengths ?? null,
        weaknesses: feedbackData.weaknesses ?? null,
        recommendations: feedbackData.recommendations ?? null,
        questionFeedback: feedbackData.questionFeedback ?? null,
      }).returning();
    }

    res.json(GetFeedbackResponse.parse({
      id: feedback.id,
      sessionId: feedback.sessionId,
      summary: feedback.summary ?? null,
      strengths: feedback.strengths ?? null,
      weaknesses: feedback.weaknesses ?? null,
      recommendations: feedback.recommendations ?? null,
      questionFeedback: feedback.questionFeedback ?? null,
      generatedAt: feedback.generatedAt ? feedback.generatedAt.toISOString() : null,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to generate AI feedback");
    res.status(500).json({ error: "Failed to generate AI feedback" });
  }
});

export default router;
