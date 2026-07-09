---
name: Orval generated hook/type names
description: How to correctly reference generated enum/type names from lib/api-client-react and lib/api-zod without guessing.
---

Orval derives exported type/enum names (e.g. `LogAnalysisResultSeverity`) from the **response schema name** referenced in the OpenAPI spec (e.g. `#/components/schemas/LogAnalysisResult` -> a field `severity` becomes `LogAnalysisResultSeverity`), not from the operationId (`AnalyzeLogsResponseSeverity` does not exist even though the operation is `analyzeLogs`).

**Why:** A design subagent guessed an operation-derived name and it failed typecheck; also guessed an internal deep-import path (`@workspace/api-client-react/src/generated/api.schemas`) instead of importing from the package root, which breaks workspace package boundaries.

**How to apply:** Before writing/reviewing frontend code that imports generated types, grep `lib/api-client-react/src/generated/api.schemas.ts` (or `api.ts`) for the exact export name, and always import from the package root `@workspace/api-client-react`, never a deep `/src/generated/...` path.
