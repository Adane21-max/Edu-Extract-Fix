import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

router.get("/announcements", async (_req, res): Promise<void> => {
  const rows = await db.execute(
    sql`SELECT id, title, content, created_at FROM announcements ORDER BY created_at DESC LIMIT 20`
  );
  res.json(
    (rows.rows as { id: number; title: string; content: string; created_at: string }[]).map((r) => ({
      id: r.id,
      title: r.title,
      content: r.content,
      createdAt: r.created_at,
    }))
  );
});

router.post("/announcements", async (req, res): Promise<void> => {
  const { title, content } = req.body as { title?: string; content?: string };
  if (!title || !content) {
    res.status(400).json({ error: "title and content are required" });
    return;
  }
  const rows = await db.execute(
    sql`INSERT INTO announcements (title, content) VALUES (${title}, ${content}) RETURNING id, title, content, created_at`
  );
  const r = rows.rows[0] as { id: number; title: string; content: string; created_at: string };
  res.status(201).json({ id: r.id, title: r.title, content: r.content, createdAt: r.created_at });
});

router.delete("/announcements/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id ?? "0");
  if (!id) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.execute(sql`DELETE FROM announcements WHERE id = ${id}`);
  res.sendStatus(204);
});

export default router;
