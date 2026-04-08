import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/grade-prices", async (_req, res): Promise<void> => {
  const client = await pool.connect();
  try {
    const { rows } = await client.query(
      "SELECT grade, price_etb FROM grade_prices ORDER BY grade::integer"
    );
    res.json(rows);
  } finally {
    client.release();
  }
});

router.patch("/grade-prices/:grade", async (req, res): Promise<void> => {
  const grade = req.params.grade;
  const { priceEtb } = req.body as { priceEtb?: unknown };

  if (typeof priceEtb !== "number" || !Number.isInteger(priceEtb) || priceEtb < 0) {
    res.status(400).json({ error: "priceEtb must be a non-negative integer" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(
      "INSERT INTO grade_prices (grade, price_etb, updated_at) VALUES ($1, $2, NOW()) ON CONFLICT (grade) DO UPDATE SET price_etb = $2, updated_at = NOW()",
      [grade, priceEtb]
    );
    res.json({ grade, priceEtb });
  } finally {
    client.release();
  }
});

export default router;
