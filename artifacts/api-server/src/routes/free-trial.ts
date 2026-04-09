import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

interface FreeTrialQuestion {
  id: number;
  question: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctAnswer: string;
  explanation: string;
  createdAt: string;
}

interface FreeTrialRow {
  id: number;
  question: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation: string;
  created_at: string;
}

function toFrontend(r: FreeTrialRow): FreeTrialQuestion {
  return {
    id: r.id,
    question: r.question,
    optionA: r.option_a,
    optionB: r.option_b,
    optionC: r.option_c,
    optionD: r.option_d,
    correctAnswer: r.correct_answer,
    explanation: r.explanation,
    createdAt: r.created_at,
  };
}

router.get("/free-trial-questions", async (_req, res): Promise<void> => {
  const rows = await db.execute(sql`SELECT * FROM free_trial_questions ORDER BY created_at ASC`);
  res.json((rows.rows as FreeTrialRow[]).map(toFrontend));
});

router.post("/free-trial-questions", async (req, res): Promise<void> => {
  const { question, optionA, optionB, optionC, optionD, correctAnswer, explanation } = req.body as {
    question?: string; optionA?: string; optionB?: string; optionC?: string; optionD?: string;
    correctAnswer?: string; explanation?: string;
  };
  if (!question || !optionA || !optionB || !optionC || !optionD || !correctAnswer) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  const rows = await db.execute(
    sql`INSERT INTO free_trial_questions (question, option_a, option_b, option_c, option_d, correct_answer, explanation)
        VALUES (${question}, ${optionA}, ${optionB}, ${optionC}, ${optionD}, ${correctAnswer}, ${explanation ?? ""})
        RETURNING *`
  );
  res.status(201).json(toFrontend((rows.rows as FreeTrialRow[])[0]));
});

router.delete("/free-trial-questions/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.execute(sql`DELETE FROM free_trial_questions WHERE id = ${id}`);
  res.sendStatus(204);
});

export default router;
