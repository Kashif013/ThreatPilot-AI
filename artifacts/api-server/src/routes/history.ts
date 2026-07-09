import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, analysisHistoryTable } from "@workspace/db";
import {
  ListHistoryResponse,
  GetHistoryEntryParams,
  GetHistoryEntryResponse,
  DeleteHistoryEntryParams,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";

const router: IRouter = Router();

router.get("/history", requireAuth, async (req, res): Promise<void> => {
  const userId = (req as AuthedRequest).userId;
  const entries = await db
    .select()
    .from(analysisHistoryTable)
    .where(eq(analysisHistoryTable.userId, userId))
    .orderBy(desc(analysisHistoryTable.createdAt));

  res.json(ListHistoryResponse.parse(entries));
});

router.get("/history/:id", requireAuth, async (req, res): Promise<void> => {
  const params = GetHistoryEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = (req as AuthedRequest).userId;

  const [entry] = await db
    .select()
    .from(analysisHistoryTable)
    .where(
      and(
        eq(analysisHistoryTable.id, params.data.id),
        eq(analysisHistoryTable.userId, userId),
      ),
    );

  if (!entry) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }

  res.json(GetHistoryEntryResponse.parse(entry));
});

router.delete("/history/:id", requireAuth, async (req, res): Promise<void> => {
  const params = DeleteHistoryEntryParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const userId = (req as AuthedRequest).userId;

  const [entry] = await db
    .delete(analysisHistoryTable)
    .where(
      and(
        eq(analysisHistoryTable.id, params.data.id),
        eq(analysisHistoryTable.userId, userId),
      ),
    )
    .returning();

  if (!entry) {
    res.status(404).json({ error: "History entry not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
