# Parked AI code

This app is currently a **fully offline** build (web + Capacitor Android). The
server-side AI features are parked here, excluded from the TypeScript program
(see `exclude` in `tsconfig.json`), the Next.js build, and the app bundle.

Nothing under `_future/` is shipped or built — it is kept verbatim so the AI
feature can be revived later without digging through git history.

| File | Originally |
|---|---|
| `route.ts` | `app/api/ai/route.ts` — POST route (Upstash rate limiting) |
| `useAIActions.ts` | `hooks/useAIActions.ts` — client `fetch("/api/ai")` hook |
| `ai-service.ts` | `lib/ai-service.ts` — Groq-backed `performAIAction` (node:crypto) |

## Reviving AI

1. Move the three files back (`route.ts` → `app/api/ai/route.ts`, etc.) and
   remove `_future` from `exclude` in `tsconfig.json`.
2. Restore the AI UI entry points from git history before the Capacitor commit
   (they were deleted with the feature): `AIMenu`, `AskAIDialog`, the Notes
   palette commands, the Spark button, the "No AI" settings switch, the
   AI shortcuts in `hooks/useAIshortcuts.ts`, and the help-page section.
3. Reinstall the dependencies and re-create `.env.example` entries:

   ```bash
   bun add @ai-sdk/groq ai @upstash/redis @upstash/ratelimit lru-cache
   ```
