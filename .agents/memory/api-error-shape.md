---
name: ApiError shape from customFetch
description: Correct fields to read when handling errors from generated React Query mutation/query hooks.
---

The generated API client's `ApiError` class (in `lib/api-client-react/src/custom-fetch.ts`) exposes `status`, `statusText`, `data`, `headers` directly on the error object — there is no `.response` wrapper.

**Why:** A design subagent wrote `error?.response?.status` / `error?.response?.data?.error` in onError handlers (mimicking axios-style errors), which silently never matches and falls through to a generic error message instead of the intended specific handling (e.g. detecting a 503 "AI unavailable" case).

**How to apply:** When reviewing or writing onError handlers for generated hooks, use `error.status` and `error.data` directly, not `error.response.status/data`.
