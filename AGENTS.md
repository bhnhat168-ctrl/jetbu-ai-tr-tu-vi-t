<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- All AI text calls go through src/lib/brain.server.ts, which tries providers in order with auto-fallback (picked model → OpenRouter → Groq → Gemini → Lovable AI); keys come from secrets plus write-only runtime overrides from Admin Tab 5, never sent to the browser; why: one place for the 5-step/council rules and provider choice. No Supabase Edge Functions (TanStack server routes instead).
