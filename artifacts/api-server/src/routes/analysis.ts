import { randomUUID } from "crypto";
import { Router, type IRouter } from "express";
import { db, analysisHistoryTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import {
  AnalyzeLogsBody,
  AnalyzeLogsResponse,
  GenerateIncidentReportBody,
  GenerateIncidentReportResponse,
} from "@workspace/api-zod";
import { requireAuth, type AuthedRequest } from "../middlewares/requireAuth";
import { getOpenAiClient, AI_MODEL } from "../lib/openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.post("/analysis/logs", requireAuth, async (req, res): Promise<void> => {
  const parsed = AnalyzeLogsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const client = getOpenAiClient();
  if (!client) {
    res
      .status(503)
      .json({ error: "AI analysis is not configured on this server yet." });
    return;
  }

  try {
    const completion = await client.chat.completions.create({
      model: AI_MODEL,
      max_completion_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a senior SOC (Security Operations Center) analyst assistant. Analyze the raw log text provided and respond with ONLY a JSON object matching this exact shape: " +
            '{"severity":"informational|low|medium|high|critical","summary":"string","indicators":[{"type":"ipv4|ipv6|domain|url|email|md5|sha1|sha256|cve","value":"string"}],"mitreMappings":[{"tacticId":"string","tacticName":"string","techniqueId":"string","techniqueName":"string"}],"investigationSteps":["string"],"containmentRecommendations":["string"]}. ' +
            "Extract only indicators actually present in the logs. Map to real MITRE ATT&CK tactics/techniques where applicable. Be concise but specific.",
        },
        { role: "user", content: parsed.data.logText },
      ],
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty response from AI model");
    }
    const aiResult = JSON.parse(raw);

    const result = AnalyzeLogsResponse.parse({
      id: randomUUID(),
      severity: aiResult.severity,
      summary: aiResult.summary,
      indicators: aiResult.indicators ?? [],
      mitreMappings: aiResult.mitreMappings ?? [],
      investigationSteps: aiResult.investigationSteps ?? [],
      containmentRecommendations: aiResult.containmentRecommendations ?? [],
      createdAt: new Date(),
    });

    await db.insert(analysisHistoryTable).values({
      id: result.id,
      userId: (req as AuthedRequest).userId,
      type: "log_analysis",
      title: `Log analysis - ${result.severity}`,
      input: parsed.data.logText,
      result,
    });

    res.json(result);
  } catch (err) {
    req.log.error({ err }, "Log analysis failed");
    res.status(503).json({ error: "AI analysis failed. Please try again." });
  }
});

router.post(
  "/analysis/incident-report",
  requireAuth,
  async (req, res): Promise<void> => {
    const parsed = GenerateIncidentReportBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }

    const client = getOpenAiClient();
    if (!client) {
      res
        .status(503)
        .json({ error: "AI analysis is not configured on this server yet." });
      return;
    }

    try {
      let priorContext = "";
      if (parsed.data.priorAnalysisId) {
        const [entry] = await db
          .select()
          .from(analysisHistoryTable)
          .where(eq(analysisHistoryTable.id, parsed.data.priorAnalysisId));
        if (entry && entry.userId === (req as AuthedRequest).userId) {
          priorContext = `\n\nPrior log analysis context:\n${JSON.stringify(entry.result)}`;
        }
      }

      const completion = await client.chat.completions.create({
        model: AI_MODEL,
        max_completion_tokens: 8192,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are a senior incident response lead writing a formal security incident report. Respond with ONLY a JSON object matching this exact shape: " +
              '{"executiveSummary":"string","timeline":[{"timestamp":"string","description":"string"}],"indicators":[{"type":"ipv4|ipv6|domain|url|email|md5|sha1|sha256|cve","value":"string"}],"affectedAssets":["string"],"rootCause":"string","impact":"string","containment":"string","eradication":"string","recovery":"string","lessonsLearned":"string"}. ' +
              "Base the report strictly on the information given. Be specific and professional.",
          },
          {
            role: "user",
            content: `Incident title: ${parsed.data.incidentTitle}\n\nDetails:\n${parsed.data.details}${priorContext}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content;
      if (!raw) {
        throw new Error("Empty response from AI model");
      }
      const aiResult = JSON.parse(raw);

      const result = GenerateIncidentReportResponse.parse({
        id: randomUUID(),
        incidentTitle: parsed.data.incidentTitle,
        executiveSummary: aiResult.executiveSummary,
        timeline: aiResult.timeline ?? [],
        indicators: aiResult.indicators ?? [],
        affectedAssets: aiResult.affectedAssets ?? [],
        rootCause: aiResult.rootCause,
        impact: aiResult.impact,
        containment: aiResult.containment,
        eradication: aiResult.eradication,
        recovery: aiResult.recovery,
        lessonsLearned: aiResult.lessonsLearned,
        createdAt: new Date(),
      });

      await db.insert(analysisHistoryTable).values({
        id: result.id,
        userId: (req as AuthedRequest).userId,
        type: "incident_report",
        title: result.incidentTitle,
        input: parsed.data.details,
        result,
      });

      res.json(result);
    } catch (err) {
      req.log.error({ err }, "Incident report generation failed");
      res
        .status(503)
        .json({ error: "AI report generation failed. Please try again." });
    }
  },
);

export default router;
